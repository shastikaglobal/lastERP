import React, { useState, useEffect, useMemo } from "react";
import SectionHeader from "../../components/SectionHeader";
import Card from "@/components/Card";
import {
    BarChart3,
    TrendingUp,
    Globe,
    Users,
    Repeat,
    ShieldCheck,
    Download,
    Loader2,
    FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useAuth } from "@/hooks/useAuth";

export default function RevenueAnalytics() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>({
        profiles: [],
        leads: [],
        quotations: [],
        orders: []
    });

    const fetchData = async () => {
        if (!profile?.company_id) return;
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/analytics/reports_raw?company_id=${profile.company_id}`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch raw data");
            const rawData = await res.json();

            const rawOrders = rawData.exportOrders || [];
            const cleanOrders = rawOrders;


            // Use all profiles from the database (no artificial filtering)
            setData({
                profiles: rawData.profiles || [],
                leads: rawData.leads || [],
                quotations: rawData.quotations || [],
                orders: cleanOrders
            });
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch analytics data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!profile?.company_id) return;
        fetchData();
    }, []);

    // Strictly use ONLY actual Export Orders for generating revenue. No fallbacks.
    const normalizedRevenue = useMemo(() => {
        return (data.orders || []).map((o: any) => {
            const leadMatch = data.leads.find((l: any) => l.company_name?.toLowerCase().trim() === o.customer_name?.toLowerCase().trim());
            return {
                id: o.id,
                customer: o.customer_name || "Unknown",
                country: o.customer_country || leadMatch?.country || "Unknown",
                amount: Number(o.total_amount) || 0,
                bdeId: leadMatch?.assigned_to || "Unassigned"
            };
        });
    }, [data]);


    // 1. BDE-wise Revenue Report
    const bdeRevenueData = useMemo(() => {
        const bdeProfiles = data.profiles.filter((p: any) => {
            // Include any profile that is assigned to at least one lead (dynamic BDE detection)
            const name = (p.full_name || "").toLowerCase().trim();
            return name && data.leads.some((l: any) => {
                const assignee = (l.assigned_to || "").toLowerCase().trim();
                return assignee === name || assignee === p.id;
            });
        });

        const map: Record<string, number> = {};

        // Initialize all relevant BDEs with 0 revenue
        bdeProfiles.forEach((bde: any) => {
            map[bde.id] = 0;
        });

        normalizedRevenue.forEach((item: any) => {
            if (item.bdeId !== "Unassigned") {
                const matchedBde = bdeProfiles.find((p: any) => {
                    const profileName = (p.full_name || "").toLowerCase().trim();
                    const bdeVal = String(item.bdeId).toLowerCase().trim();
                    return p.id === bdeVal || profileName === bdeVal || profileName.includes(bdeVal) || bdeVal.includes(profileName);
                });
                if (matchedBde) {
                    map[matchedBde.id] += item.amount;
                }
            }
        });

        return Object.entries(map).map(([bdeId, rev]) => {
            const bde = bdeProfiles.find((p: any) => p.id === bdeId);
            return {
                "BDE Name": bde?.full_name || "Unknown Internal (BDE Not Verified)",
                "Total Revenue": rev
            };
        }).filter(item => item["Total Revenue"] > 0).sort((a, b) => b["Total Revenue"] - a["Total Revenue"]);
    }, [normalizedRevenue, data.profiles]);

    // 2. Country-wise Sales Report
    const countrySalesData = useMemo(() => {
        const map: Record<string, number> = {};
        normalizedRevenue.forEach((item: any) => {
            map[item.country] = (map[item.country] || 0) + item.amount;
        });

        return Object.entries(map)
            .filter(([_, rev]) => rev > 0)
            .map(([country, rev]) => ({
                "Country": country,
                "Total Sales": rev
            })).sort((a, b) => b["Total Sales"] - a["Total Sales"]);
    }, [normalizedRevenue]);

    // 3. Top Clients Report
    const topClientsData = useMemo(() => {
        const map: Record<string, number> = {};
        normalizedRevenue.forEach((item: any) => {
            map[item.customer] = (map[item.customer] || 0) + item.amount;
        });

        return Object.entries(map)
            .filter(([_, rev]) => rev > 0)
            .map(([client, rev]) => ({
                "Client Name": client,
                "Total Value": rev
            })).sort((a, b) => b["Total Value"] - a["Total Value"]).slice(0, 50);
    }, [normalizedRevenue]);

    // 4. Repeat Business Report
    const repeatBusinessData = useMemo(() => {
        const clientCount: Record<string, number> = {};
        normalizedRevenue.forEach((item: any) => {
            clientCount[item.customer] = (clientCount[item.customer] || 0) + 1;
        });

        return Object.entries(clientCount)
            .filter(([_, count]) => count > 1)
            .map(([client, count]) => ({
                "Client Name": client,
                "Total Transactions": count
            })).sort((a, b) => b["Total Transactions"] - a["Total Transactions"]);
    }, [normalizedRevenue]);

    // 5. Client Retention Analysis
    const clientRetentionData = useMemo(() => {
        const uniqueClients = new Set(normalizedRevenue.map((n: any) => n.customer).filter(c => c && c !== "Unknown"));
        const repeatClients = repeatBusinessData.length;
        const total = uniqueClients.size;
        const rate = total > 0 ? ((repeatClients / total) * 100).toFixed(2) : "0.00";

        if (total === 0) return [];

        return [{
            "Total Unique Transacting Clients": total,
            "Retained Clients": repeatClients,
            "Retention Rate (%)": `${rate}%`
        }];
    }, [normalizedRevenue, repeatBusinessData]);

    // 6. Monthly Client Acquisition Report - Only count leads that have actual orders
    const monthlyAcquisitionData = useMemo(() => {
        const monthsMap: Record<string, number> = {};

        // Only count leads that have corresponding export orders
        const customerNamesWithOrders = new Set(normalizedRevenue.map((n: any) => n.customer?.toLowerCase()));

        const acquiredLeads = data.leads.filter((l: any) => {
            // Only include leads that actually have orders placed
            const hasOrder = l.company_name && [...customerNamesWithOrders].some(name =>
                name && (l.company_name.toLowerCase().trim() === name || l.company_name.toLowerCase().trim().includes(name) || name.includes(l.company_name.toLowerCase().trim()))
            );
            return hasOrder && ['won', 'converted', 'customer', 'client successfully acquired', 'client'].some(keyword =>
                l.stage?.toLowerCase()?.trim()?.includes(keyword)
            );
        });

        acquiredLeads.forEach((lead: any) => {
            if (lead.created_at) {
                const month = format(parseISO(lead.created_at), "MMM yyyy");
                monthsMap[month] = (monthsMap[month] || 0) + 1;
            }
        });

        return Object.entries(monthsMap).map(([month, count]) => ({
            "Month": month,
            "New Clients Acquired": count
        })).sort((a, b) => new Date(b.Month).getTime() - new Date(a.Month).getTime());
    }, [data.leads, normalizedRevenue]);

    // Exporter Helper
    const handleExport = (reportData: any[], filename: string) => {
        if (!reportData || reportData.length === 0) {
            toast.error("No data available to export for this report");
            return;
        }

        const normalizedRows = reportData.map((row: any) =>
            Object.fromEntries(
                Object.entries(row).map(([key, value]) => [key, value === undefined || value === null ? "" : value])
            )
        );

        const headers = Object.keys(normalizedRows[0] || {});
        const ws = XLSX.utils.json_to_sheet(normalizedRows, { header: headers, skipHeader: false });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, `${filename}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
        toast.success(`${filename} exported successfully!`);
    };

    const ReportCard = ({ title, icon: Icon, desc, data, filename }: any) => (
        <Card className="p-6 bg-gradient-to-br from-neutral-900/40 to-black border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Icon className="h-24 w-24 text-[#c8a84b]" />
            </div>
            <div className="relative z-10">
                <div className="h-12 w-12 rounded-xl bg-[#c8a84b]/10 flex items-center justify-center mb-4 border border-[#c8a84b]/20">
                    <Icon className="h-6 w-6 text-[#c8a84b]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 tracking-wide uppercase">{title}</h3>
                <p className="text-xs text-muted-foreground font-medium mb-6 uppercase tracking-wider">{desc}</p>

                <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase font-black tracking-widest text-[#c8a84b]">
                        {data.length} {data.length === 1 && title.includes('Retention') ? 'Metric' : 'Records'} Found
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-[#c8a84b]/30 text-[#c8a84b] hover:bg-[#c8a84b] hover:text-black transition-colors"
                        onClick={() => handleExport(data, filename)}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export Excel
                    </Button>
                </div>
            </div>
        </Card>
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="relative">
                    <Loader2 className="h-14 w-14 animate-spin text-[#c8a84b] opacity-20" />
                    <Loader2 className="h-14 w-14 animate-spin text-[#c8a84b] absolute top-0 left-0" style={{ animationDirection: 'reverse', animationDuration: '3s', opacity: 0.5 }} />
                </div>
                <p className="text-sm font-bold text-white tracking-widest uppercase">Fetching Original Data Tables...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-10 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <SectionHeader
                    title="Revenue & Performance Analytics"
                    sub="Export fully structured, ready-to-present analytics reports directly from your ERP database."
                />
                <Button
                    className="bg-black/40 border border-white/10 hover:bg-white/5"
                    onClick={fetchData}
                >
                    <TrendingUp className="h-4 w-4 mr-2 text-[#c8a84b]" /> Reload Live Data
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ReportCard
                    title="BDE-wise Revenue Report"
                    desc="Breakdown of total revenue generated segregated by individual Business Associates"
                    icon={Users}
                    data={bdeRevenueData}
                    filename="BDE_Wise_Revenue"
                />

                <ReportCard
                    title="Country-wise Sales Report"
                    desc="Geographic distribution of your sales volume and revenue performance"
                    icon={Globe}
                    data={countrySalesData}
                    filename="Country_Wise_Sales"
                />

                <ReportCard
                    title="Top Clients Report"
                    desc="Ranking of your highest value clients based on total purchase volume"
                    icon={BarChart3}
                    data={topClientsData}
                    filename="Top_Clients_Report"
                />

                <ReportCard
                    title="Repeat Business Report"
                    desc="List of clients who have placed multiple orders, indicating loyalty"
                    icon={Repeat}
                    data={repeatBusinessData}
                    filename="Repeat_Business_Report"
                />

                <ReportCard
                    title="Client Retention Analysis"
                    desc="High-level metrics calculating the percentage of successfully retained clients"
                    icon={ShieldCheck}
                    data={clientRetentionData}
                    filename="Client_Retention_Analysis"
                />

                <ReportCard
                    title="Monthly Client Acquisition"
                    desc="Timeline reflecting how many new paying clients were onboarded each month"
                    icon={FileSpreadsheet}
                    data={monthlyAcquisitionData}
                    filename="Monthly_Acquisition_Report"
                />
            </div>
        </div>
    );
}