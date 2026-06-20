import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import Card from "@/components/Card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
    Boxes, PackageCheck, ClipboardList, Send,
    AlertTriangle, Container, Activity, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function WarehouseDashboard() {
    const [loading, setLoading] = useState(false);

    // Fetch inventory data - OPTIMIZED: only count & sums, no full fetch
    const { data: inventoryData, isLoading: inventoryLoading, refetch: refetchInventory } = useQuery({
        queryKey: ["warehouse-inventory"],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = {};
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
            const res = await fetch('/api/inventory/inventory_batches', { headers });
            if (!res.ok) throw new Error('Failed to fetch inventory');
            const data = await res.json();
            return data || [];
        },
        staleTime: 30000, // Cache for 30 seconds
        gcTime: 5 * 60 * 1000, // Keep in memory for 5 min
    });

    // Fetch low stock alerts - OPTIMIZED with cache
    const { data: lowStockData, isLoading: lowStockLoading, refetch: refetchLowStock } = useQuery({
        queryKey: ["low-stock-alerts"],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = {};
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
            const res = await fetch('/api/inventory/available_stock', { headers });
            if (!res.ok) throw new Error('Failed to fetch available stock');
            const data = await res.json();
            const lowStock = (data || []).filter((item: any) => 
                parseFloat(item.available_quantity || 0) < parseFloat(item.minimum_level || 0)
            );
            return lowStock.map((item: any) => ({
                id: item.id,
                name: item.product_name,
                current_stock: parseFloat(item.available_quantity || 0),
                minimum_stock: parseFloat(item.minimum_level || 0)
            }));
        },
        staleTime: 30000,
        gcTime: 5 * 60 * 1000,
    });

    // Fetch shipments - OPTIMIZED: reduced limit, added cache
    const { data: shipmentsData, isLoading: shipmentsLoading, refetch: refetchShipments } = useQuery({
        queryKey: ["shipments-today"],
        queryFn: async () => {
            const today = new Date().toISOString().split('T')[0];
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = {};
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
            const res = await fetch('/api/finance/export_shipments', { headers });
            if (!res.ok) throw new Error('Failed to fetch shipments');
            const data = await res.json();
            return (data || []).filter((s: any) => {
                const createdDate = s.created_at ? s.created_at.split('T')[0] : '';
                return createdDate === today;
            });
        },
        staleTime: 15000,
        gcTime: 5 * 60 * 1000,
    });

    // Fetch activity logs - OPTIMIZED: already limited to 5
    const { data: activityLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
        queryKey: ["warehouse-activities"],
        queryFn: async () => {
            const today = new Date().toISOString().split('T')[0];
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = {};
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
            const res = await fetch('/api/analytics/activity_logs', { headers });
            if (!res.ok) throw new Error('Failed to fetch activity logs');
            const data = await res.json();
            return (data || []).filter((log: any) => {
                const createdDate = log.created_at ? log.created_at.split('T')[0] : '';
                return createdDate === today;
            });
        },
        staleTime: 10000,
        gcTime: 5 * 60 * 1000,
    });

    // Fetch packing protocols
    const { data: packingData, isLoading: packingLoading, refetch: refetchPacking } = useQuery({
        queryKey: ["warehouse-packing"],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = {};
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
            const res = await fetch('/api/warehouse/packing_protocols', { headers });
            if (!res.ok) throw new Error('Failed to fetch packing protocols');
            return await res.json() || [];
        },
        staleTime: 30000,
        gcTime: 5 * 60 * 1000,
    });

    // Calculate metrics from real data
    const totalInventory = inventoryData?.reduce((sum, item) => sum + (parseFloat(item.quantity_remaining_kg) || 0), 0) || 0;
    const exportReadyStock = inventoryData?.filter(item => item.status === 'export_ready').reduce((sum, item) => sum + (parseFloat(item.quantity_remaining_kg) || 0), 0) || 0;
    const pendingPacking = packingData?.filter((item: any) => item.status === 'draft' || item.status === 'in_progress').length || 0;
    const lowStockCount = lowStockData?.length || 0;
    const dispatchedToday = shipmentsData?.filter((s: any) => s.status === 'dispatched' || String(s.status).toLowerCase() === 'dispatched').length || 0;
    const containerLoading = shipmentsData?.filter((s: any) => s.status === 'loading' || String(s.status).toLowerCase() === 'loading').length || 0;
    const activityCount = activityLogs?.length || 0;

    const handleSync = async () => {
        setLoading(true);
        try {
            await Promise.all([
                refetchInventory(),
                refetchLowStock(),
                refetchShipments(),
                refetchLogs(),
                refetchPacking()
            ]);
            toast.success("Warehouse data synced!");
        } catch (error) {
            toast.error("Failed to sync warehouse data");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center">
                <PageHeader
                    title="Warehouse Operations Dashboard"
                    description="Live overview of stock, packing, and dispatch activities"
                    breadcrumbs={[{ label: "Warehouse" }, { label: "Dashboard" }]}
                />
                <Button className="btn-gold hidden sm:flex" onClick={handleSync} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
                    {loading ? "Syncing..." : "Live Sync"}
                </Button>
            </div>

            {/* Dashboard Overview Section - STAGGERED LOADING: Show cards as ready */}
            <div className="bg-card/40 backdrop-blur-md border border-border rounded-xl p-6">
                <h2 className="text-lg font-bold text-foreground mb-6">Dashboard Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Current Inventory Status */}
                    {inventoryLoading ? (
                        <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5 animate-pulse">
                            <div className="h-12 bg-blue-500/20 rounded"></div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/5 hover:border-blue-500/40 transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-blue-200">Current Inventory Status</h3>
                                <Boxes className="h-5 w-5 text-blue-400" />
                            </div>
                            <p className="text-2xl font-bold text-blue-300">{(totalInventory || 0).toLocaleString()} Kg</p>
                            <p className="text-xs text-blue-300/60 mt-2">Total across all zones</p>
                        </div>
                    )}

                    {/* Export Ready Stock */}
                    {inventoryLoading ? (
                        <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 animate-pulse">
                            <div className="h-12 bg-emerald-500/20 rounded"></div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-emerald-200">Export Ready Stock</h3>
                                <PackageCheck className="h-5 w-5 text-emerald-400" />
                            </div>
                            <p className="text-2xl font-bold text-emerald-300">{(exportReadyStock || 0).toLocaleString()} Kg</p>
                            <p className="text-xs text-emerald-300/60 mt-2">QC cleared & packed</p>
                        </div>
                    )}

                    {/* Pending Packing Orders */}
                    {inventoryLoading ? (
                        <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 animate-pulse">
                            <div className="h-12 bg-amber-500/20 rounded"></div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-amber-200">Pending Packing Orders</h3>
                                <ClipboardList className="h-5 w-5 text-amber-400" />
                            </div>
                            <p className="text-2xl font-bold text-amber-300">{pendingPacking} Orders</p>
                            <p className="text-xs text-amber-300/60 mt-2">Awaiting processing</p>
                        </div>
                    )}

                    {/* Shipment Dispatch Status */}
                    {shipmentsLoading ? (
                        <div className="p-4 rounded-lg border border-purple-500/20 bg-purple-500/5 animate-pulse">
                            <div className="h-12 bg-purple-500/20 rounded"></div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-lg border border-purple-500/20 bg-purple-500/5 hover:border-purple-500/40 transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-purple-200">Shipment Dispatch Status</h3>
                                <Send className="h-5 w-5 text-purple-400" />
                            </div>
                            <p className="text-2xl font-bold text-purple-300">{dispatchedToday} Dispatched</p>
                            <p className="text-xs text-purple-300/60 mt-2">Left warehouse today</p>
                        </div>
                    )}

                    {/* Low Stock Alerts */}
                    {lowStockLoading ? (
                        <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5 animate-pulse">
                            <div className="h-12 bg-red-500/20 rounded"></div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5 hover:border-red-500/40 transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-red-200">Low Stock Alerts</h3>
                                <AlertTriangle className="h-5 w-5 text-red-400" />
                            </div>
                            <p className="text-2xl font-bold text-red-300">{lowStockCount} Critical</p>
                            <p className="text-xs text-red-300/60 mt-2">Needs replenishment</p>
                        </div>
                    )}

                    {/* Container Loading Updates */}
                    {shipmentsLoading ? (
                        <div className="p-4 rounded-lg border border-[#c8a84b]/20 bg-[#c8a84b]/5 animate-pulse">
                            <div className="h-12 bg-[#c8a84b]/20 rounded"></div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-lg border border-[#c8a84b]/20 bg-[#c8a84b]/5 hover:border-[#c8a84b]/40 transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-[#c8a84b]">Container Loading Updates</h3>
                                <Container className="h-5 w-5 text-[#c8a84b]" />
                            </div>
                            <p className="text-2xl font-bold text-[#d4b959]">{containerLoading} Active</p>
                            <p className="text-xs text-[#c8a84b]/60 mt-2">Live loading in progress</p>
                        </div>
                    )}

                    {/* Daily Warehouse Activities */}
                    {logsLoading ? (
                        <div className="p-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 animate-pulse">
                            <div className="h-12 bg-indigo-500/20 rounded"></div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 hover:border-indigo-500/40 transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-indigo-200">Daily Warehouse Activities</h3>
                                <Activity className="h-5 w-5 text-indigo-400" />
                            </div>
                            <p className="text-2xl font-bold text-indigo-300">{activityCount} Logs</p>
                            <p className="text-xs text-indigo-300/60 mt-2">Today's transactions</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column - Large Sections */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Container Loading Updates */}
                    <Card className="flex flex-col h-full bg-card/60 backdrop-blur-md border-border overflow-hidden">
                        <div className="p-5 border-b border-border flex justify-between items-center bg-black/20">
                            <div className="flex items-center gap-2">
                                <Container className="h-5 w-5 text-[#c8a84b]" />
                                <h3 className="font-bold text-foreground tracking-wide">Container Loading Updates</h3>
                            </div>
                            <span className="text-[10px] font-black uppercase text-muted-foreground bg-white/5 px-2 py-1 rounded">Live Feed</span>
                        </div>
                        <div className="p-5 flex-1">
                            {shipmentsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : shipmentsData && shipmentsData.length > 0 ? (
                                <div className="space-y-4">
                                    {shipmentsData.slice(0, 3).map((shipment: any, i: number) => (
                                        <div key={i} className="flex flex-col gap-2 p-4 rounded-xl border border-white/5 bg-white/5">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <span className="font-bold text-sm text-foreground">{shipment.shipment_number || 'Unnamed Shipment'}</span>
                                                    <span className="text-xs text-muted-foreground ml-2">to {shipment.destination_port || 'Unknown Destination'}</span>
                                                </div>
                                                <span className="text-xs font-semibold text-white/80 capitalize">{shipment.status || 'Processing'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-8">
                                    <p className="text-xs text-muted-foreground">No shipments today</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Daily Warehouse Activities */}
                    <Card className="bg-card/60 backdrop-blur-md border-border flex flex-col">
                        <div className="p-5 border-b border-border flex items-center gap-2 bg-black/20">
                            <Activity className="h-5 w-5 text-indigo-400" />
                            <h3 className="font-bold text-foreground tracking-wide">Daily Warehouse Activities</h3>
                        </div>
                        <div className="p-0">
                            {logsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : activityLogs && activityLogs.length > 0 ? (
                                <div className="divide-y divide-white/5">
                                    {activityLogs.map((log: any, i: number) => (
                                        <div key={i} className="p-4 flex gap-4 hover:bg-white/5 transition-colors items-start">
                                            <div className="text-[10px] font-mono text-muted-foreground whitespace-nowrap pt-0.5">
                                                {log.created_at ? new Date(log.created_at).toLocaleTimeString() : '—'}
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-white mb-0.5 block">{log.user_name || log.actor_name || log.user_id || 'System'}</span>
                                                <span className="text-sm text-muted-foreground">{log.description || log.action || '—'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 text-center text-xs text-muted-foreground">No activities today</div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Low Stock Alerts */}
                    <Card className="bg-card/60 backdrop-blur-md border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)] overflow-hidden">
                        <div className="p-5 border-b border-red-500/10 flex justify-between items-center bg-red-500/5">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-400 animate-pulse" />
                                <h3 className="font-bold text-red-500 tracking-wide">Low Stock Alerts</h3>
                            </div>
                            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{lowStockCount} Critical</span>
                        </div>
                        <div className="p-4 space-y-3">
                            {lowStockLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-red-400" />
                                </div>
                            ) : lowStockData && lowStockData.length > 0 ? (
                                <>
                                    {lowStockData.slice(0, 5).map((alert: any, i: number) => (
                                        <div key={i} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                            <div className="font-bold text-sm text-red-200">{alert.name}</div>
                                            <div className="flex justify-between mt-2 text-xs">
                                                <span className="text-red-400">Current: {(alert.current_stock || 0).toLocaleString()} units</span>
                                                <span className="text-red-400/60 font-mono">Min: {(alert.minimum_stock || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {lowStockData.length > 5 && (
                                        <div className="p-2 text-center text-xs text-red-300">
                                            +{lowStockData.length - 5} more
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="p-4 text-center text-xs text-muted-foreground">No low stock alerts</div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
