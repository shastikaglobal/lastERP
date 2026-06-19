import { useState, useMemo, useEffect } from "react";
import SectionHeader from "../../components/SectionHeader";
import {
  DollarSign,
  TrendingUp,
  Download,
  Loader2,
  Calendar as CalendarIcon,
  Award,
  Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, differenceInMinutes } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsAdminOrManager } from "@/hooks/useAuth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  endOfDay,
  isWithinInterval,
  parseISO
} from "date-fns";

export default function Performance() {
  const { profile: currentUser, roleSlugs } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [targetValue, setTargetValue] = useState<string>("");
  const [data, setData] = useState<{
    profiles: any[];
    leads: any[];
    activities: any[];
    followUps: any[];
    quotations: any[];
    dailyReports: any[];
    exportOrders: any[];
  } | null>(null);

  // Filters (Default to 'All Time' so past leads are counted)
  const [startDate, setStartDate] = useState<Date>(new Date(2020, 0, 1));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedBDE, setSelectedBDE] = useState<string>("all");
  const [timeframe, setTimeframe] = useState<"daily" | "monthly" | "yearly" | "custom">("monthly");

  const isAdminOrManager = useIsAdminOrManager();

  const fetchData = async () => {
    if (!currentUser?.company_id) return;
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/analytics/reports_raw?company_id=${currentUser.company_id}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch performance data");
      const rawData = await res.json();

      // Enriched profiles mapped similarly
      const enrichedProfiles = (rawData.profiles || [])
        .filter((p: any) => {
          const name = (p.full_name || "").toLowerCase();
          return name.includes("gayathri") || name.includes("vemula");
        })
        .map((p: any) => {
          return {
            ...p,
            role_name: p.role || "Employee"
          };
        });

      setData({
        profiles: enrichedProfiles,
        leads: rawData.leads || [],
        activities: rawData.activities || [],
        followUps: rawData.followUps || [],
        quotations: rawData.quotations || [],
        dailyReports: rawData.dailyReports || [],
        exportOrders: rawData.exportOrders || []
      });
    } catch (error: any) {
      toast.error("Failed to load performance data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser?.company_id) return;
    fetchData();
  }, []);

  const performanceStats = useMemo(() => {
    if (!data) return [];

    const { profiles, leads, activities, followUps, quotations, dailyReports } = data;

    const isEmployeeMatch = (dbValue: any, employee: any) => {
      if (!dbValue || !employee) return false;
      const val = String(dbValue).trim().toLowerCase();
      const empId = String(employee.id).trim().toLowerCase();
      const empName = employee.full_name ? String(employee.full_name).trim().toLowerCase() : null;

      if (val === empId) return true;
      if (empName && (val === empName || val.includes(empName) || empName.includes(val))) return true;

      // Fallback for first names (e.g if DB just says "gayathri" but profile says "Gayathri S")
      if (empName) {
        const firstName = empName.split(' ')[0];
        if (firstName && val.includes(firstName)) return true;
      }

      return false;
    };

    const isInDateRange = (dateStr: string) => {
      if (!dateStr) return false;
      try {
        // Pad the end date to the end of the day or far future to ensure timezone gaps don't artificially filter out recent metrics
        const d = parseISO(dateStr);
        const latestPossibleEnd = new Date(endDate);
        latestPossibleEnd.setHours(23, 59, 59, 999);
        return isWithinInterval(d, { start: startDate, end: latestPossibleEnd });
      } catch (e) {
        return false;
      }
    };

    const stats = profiles
      .filter(p => (p.role_name || "").toLowerCase().trim() === "bde")
      .map(employee => {
        if (selectedBDE !== 'all' && employee.id !== selectedBDE) return null;

        const employeeLeads = leads.filter(l =>
          isEmployeeMatch(l.assigned_to, employee) &&
          isInDateRange(l.created_at)
        );
        const employeeLeadIds = new Set(employeeLeads.map(l => l.id));

        const employeeQuotes = quotations.filter(q =>
          (isEmployeeMatch(q.created_by, employee) || (q.lead_id && employeeLeadIds.has(q.lead_id))) &&
          isInDateRange(q.created_at)
        );

        const employeeActivities = activities.filter(a =>
          (isEmployeeMatch(a.created_by, employee) || (a.lead_id && employeeLeadIds.has(a.lead_id))) &&
          isInDateRange(a.created_at)
        );

        const employeeFollowUps = followUps.filter(f =>
          isEmployeeMatch(f.assigned_to, employee) && f.is_notified &&
          isInDateRange(f.created_at)
        );
        const employeeDailyReports = dailyReports.filter(dr =>
          isEmployeeMatch(dr.bde_id, employee) &&
          isInDateRange(dr.report_date)
        );

        const responseTimes: number[] = [];
        const leadsProcessedByEmp = new Set(employeeActivities.filter(a => a.lead_id).map(a => a.lead_id));

        leadsProcessedByEmp.forEach(leadId => {
          const lead = leads.find(l => l.id === leadId);
          if (lead && lead.created_at) {
            const empLeadActivities = employeeActivities.filter(a => a.lead_id === leadId);
            const firstActivity = [...empLeadActivities].sort((a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )[0];

            if (firstActivity) {
              const diff = differenceInMinutes(new Date(firstActivity.created_at), new Date(lead.created_at));
              if (diff >= 0) responseTimes.push(diff);
            }
          }
        });

        const avgMinutes = responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0;

        const formatResponseTime = (mins: number) => {
          if (mins === 0) return "N/A";
          const h = Math.floor(mins / 60);
          const m = Math.round(mins % 60);
          return h > 0 ? `${h}h ${m}m` : `${m}m`;
        };

        const leadsHandled = employeeLeads.length;

        // Aggregate calls from both activities AND daily reports
        const individualCalls = employeeActivities.filter(a =>
          ['call', 'phone'].includes(a.type?.toLowerCase()?.trim())
        ).length;
        const reportedCalls = employeeDailyReports.reduce((sum, dr) => sum + (Number(dr.total_calls) || 0), 0);
        const callsMade = Math.max(individualCalls, reportedCalls);

        // Aggregate follow-ups from both types
        const individualFollowUps = employeeFollowUps.length;
        const reportedAttended = employeeDailyReports.reduce((sum, dr) => sum + (Number(dr.calls_attended) || 0), 0);
        const followUpsCompleted = Math.max(individualFollowUps, reportedAttended);

        // Aggregate Emails
        const individualEmails = employeeActivities.filter(a =>
          ['email'].includes(a.type?.toLowerCase()?.trim())
        ).length;
        const reportedEmails = employeeDailyReports.reduce((sum, dr) => sum + (Number(dr.emails_sent) || 0), 0);
        const emailsSent = Math.max(individualEmails, reportedEmails);

        // Aggregate LinkedIn
        const individualLinkedin = employeeActivities.filter(a =>
          ['linkedin'].includes(a.type?.toLowerCase()?.trim())
        ).length;
        const reportedLinkedin = employeeDailyReports.reduce((sum, dr) => sum + (Number(dr.linkedin_messages) || 0), 0);
        const linkedinMessages = Math.max(individualLinkedin, reportedLinkedin);

        const dealsClosed = employeeLeads.filter(l =>
          ['won', 'closed won', 'closed_won', 'won', 'Closed Won'].includes(l.stage?.toLowerCase()?.trim())
        ).length;

        // Map export orders by matching created_by to employee or customer_name to lead
        const employeeOrders = (data.exportOrders || []).filter(o => {
          if (!isInDateRange(o.order_date || o.created_at)) return false;

          // Primary match: order created by this employee
          if (isEmployeeMatch(o.created_by, employee)) return true;

          // Fallback: customer_name matches a lead company_name assigned to this employee
          const matchedLead = employeeLeads.find(l =>
            l.company_name?.toLowerCase().trim() === o.customer_name?.toLowerCase().trim()
          );
          return Boolean(matchedLead);
        });

        const revenueGenerated = employeeOrders.reduce((sum, o) =>
          sum + (Number(o.total_amount) || 0), 0
        );

        const conversionRatio = leadsHandled > 0
          ? Math.round((dealsClosed / leadsHandled) * 100)
          : 0;

        return {
          id: employee.id,
          name: employee.full_name || "Unknown",
          role,
          initials: (employee.full_name || "??")
            .split(" ")
            .map(n => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase(),
          leadsHandled,
          callsMade,
          followUpsCompleted,
          emailsSent,
          linkedinMessages,
          dealsClosed,
          revenueGenerated,
          conversionRatio,
          avgResponseTime: formatResponseTime(avgMinutes),
          monthlyTarget: Number(employee.monthly_target) || 0,
          quotationsCount: employeeQuotes.length
        };
      }).filter(Boolean);

    const maxLeads = Math.max(...stats.map(s => s.leadsHandled), 0);

    return stats.map(s => ({
      ...s,
      isTopPerformer: maxLeads > 0 && s.leadsHandled === maxLeads
    })).sort((a, b) => b.revenueGenerated - a.revenueGenerated);
  }, [data, startDate, endDate, selectedBDE]);

  const handleUpdateTarget = async (employeeId: string) => {
    const val = parseFloat(targetValue);
    if (isNaN(val)) {
      toast.error("Please enter a valid number");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ monthly_target: val })
      });

      if (!res.ok) throw new Error("Failed to update target");
      toast.success("Target updated successfully");
      setEditingTarget(null);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update target");
    }
  };

  const handleTimeframeChange = (tf: "daily" | "monthly" | "yearly") => {
    setTimeframe(tf);
    const now = new Date();
    if (tf === "daily") {
      setStartDate(startOfDay(now));
      setEndDate(endOfDay(now));
    } else if (tf === "monthly") {
      setStartDate(startOfMonth(now));
      setEndDate(endOfMonth(now));
    } else if (tf === "yearly") {
      setStartDate(startOfYear(now));
      setEndDate(endOfYear(now));
    }
  };

  const exportReport = (type: string, fileFormat: 'csv' | 'pdf' | 'excel') => {
    if (!data) return;
    const { profiles, leads, activities, followUps, quotations, exportOrders } = data;

    const getEmployeeName = (dbValue: any) => {
      if (!dbValue) return "Unknown";
      const val = String(dbValue).trim().toLowerCase();
      const matchedProfile = profiles.find(p =>
        String(p.id).toLowerCase() === val ||
        (p.full_name && String(p.full_name).trim().toLowerCase() === val)
      );
      return matchedProfile?.full_name || (dbValue.length > 20 ? "Unknown" : dbValue);
    };

    let reportData: any[] = [];
    let fileName = "";
    let title = "";

    switch (type) {
      case 'daily':
        fileName = "Daily_Activity_Report";
        title = "Daily Sales Activity Logs";
        reportData = (activities || [])
          .filter(a => {
            try { return a.created_at && isWithinInterval(parseISO(a.created_at), { start: startDate, end: endDate }); }
            catch { return false; }
          })
          .map(a => ({
            Date: format(parseISO(a.created_at), 'yyyy-MM-dd'),
            Employee: getEmployeeName(a.created_by),
            Type: a.type,
            Log: a.description || a.title || "Interaction log"
          }));
        break;

      case 'weekly':
        fileName = "Performance_Summary";
        title = "Periodic Performance Summary";
        reportData = performanceStats.map((s: any) => ({
          Employee: s.name,
          Leads: s.leadsHandled,
          Calls: s.callsMade,
          FollowUps: s.followUpsCompleted,
          Emails: s.emailsSent,
          LinkedIn: s.linkedinMessages,
          Revenue: s.revenueGenerated,
          Conversion: `${s.conversionRatio}%`
        }));
        break;

      case 'monthly':
        fileName = "Sales_Revenue_Report";
        title = "Confirmed Export Orders Audit";
        reportData = (exportOrders || [])
          .filter(q => {
            const dateStr = q.order_date || q.created_at;
            try { return dateStr && isWithinInterval(parseISO(dateStr), { start: startDate, end: endDate }); }
            catch { return false; }
          })
          .map(q => ({
            Date: format(parseISO(q.order_date || q.created_at), 'yyyy-MM-dd'),
            Employee: getEmployeeName(q.created_by) || "Mapped via Client",
            Amount: Number(q.total_amount) || Number(q.amount) || 0,
            Order_No: q.order_number || "Draft"
          }));
        break;

      case 'ranking':
        fileName = "Employee_Leaderboard";
        title = "BDE Performance Leaderboard";
        reportData = [...performanceStats]
          .sort((a, b) => b.leadsHandled - a.leadsHandled)
          .map((s: any, idx) => ({
            Rank: idx + 1,
            Employee: s.name,
            Leads: s.leadsHandled,
            Revenue: s.revenueGenerated,
            Response: s.avgResponseTime
          }));
        break;
    }

    const formatRupee = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

    const buildPdf = (title: string, rows: any[], fileName: string) => {
      const doc = new jsPDF({ unit: 'pt' });
      const headerHeight = 96;
      doc.setFontSize(18);
      doc.text("Shastika Global Impex", 40, 40);
      doc.setFontSize(14);
      doc.text(title, 40, 64);
      doc.setFontSize(10);
      doc.text(`Period: ${format(startDate, 'PP')} - ${format(endDate, 'PP')}`, 40, 84);

      const tableHeaders = [
        "BDE Name",
        "Leads",
        "Quotations",
        "Orders Won",
        "Revenue",
        "Target",
        "Achievement %"
      ];

      const tableRows = rows.map((row: any) => [
        row.name || row.Employee || "Unknown",
        String(row.leadsHandled ?? row.Leads ?? row.leads ?? 0),
        String(row.quotationsCount ?? row.Quotations ?? 0),
        String(row.dealsClosed ?? row.OrdersWon ?? row.Orders ?? 0),
        formatRupee(row.revenueGenerated ?? row.Revenue ?? row.Amount ?? 0),
        formatRupee(row.monthlyTarget ?? row.Target ?? 0),
        row.achievement || row.Achievement || row.Conversion || `${row.conversionRatio ?? 0}%`
      ]);

      if (tableRows.length === 0) {
        tableRows.push(["No data available", "", "", "", "", "", ""]);
      }

      autoTable(doc, {
        startY: headerHeight,
        head: [tableHeaders],
        body: tableRows,
        theme: 'grid',
        headStyles: {
          fillColor: [36, 36, 36],
          textColor: 255,
          fontStyle: 'bold'
        },
        bodyStyles: {
          textColor: 34,
          fontSize: 9,
          valign: 'middle'
        },
        styles: {
          cellPadding: 6,
          font: 'helvetica'
        },
        columnStyles: {
          0: { cellWidth: 110 },
          1: { cellWidth: 48 },
          2: { cellWidth: 60 },
          3: { cellWidth: 60 },
          4: { cellWidth: 80 },
          5: { cellWidth: 80 },
          6: { cellWidth: 70 }
        }
      });
      doc.save(`${fileName}.pdf`);
    };

    if (fileFormat === 'csv') {
      const csv = Papa.unparse(reportData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `${fileName}.csv`);
      link.click();
    } else if (fileFormat === 'excel') {
      const ws = XLSX.utils.json_to_sheet(reportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      XLSX.writeFile(wb, `${fileName}.xlsx`);
    } else {
      const rows = performanceStats.map((s: any) => ({
        name: s.name,
        leadsHandled: s.leadsHandled,
        quotationsCount: s.quotationsCount,
        dealsClosed: s.dealsClosed,
        revenueGenerated: s.revenueGenerated,
        monthlyTarget: s.monthlyTarget,
        achievement: s.monthlyTarget > 0 ? `${Math.round((s.revenueGenerated / s.monthlyTarget) * 100)}%` : '0%'
      }));

      buildPdf(title, rows, fileName);
    }
    toast.success(`${fileFormat.toUpperCase()} exported successfully`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-foreground pb-10">
      <SectionHeader
        title="Employee Performance Monitoring"
        sub="Measures employee productivity and sales efficiency using live database metrics."
      />

      {/* Unified Filters */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 bg-neutral-900/60 p-1 w-fit rounded-xl border border-white/5">
          <Button
            variant={timeframe === "daily" ? "default" : "ghost"}
            size="sm"
            className={cn("text-[10px] uppercase font-black px-4 h-9 rounded-lg transition-all", timeframe === "daily" ? "bg-[#c8a84b] text-black hover:bg-[#b0933d]" : "text-muted-foreground")}
            onClick={() => handleTimeframeChange("daily")}
          >
            Daily
          </Button>
          <Button
            variant={timeframe === "monthly" ? "default" : "ghost"}
            size="sm"
            className={cn("text-[10px] uppercase font-black px-4 h-9 rounded-lg transition-all", timeframe === "monthly" ? "bg-[#c8a84b] text-black hover:bg-[#b0933d]" : "text-muted-foreground")}
            onClick={() => handleTimeframeChange("monthly")}
          >
            Monthly
          </Button>
          <Button
            variant={timeframe === "yearly" ? "default" : "ghost"}
            size="sm"
            className={cn("text-[10px] uppercase font-black px-4 h-9 rounded-lg transition-all", timeframe === "yearly" ? "bg-[#c8a84b] text-black hover:bg-[#b0933d]" : "text-muted-foreground")}
            onClick={() => handleTimeframeChange("yearly")}
          >
            Yearly
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 bg-neutral-900/60 p-6 rounded-3xl border border-white/5 backdrop-blur-xl">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Timeframe From</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start bg-black/40 border-white/10 text-white font-mono h-11 rounded-xl">
                  {format(startDate, "MMM dd, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-neutral-900 border-white/10">
                <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Timeframe To</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start bg-black/40 border-white/10 text-white font-mono h-11 rounded-xl">
                  {format(endDate, "MMM dd, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-neutral-900 border-white/10">
                <Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-muted-foreground ml-1">BDE Associate</label>
            <Select value={selectedBDE} onValueChange={setSelectedBDE}>
              <SelectTrigger className="w-full bg-black/40 border-white/10 text-white h-11 rounded-xl">
                <SelectValue placeholder="All Associates" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-white/10">
                <SelectItem value="all">Every BDE Associate</SelectItem>
                {data?.profiles
                  .filter(p => (p.role_name || "").toLowerCase().trim() === "bde")
                  .map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant="ghost"
              className="w-full h-11 text-[10px] uppercase font-black text-muted-foreground hover:bg-white/5 rounded-xl underline"
              onClick={() => {
                setTimeframe("custom");
                setStartDate(new Date(2020, 0, 1));
                setEndDate(new Date());
                setSelectedBDE('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="mb-2">
          <h2 className="text-lg font-medium text-white tracking-wide">Recommended BDE Revenue Report Structure</h2>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-100">
            <thead>
              <tr className="border-b border-white/10 text-gray-300">
                <th scope="col" className="px-2 py-4 font-medium whitespace-nowrap">BDE Name</th>
                <th scope="col" className="px-2 py-4 font-medium whitespace-nowrap">Leads</th>
                <th scope="col" className="px-2 py-4 font-medium whitespace-nowrap">Quotations</th>
                <th scope="col" className="px-2 py-4 font-medium whitespace-nowrap">Orders Won</th>
                <th scope="col" className="px-2 py-4 font-medium whitespace-nowrap">Revenue</th>
                <th scope="col" className="px-2 py-4 font-medium whitespace-nowrap">Target</th>
                <th scope="col" className="px-2 py-4 font-medium whitespace-nowrap">Achievement %</th>
              </tr>
            </thead>
            <tbody>
              {performanceStats.map((emp: any) => {
                const achievement = emp.monthlyTarget > 0
                  ? ((emp.revenueGenerated / emp.monthlyTarget) * 100).toFixed(0) + '%'
                  : '0%';

                return (
                  <tr key={emp.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-2 py-4 font-medium text-white">{emp.name?.split(' ')[0] || emp.name}</td>
                    <td className="px-2 py-4">{emp.leadsHandled}</td>
                    <td className="px-2 py-4">{emp.quotationsCount}</td>
                    <td className="px-2 py-4">{emp.dealsClosed}</td>
                    <td className="px-2 py-4">₹{emp.revenueGenerated.toLocaleString('en-IN')}</td>
                    <td className="px-2 py-4 font-mono">
                      {editingTarget === emp.id ? (
                        <div className="flex items-center gap-1 min-w-[140px]">
                          <span className="text-muted-foreground text-xs">₹</span>
                          <Input
                            type="number"
                            value={targetValue}
                            onChange={(e) => setTargetValue(e.target.value)}
                            className="h-8 w-24 text-xs bg-black/40 border-white/10"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleUpdateTarget(emp.id)}
                          >
                            ✓
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:bg-white/5"
                            onClick={() => setEditingTarget(null)}
                          >
                            ✗
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group min-w-[100px]">
                          <span>₹{emp.monthlyTarget ? emp.monthlyTarget.toLocaleString('en-IN') : '0'}</span>
                          {isAdminOrManager && (
                            <button
                              onClick={() => {
                                setEditingTarget(emp.id);
                                setTargetValue(String(emp.monthlyTarget || ""));
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/5 rounded text-[#c8a84b]"
                              title="Edit Target"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-4">{achievement}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-6 pt-6 mt-10 border-t border-white/5">
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-[#c8a84b]" />
          <h2 className="text-xl font-bold text-[#c8a84b] uppercase tracking-wider">Reports</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col gap-3 bg-neutral-900/40 border-white/10 hover:border-[#c8a84b] hover:bg-[#c8a84b]/5 text-white transition-all group"
            >
              <CalendarIcon className="h-6 w-6 text-blue-400 group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <div className="text-xs font-black uppercase tracking-widest">Daily Activity</div>
                <div className="text-[10px] text-muted-foreground mt-1">Activity logs in range</div>
              </div>
            </Button>
            <div className="flex gap-1">
              {['csv', 'pdf', 'excel'].map((fmt: any) => (
                <Button key={fmt} size="sm" variant="ghost" className="flex-1 text-[9px] uppercase font-black bg-white/5 hover:bg-white/10" onClick={() => exportReport('daily', fmt)}>{fmt}</Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col gap-3 bg-neutral-900/40 border-white/10 hover:border-[#c8a84b] hover:bg-[#c8a84b]/5 text-white transition-all group"
            >
              <TrendingUp className="h-6 w-6 text-purple-400 group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <div className="text-xs font-black uppercase tracking-widest">Performance summary</div>
                <div className="text-[10px] text-muted-foreground mt-1">KPIS in date range</div>
              </div>
            </Button>
            <div className="flex gap-1">
              {['csv', 'pdf', 'excel'].map((fmt: any) => (
                <Button key={fmt} size="sm" variant="ghost" className="flex-1 text-[9px] uppercase font-black bg-white/5 hover:bg-white/10" onClick={() => exportReport('weekly', fmt)}>{fmt}</Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col gap-3 bg-neutral-900/40 border-white/10 hover:border-[#c8a84b] hover:bg-[#c8a84b]/5 text-white transition-all group"
            >
              <DollarSign className="h-6 w-6 text-emerald-400 group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <div className="text-xs font-black uppercase tracking-widest">Revenue Forecast</div>
                <div className="text-[10px] text-muted-foreground mt-1">Quotations & Deals</div>
              </div>
            </Button>
            <div className="flex gap-1">
              {['csv', 'pdf', 'excel'].map((fmt: any) => (
                <Button key={fmt} size="sm" variant="ghost" className="flex-1 text-[9px] uppercase font-black bg-white/5 hover:bg-white/10" onClick={() => exportReport('monthly', fmt)}>{fmt}</Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="h-auto py-6 flex flex-col gap-3 bg-neutral-900/40 border-white/10 hover:border-[#c8a84b] hover:bg-[#c8a84b]/5 text-white transition-all group"
            >
              <Award className="h-6 w-6 text-[#c8a84b] group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <div className="text-xs font-black uppercase tracking-widest">Leaderboard</div>
                <div className="text-[10px] text-muted-foreground mt-1">Ranking by handled leads</div>
              </div>
            </Button>
            <div className="flex gap-1">
              {['csv', 'pdf', 'excel'].map((fmt: any) => (
                <Button key={fmt} size="sm" variant="ghost" className="flex-1 text-[9px] uppercase font-black bg-white/5 hover:bg-white/10" onClick={() => exportReport('ranking', fmt)}>{fmt}</Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
