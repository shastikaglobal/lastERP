import { useState, useEffect, useMemo } from "react";
import SectionHeader from "../../components/SectionHeader";
import Card from "@/components/Card";
import { 
  FileText, 
  Download, 
  Calendar as CalendarIcon, 
  BarChart3, 
  TrendingUp, 
  RefreshCw, 
  FileSpreadsheet,
  Users,
  DollarSign,
  Briefcase,
  Loader2,
  Filter,
  Search,
  ChevronDown,
  Activity,
  Globe,
  Phone, 
  CheckCircle2,
  Plus,
  Trash2,
  ChevronsUpDown,
  UserCheck,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  isWithinInterval, 
  parseISO,
  startOfWeek,
  endOfWeek
} from "date-fns";
import { toast } from "sonner";
import Papa from "papaparse";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ReChartsTooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export default function Reports() {
  const [activeTab, setActiveTab] = useState<"executive" | "activities">("executive");
  const [executiveView, setExecutiveView] = useState<"weekly" | "monthly">("weekly");
  const [modalReportType, setModalReportType] = useState<"daily" | "weekly" | "monthly">("daily");
  const [loading, setLoading] = useState(true);
  const [compiling, setCompiling] = useState(false);
  const [useBackendRPC, setUseBackendRPC] = useState<boolean | null>(null);

  // Filters
  const [selectedDailyDate, setSelectedDailyDate] = useState<Date>(new Date());
  const [showAllDailyDays, setShowAllDailyDays] = useState<boolean>(true);
  const [weeklyStartDate, setWeeklyStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weeklyEndDate, setWeeklyEndDate] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [selectedBDE, setSelectedBDE] = useState<string>("all");

  // Raw Database Data
  const [rawDbData, setRawDbData] = useState<{
    profiles: any[];
    leads: any[];
    activities: any[];
    followUps: any[];
    quotations: any[];
    exportOrders: any[];
    acquisitions: any[];
    dailyReports: any[];
  } | null>(null);

  // Backend Calculated Reports (if RPC works)
  const [weeklyReportBackend, setWeeklyReportBackend] = useState<any>(null);
  const [monthlyReportBackend, setMonthlyReportBackend] = useState<any>(null);
  const [topProductsBackend, setTopProductsBackend] = useState<any[]>([]);
  const [countrySalesBackend, setCountrySalesBackend] = useState<any[]>([]);

  // Daily Report Modal & Submission State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedDetailReport, setSelectedDetailReport] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLeadsPopoverOpen, setIsLeadsPopoverOpen] = useState(false);
  const [reportForm, setReportForm] = useState({
    report_date: format(new Date(), 'yyyy-MM-dd'),
    bde_id: '',
    country: '',
    total_calls: 0,
    calls_attended: 0,
    not_attended_calls: 0,
    linkedin_messages: 0,
    emails_sent: 0,
    new_leads: 0,
    // Weekly
    weekly_leads_handled: 0,
    weekly_followup_completion_rate: 0,
    weekly_meetings: 0,
    weekly_quotes: 0,
    weekly_acquired: 0,
    weekly_revenue: 0,
    weekly_target_achieved_pct: 0,
    // Monthly
    monthly_sales_value: 0,
    monthly_orders: 0,
    monthly_new_clients: 0,
    monthly_repeat_customers: 0,
    monthly_top_products: '',
    monthly_country_sales: '',
    monthly_target_achieved_pct: 0,
    notes: ''
  });

  // Target Editor Dialog state
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [targetsToUpdate, setTargetsToUpdate] = useState<Record<string, number>>({});

  const { profile: currentUser, roleSlugs } = useAuth();
  
  const isAdminOrManager = useMemo(() => {
    const slugs = Array.from(roleSlugs || []).map(s => s.toLowerCase());
    return slugs.includes('admin') || slugs.includes('manager');
  }, [roleSlugs]);

  const isBDE = useMemo(() => {
    const slugs = Array.from(roleSlugs || []).map(s => s.toLowerCase());
    return slugs.includes('bde');
  }, [roleSlugs]);

  const bdeProfiles = useMemo(() => {
    if (!rawDbData) return [];
    return rawDbData.profiles.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  }, [rawDbData]);

  // Import syncCounter here (need to import at top of file too, will do in next step)
  const { syncCounter } = useRealtimeSync();

  // Load all raw data on mount and when syncCounter changes
  const fetchRawData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/analytics/reports_raw?company_id=${currentUser?.company_id || ''}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch raw data");
      const data = await res.json();

      setRawDbData({
        profiles: data.profiles || [],
        leads: data.leads || [],
        activities: data.activities || [],
        followUps: data.followUps || [],
        quotations: data.quotations || [],
        exportOrders: data.exportOrders || [],
        acquisitions: data.acquisitions || [],
        dailyReports: data.dailyReports || []
      });
    } catch (err) {
      console.error("Failed to fetch database tables:", err);
      toast.error("Failed to load database tables");
    } finally {
      setLoading(false);
    }
  };

  // Test and query backend RPCs
  const fetchReports = async () => {
    if (!rawDbData) return;
    setCompiling(true);
    
    try {
      // Intentionally defaulting to frontend calculations using rawDbData
      // to avoid Supabase RPCs after VPS migration.
      setUseBackendRPC(false);
    } catch (err) {
      console.warn("Backend RPC reports not found or failed, falling back to frontend calculations");
      setUseBackendRPC(false);
    } finally {
      setCompiling(false);
    }
  };

  useEffect(() => {
    fetchRawData();
  }, [syncCounter]);

  useEffect(() => {
    if (rawDbData) {
      fetchReports();
    }
  }, [rawDbData, weeklyStartDate, weeklyEndDate, selectedMonth, selectedBDE]);

  const handleReCompile = async () => {
    setCompiling(true);
    await fetchRawData();
    toast.success("Analytics re-compiled successfully");
  };

  const handleSaveTargets = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const promises = Object.entries(targetsToUpdate).map(([id, target]) => {
        return fetch(`/api/employees/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ monthly_target: Number(target) })
        });
      });
      await Promise.all(promises);
      toast.success("Sales targets updated successfully!");
      setIsTargetModalOpen(false);
      await fetchRawData(); // Reload raw data to recompute
    } catch (err) {
      console.error("Failed to save targets:", err);
      toast.error("Failed to save targets");
    } finally {
      setLoading(false);
    }
  };

  // Helper date matching
  const isDateInInterval = (dateStr: string, start: Date, end: Date) => {
    if (!dateStr) return false;
    try {
      const d = parseISO(dateStr);
      return isWithinInterval(d, { start, end });
    } catch (e) {
      return false;
    }
  };

  // Helper to check BDE match
  const isBdeMatch = (itemBde: any, filterBde: string) => {
    if (filterBde === "all") return true;
    if (!itemBde) return false;
    return String(itemBde).toLowerCase() === filterBde.toLowerCase();
  };

  const filteredLeadsForModal = useMemo(() => {
    if (!rawDbData) return [];
    return rawDbData.leads.filter(l => l.company_name.toLowerCase().includes(leadSearch.toLowerCase()));
  }, [rawDbData, leadSearch]);

  const isInDateRange = (dateStr: string) => {
    if (activeTab === "activities") {
      if (showAllDailyDays) return true;
      if (!dateStr) return false;
      const formattedDate = format(selectedDailyDate, 'yyyy-MM-dd');
      return dateStr.substring(0, 10) === formattedDate;
    } else if (executiveView === "weekly") {
      return isDateInInterval(dateStr, weeklyStartDate, weeklyEndDate);
    } else {
      if (!dateStr) return false;
      return dateStr.substring(0, 7) === selectedMonth;
    }
  };

  const isEmpMatch = (dbValue: any, employeeId: string) => {
    if (employeeId === 'all') return true;
    if (!dbValue || !rawDbData) return false;
    const val = String(dbValue).trim().toLowerCase();
    const empId = employeeId.trim().toLowerCase();
    if (val === empId) return true;
    const employee = rawDbData.profiles.find(p => p.id === employeeId);
    const empName = employee?.full_name?.trim().toLowerCase();
    return empName && val === empName;
  };

  // ==========================================
  // FRONTEND FALLBACK CALCULATIONS
  // ==========================================
  
  const weeklyReport = useMemo(() => {
    if (useBackendRPC && weeklyReportBackend) {
      return {
        totalLeadsHandled: Number(weeklyReportBackend.total_leads_handled || 0),
        followUpCompleted: Number(weeklyReportBackend.follow_up_completed_count || 0),
        followUpTotal: Number(weeklyReportBackend.total_follow_ups || 0),
        followUpCompletionRate: Number(weeklyReportBackend.follow_up_completion_rate || 0),
        meetingsArranged: Number(weeklyReportBackend.meetings_arranged || 0),
        quotationsSubmitted: Number(weeklyReportBackend.quotations_submitted || 0),
        newCustomersAcquired: Number(weeklyReportBackend.new_customers_acquired || 0),
        revenueGenerated: Number(weeklyReportBackend.revenue_generated || 0),
        targetAmount: Number(weeklyReportBackend.target_amount || 0),
        targetAchievedPercentage: Number(weeklyReportBackend.target_achieved_percentage || 0),
      };
    }

    if (!rawDbData) {
      return {
        totalLeadsHandled: 0, followUpCompleted: 0, followUpTotal: 0, followUpCompletionRate: 0,
        meetingsArranged: 0, quotationsSubmitted: 0, newCustomersAcquired: 0, revenueGenerated: 0,
        targetAmount: 0, targetAchievedPercentage: 0
      };
    }

    const leadsCount = rawDbData.leads.filter(l => 
      isDateInInterval(l.created_at, weeklyStartDate, weeklyEndDate) &&
      isBdeMatch(l.assigned_to, selectedBDE)
    ).length;

    const followUps = rawDbData.followUps.filter(f => 
      isDateInInterval(f.created_at, weeklyStartDate, weeklyEndDate) &&
      isBdeMatch(f.assigned_to, selectedBDE)
    );
    const fuTotal = followUps.length;
    const fuCompleted = followUps.filter(f => f.is_notified === true).length;
    const fuRate = fuTotal > 0 ? (fuCompleted / fuTotal) * 100 : 0;

    const meetings = rawDbData.activities.filter(a => 
      a.type === "meeting" &&
      isDateInInterval(a.created_at, weeklyStartDate, weeklyEndDate) &&
      isBdeMatch(a.created_by, selectedBDE)
    ).length;

    const quotes = rawDbData.quotations.filter(q => 
      isDateInInterval(q.created_at, weeklyStartDate, weeklyEndDate) &&
      isBdeMatch(q.created_by, selectedBDE)
    ).length;

    const acquired = rawDbData.acquisitions.filter(a => 
      isDateInInterval(a.acquisition_date || a.created_at, weeklyStartDate, weeklyEndDate) &&
      isBdeMatch(a.assigned_bde, selectedBDE)
    ).length;

    const revenue = rawDbData.exportOrders
      .filter(o => 
        isDateInInterval(o.order_date || o.created_at, weeklyStartDate, weeklyEndDate) &&
        isBdeMatch(o.created_by, selectedBDE)
      )
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

    const manualWeekly = rawDbData.dailyReports.filter(r => 
      r.report_type === 'weekly' && 
      isDateInInterval(r.report_date, weeklyStartDate, weeklyEndDate) &&
      isBdeMatch(r.bde_id, selectedBDE)
    );

    let mLeads = 0, mMeetings = 0, mQuotes = 0, mAcquired = 0, mRevenue = 0, mFuRateSum = 0;
    manualWeekly.forEach(r => {
      const m = r.metrics || {};
      mLeads += Number(m.leads_handled || 0);
      mMeetings += Number(m.meetings || 0);
      mQuotes += Number(m.quotes || 0);
      mAcquired += Number(m.acquired || 0);
      mRevenue += Number(m.revenue || 0);
      mFuRateSum += Number(m.followup_completion_rate || 0);
    });

    let target = 0;
    if (selectedBDE === "all") {
      target = rawDbData.profiles.reduce((sum, p) => sum + (Number(p.monthly_target) || 0), 0) / 4;
    } else {
      const p = rawDbData.profiles.find(prof => prof.id === selectedBDE);
      target = (Number(p?.monthly_target) || 0) / 4;
    }

    const totalLeadsHandled = leadsCount + mLeads;
    const meetingsArranged = meetings + mMeetings;
    const quotationsSubmitted = quotes + mQuotes;
    const newCustomersAcquired = acquired + mAcquired;
    const revenueGenerated = revenue + mRevenue;

    const targetPct = target > 0 ? (revenueGenerated / target) * 100 : 0;
    const avgManualFuRate = manualWeekly.length > 0 ? (mFuRateSum / manualWeekly.length) : 0;
    const finalFuRate = fuTotal > 0 ? (fuCompleted / fuTotal) * 100 : avgManualFuRate;

    return {
      totalLeadsHandled,
      followUpCompleted: fuCompleted,
      followUpTotal: fuTotal,
      followUpCompletionRate: parseFloat(finalFuRate.toFixed(2)),
      meetingsArranged,
      quotationsSubmitted,
      newCustomersAcquired,
      revenueGenerated,
      targetAmount: parseFloat(target.toFixed(2)),
      targetAchievedPercentage: parseFloat(targetPct.toFixed(2))
    };
  }, [rawDbData, useBackendRPC, weeklyReportBackend, weeklyStartDate, weeklyEndDate, selectedBDE]);

  const monthlyReport = useMemo(() => {
    if (useBackendRPC && monthlyReportBackend) {
      return {
        monthlySalesValue: Number(monthlyReportBackend.monthly_sales_value || 0),
        totalOrders: Number(monthlyReportBackend.total_orders || 0),
        newClientsAcquired: Number(monthlyReportBackend.new_clients_acquired || 0),
        repeatCustomersCount: Number(monthlyReportBackend.repeat_customers_count || 0),
        targetAmount: Number(monthlyReportBackend.target_amount || 0),
        targetAchievedPercentage: Number(monthlyReportBackend.target_achieved_percentage || 0),
      };
    }

    if (!rawDbData) {
      return {
        monthlySalesValue: 0, totalOrders: 0, newClientsAcquired: 0, repeatCustomersCount: 0,
        targetAmount: 0, targetAchievedPercentage: 0
      };
    }

    const orders = rawDbData.exportOrders.filter(o => {
      const date = o.order_date || o.created_at;
      if (!date) return false;
      const orderMonth = date.substring(0, 7);
      return orderMonth === selectedMonth && isBdeMatch(o.created_by, selectedBDE);
    });

    const salesValue = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const ordersCount = orders.length;

    const acquired = rawDbData.acquisitions.filter(a => {
      const date = a.acquisition_date || a.created_at;
      if (!date) return false;
      const acqMonth = date.substring(0, 7);
      return acqMonth === selectedMonth && isBdeMatch(a.assigned_bde, selectedBDE);
    }).length;

    const customerCounts: Record<string, number> = {};
    orders.forEach(o => {
      if (o.customer_name) {
        customerCounts[o.customer_name] = (customerCounts[o.customer_name] || 0) + 1;
      }
    });
    const repeatCust = Object.values(customerCounts).filter(count => count > 1).length;

    const manualMonthly = rawDbData.dailyReports.filter(r => 
      r.report_type === 'monthly' && 
      r.report_date && r.report_date.substring(0, 7) === selectedMonth &&
      isBdeMatch(r.bde_id, selectedBDE)
    );

    let mSales = 0, mOrders = 0, mNewClients = 0, mRepeatCust = 0;
    manualMonthly.forEach(r => {
      const m = r.metrics || {};
      mSales += Number(m.sales_value || 0);
      mOrders += Number(m.orders || 0);
      mNewClients += Number(m.new_clients || 0);
      mRepeatCust += Number(m.repeat_customers || 0);
    });

    let target = 0;
    if (selectedBDE === "all") {
      target = rawDbData.profiles.reduce((sum, p) => sum + (Number(p.monthly_target) || 0), 0);
    } else {
      const p = rawDbData.profiles.find(prof => prof.id === selectedBDE);
      target = Number(p?.monthly_target) || 0;
    }

    const totalSalesValue = salesValue + mSales;
    const totalOrdersPlaced = ordersCount + mOrders;
    const totalNewClients = acquired + mNewClients;
    const totalRepeatCust = repeatCust + mRepeatCust;

    const targetPct = target > 0 ? (totalSalesValue / target) * 100 : 0;

    return {
      monthlySalesValue: totalSalesValue,
      totalOrders: totalOrdersPlaced,
      newClientsAcquired: totalNewClients,
      repeatCustomersCount: totalRepeatCust,
      targetAmount: target,
      targetAchievedPercentage: parseFloat(targetPct.toFixed(2))
    };
  }, [rawDbData, useBackendRPC, monthlyReportBackend, selectedMonth, selectedBDE]);

  const monthlyTopProducts = useMemo(() => {
    if (useBackendRPC && topProductsBackend.length > 0) {
      return topProductsBackend.map(item => ({
        product: item.product_name || "Unknown",
        revenue: Number(item.total_revenue || 0),
        quantity: Number(item.total_quantity || 0)
      }));
    }

    if (!rawDbData) return [];

    const productStats: Record<string, { revenue: number, qty: number }> = {};
    rawDbData.exportOrders.forEach(o => {
      const date = o.order_date || o.created_at;
      if (!date) return;
      const orderMonth = date.substring(0, 7);
      if (orderMonth !== selectedMonth || !isBdeMatch(o.created_by, selectedBDE)) return;

      const prodName = o.product || "Unknown Product";
      if (!productStats[prodName]) productStats[prodName] = { revenue: 0, qty: 0 };
      productStats[prodName].revenue += (Number(o.total_amount) || 0);
      productStats[prodName].qty += (Number(o.quantity) || 0);
    });

    return Object.entries(productStats)
      .map(([product, stat]) => ({
        product,
        revenue: stat.revenue,
        quantity: stat.qty
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [rawDbData, useBackendRPC, topProductsBackend, selectedMonth, selectedBDE]);

  const monthlyCountrySales = useMemo(() => {
    if (useBackendRPC && countrySalesBackend.length > 0) {
      return countrySalesBackend.map(item => ({
        country: item.country_name || "Unknown",
        revenue: Number(item.total_revenue || 0)
      }));
    }

    if (!rawDbData) return [];

    const countryStats: Record<string, number> = {};
    rawDbData.exportOrders.forEach(o => {
      const date = o.order_date || o.created_at;
      if (!date) return;
      const orderMonth = date.substring(0, 7);
      if (orderMonth !== selectedMonth || !isBdeMatch(o.created_by, selectedBDE)) return;

      const country = o.customer_country || "Other";
      countryStats[country] = (countryStats[country] || 0) + (Number(o.total_amount) || 0);
    });

    return Object.entries(countryStats)
      .map(([country, revenue]) => ({
        country,
        revenue
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [rawDbData, useBackendRPC, countrySalesBackend, selectedMonth, selectedBDE]);

  // Chart data for weekly report
  const weeklyChartData = useMemo(() => {
    return [
      { name: "Leads", value: weeklyReport.totalLeadsHandled },
      { name: "Follow-ups Scheduled", value: weeklyReport.followUpTotal },
      { name: "Follow-ups Completed", value: weeklyReport.followUpCompleted },
      { name: "Meetings Arranged", value: weeklyReport.meetingsArranged },
      { name: "Quotations", value: weeklyReport.quotationsSubmitted },
      { name: "Acquisitions", value: weeklyReport.newCustomersAcquired }
    ];
  }, [weeklyReport]);

  const exportCSV = (content: any[], filename: string) => {
    const csv = Papa.unparse(content);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${filename}_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Exported");
  };

  const handleExportCSV = () => {
    let content: any[] = [];
    let filename = "";

    if (activeTab === "activities") {
      filename = `Daily_Performance_Logs_${showAllDailyDays ? "All" : format(selectedDailyDate, 'yyyyMMdd')}`;
      const filtered = (rawDbData?.dailyReports || []).filter(r => isInDateRange(r.report_date) && isEmpMatch(r.bde_id, selectedBDE));
      content = filtered.map(r => ({
        Date: r.report_date,
        BDE: bdeProfiles.find(p => p.id === r.bde_id)?.full_name || 'Unknown',
        Country: r.country || 'Worldwide',
        "Total Calls": r.total_calls,
        "Calls Attended": r.calls_attended,
        "Calls Not Attended": r.not_attended_calls,
        "LinkedIn Messages": r.linkedin_messages,
        "Emails Sent": r.emails_sent,
        "New Leads": r.new_leads,
        "Leads Contacted": r.attended_names || '',
        Notes: r.notes || ''
      }));
    } else if (executiveView === "weekly") {
      filename = `Weekly_Performance_Report_${format(weeklyStartDate, 'yyyyMMdd')}`;
      content = [
        { Metric: "Total leads handled", Value: weeklyReport.totalLeadsHandled },
        { Metric: "Follow-ups Completed", Value: weeklyReport.followUpCompleted },
        { Metric: "Total Follow-ups Scheduled", Value: weeklyReport.followUpTotal },
        { Metric: "Follow-up completion rate", Value: `${weeklyReport.followUpCompletionRate}%` },
        { Metric: "Meetings arranged", Value: weeklyReport.meetingsArranged },
        { Metric: "Quotations submitted", Value: weeklyReport.quotationsSubmitted },
        { Metric: "New customers acquired", Value: weeklyReport.newCustomersAcquired },
        { Metric: "Revenue generated (USD)", Value: weeklyReport.revenueGenerated },
        { Metric: "Weekly Target (USD)", Value: weeklyReport.targetAmount },
        { Metric: "Target achieved rate", Value: `${weeklyReport.targetAchievedPercentage}%` }
      ];
    } else {
      filename = `Monthly_Sales_Report_${selectedMonth}`;
      content = [
        { Metric: "Monthly sales value (USD)", Value: monthlyReport.monthlySalesValue },
        { Metric: "Total orders placed", Value: monthlyReport.totalOrders },
        { Metric: "New clients acquired", Value: monthlyReport.newClientsAcquired },
        { Metric: "Repeat customers count", Value: monthlyReport.repeatCustomersCount },
        { Metric: "Monthly Target (USD)", Value: monthlyReport.targetAmount },
        { Metric: "Target achieved rate", Value: `${monthlyReport.targetAchievedPercentage}%` }
      ];
    }

    const csv = Papa.unparse(content);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Report Downloaded!");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(22);
    doc.setTextColor(200, 168, 75); // Shastika Gold accent
    doc.text("SHASTIKA GLOBAL ERP", 14, 18);
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    
    let title = "";
    let rows: string[][] = [];

    if (activeTab === "activities") {
      title = `Daily BDE Performance Logs (${showAllDailyDays ? "All Days" : format(selectedDailyDate, 'dd MMM yyyy')})`;
      doc.text(title, 14, 28);
      
      const filtered = (rawDbData?.dailyReports || []).filter(r => isInDateRange(r.report_date) && isEmpMatch(r.bde_id, selectedBDE));
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on ${format(new Date(), 'PPpp')} • Operator: BDE Admin Portal`, 14, 48);
      doc.line(14, 52, 196, 52);

      let y = 60;
      filtered.forEach((r, idx) => {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.setTextColor(200, 168, 75);
        const name = bdeProfiles.find(p => p.id === r.bde_id)?.full_name || 'Unknown';
        doc.text(`${idx + 1}. BDE: ${name} (${r.report_date})`, 14, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(`Calls: ${r.total_calls} Total / ${r.calls_attended} Attended / ${r.not_attended_calls} Unattended`, 14, y);
        y += 5;
        doc.text(`LinkedIn Messages: ${r.linkedin_messages} | Emails Sent: ${r.emails_sent} | New Leads: ${r.new_leads}`, 14, y);
        y += 5;
        doc.text(`Leads Name: ${r.attended_names || 'None'}`, 14, y);
        y += 5;
        doc.text(`Notes: ${r.notes || 'No notes'}`, 14, y);
        y += 8;
        doc.line(14, y, 196, y);
        y += 8;
      });

      doc.save(`daily_performance_logs.pdf`);
      toast.success("PDF Report Downloaded!");
      return;
    }

    if (executiveView === "weekly") {
      title = `Weekly CRM Performance Report (${format(weeklyStartDate, 'dd MMM yyyy')} - ${format(weeklyEndDate, 'dd MMM yyyy')})`;
      doc.text(title, 14, 28);
      
      rows = [
        ["Total leads handled", String(weeklyReport.totalLeadsHandled)],
        ["Follow-ups completed", `${weeklyReport.followUpCompleted} / ${weeklyReport.followUpTotal}`],
        ["Follow-up completion rate", `${weeklyReport.followUpCompletionRate}%`],
        ["Meetings arranged", String(weeklyReport.meetingsArranged)],
        ["Quotations submitted", String(weeklyReport.quotationsSubmitted)],
        ["New customers acquired", String(weeklyReport.newCustomersAcquired)],
        ["Revenue generated", `$${weeklyReport.revenueGenerated.toLocaleString()}`],
        ["Weekly Target (1/4 monthly)", `$${weeklyReport.targetAmount.toLocaleString()}`],
        ["Target achievement rate", `${weeklyReport.targetAchievedPercentage}%`]
      ];
    } else {
      title = `Monthly Sales Performance Report (${selectedMonth})`;
      doc.text(title, 14, 28);

      rows = [
        ["Monthly sales value", `$${monthlyReport.monthlySalesValue.toLocaleString()}`],
        ["Total orders placed", String(monthlyReport.totalOrders)],
        ["New clients acquired", String(monthlyReport.newClientsAcquired)],
        ["Repeat customers count", String(monthlyReport.repeatCustomersCount)],
        ["Monthly target amount", `$${monthlyReport.targetAmount.toLocaleString()}`],
        ["Target achievement rate", `${monthlyReport.targetAchievedPercentage}%`]
      ];
    }

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on ${format(new Date(), 'PPpp')} • Operator: BDE Admin Portal`, 14, 48);
    doc.line(14, 52, 196, 52);

    let y = 65;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Key Performance Indicator", 14, y);
    doc.text("Value", 140, y);
    y += 6;
    doc.line(14, y, 196, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    rows.forEach(row => {
      doc.text(row[0], 14, y);
      doc.text(row[1], 140, y);
      y += 10;
    });

    if (activeTab === "executive" && executiveView === "monthly" && monthlyTopProducts.length > 0) {
      y += 10;
      doc.setFont("helvetica", "bold");
      doc.text("Top Selling Products", 14, y);
      y += 8;
      monthlyTopProducts.forEach((p, idx) => {
        doc.setFont("helvetica", "normal");
        doc.text(`${idx + 1}. ${p.product}`, 14, y);
        doc.text(`$${p.revenue.toLocaleString()}`, 140, y);
        y += 8;
      });
    }

    doc.save(`${activeTab}_performance_report.pdf`);
    toast.success("PDF Report Downloaded!");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <div className="relative">
          <Loader2 className="h-14 w-14 animate-spin text-[#c8a84b] opacity-20" />
          <Loader2 className="h-14 w-14 animate-spin text-[#c8a84b] absolute top-0 left-0" style={{ animationDirection: 'reverse', animationDuration: '3s', opacity: 0.5 }} />
        </div>
        <div className="text-center space-y-1">
          <p className="text-lg font-bold text-white tracking-tight uppercase">Loading CRM Analytics</p>
          <p className="text-xs text-muted-foreground">Synchronizing daily inputs and compilation engines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-foreground pb-20 max-w-[1600px] mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-2 border-b border-white/5">
        <SectionHeader
          title="Executive and Daily Report"
          sub="Official dashboard for operational monitoring and targets verification"
        />
        <div className="flex items-center gap-3">
          {useBackendRPC && (
            <span className="text-[10px] bg-green-950/40 text-green-400 border border-green-800 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">
              ⚡ Database RPC Enabled
            </span>
          )}
          <Button 
            className="btn-gold px-8 py-6 rounded-2xl shadow-xl shadow-[#c8a84b]/10 group transition-all" 
            onClick={handleReCompile}
            disabled={compiling}
          >
            <div className="flex items-center gap-3">
              <RefreshCw className={cn("h-5 w-5", compiling && "animate-spin")} />
              <div className="text-left">
                <div className="text-sm font-black uppercase">Re-Compile</div>
                <div className="text-[10px] uppercase font-bold opacity-70">Sync database</div>
              </div>
            </div>
          </Button>
        </div>
      </div>

      {/* FILTER & CONTROL PANEL */}
      {/* FILTER & CONTROL PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-end bg-neutral-900/40 p-8 rounded-[2rem] border border-white/5 backdrop-blur-3xl shadow-2xl">
        {/* Report Tab Selector */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <BarChart3 className="h-3 w-3 text-[#c8a84b]" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Select Report Section</span>
          </div>
          <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5 gap-1">
            <button
              onClick={() => setActiveTab("executive")}
              className={cn(
                "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                activeTab === "executive" ? "bg-[#c8a84b] text-black" : "text-muted-foreground hover:text-white"
              )}
            >
              Executive
            </button>
            <button
              onClick={() => setActiveTab("activities")}
              className={cn(
                "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                activeTab === "activities" ? "bg-[#c8a84b] text-black" : "text-muted-foreground hover:text-white"
              )}
            >
              Daily Report
            </button>
          </div>
        </div>

        {/* Column 2: Sub View Selector (Weekly/Monthly for Executive, Date Filter Toggle for Activities) */}
        {activeTab === "executive" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <BarChart3 className="h-3 w-3 text-[#c8a84b]" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Executive Period</span>
            </div>
            <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5 gap-1">
              <button
                onClick={() => setExecutiveView("weekly")}
                className={cn(
                  "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                  executiveView === "weekly" ? "bg-[#c8a84b] text-black" : "text-muted-foreground hover:text-white"
                )}
              >
                Weekly
              </button>
              <button
                onClick={() => setExecutiveView("monthly")}
                className={cn(
                  "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                  executiveView === "monthly" ? "bg-[#c8a84b] text-black" : "text-muted-foreground hover:text-white"
                )}
              >
                Monthly
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Filter className="h-3 w-3 text-[#c8a84b]" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Filter Mode</span>
            </div>
            <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5 gap-1">
              <button
                onClick={() => setShowAllDailyDays(true)}
                className={cn(
                  "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                  showAllDailyDays ? "bg-[#c8a84b] text-black" : "text-muted-foreground hover:text-white"
                )}
              >
                All Logs
              </button>
              <button
                onClick={() => setShowAllDailyDays(false)}
                className={cn(
                  "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                  !showAllDailyDays ? "bg-[#c8a84b] text-black" : "text-muted-foreground hover:text-white"
                )}
              >
                Select Date
              </button>
            </div>
          </div>
        )}

        {/* Column 3: Date Selector depending on Main tab and Sub-selector */}
        {activeTab === "activities" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <CalendarIcon className="h-3 w-3 text-[#c8a84b]" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Daily Report Date</span>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start bg-black/40 border-white/10 text-white font-mono h-12 rounded-xl text-left truncate" disabled={showAllDailyDays}>
                  {format(selectedDailyDate, "MMM dd, yy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-neutral-900 border-white/10">
                <Calendar mode="single" selected={selectedDailyDate} onSelect={(d) => d && setSelectedDailyDate(d)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        ) : executiveView === "weekly" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <CalendarIcon className="h-3 w-3 text-[#c8a84b]" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Weekly range</span>
            </div>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start bg-black/40 border-white/10 text-white font-mono h-12 rounded-xl">
                    {format(weeklyStartDate, "MMM dd, yy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[100] bg-neutral-900 border-white/10">
                  <Calendar mode="single" selected={weeklyStartDate} onSelect={(d) => d && setWeeklyStartDate(d)} initialFocus />
                </PopoverContent>
              </Popover>
              <div className="flex items-center text-muted-foreground px-1"> </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start bg-black/40 border-white/10 text-white font-mono h-12 rounded-xl">
                    {format(weeklyEndDate, "MMM dd, yy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[100] bg-neutral-900 border-white/10">
                  <Calendar mode="single" selected={weeklyEndDate} onSelect={(d) => d && setWeeklyEndDate(d)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <CalendarIcon className="h-3 w-3 text-[#c8a84b]" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Select Month</span>
            </div>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-black/40 border-white/10 text-white h-12 rounded-xl focus:ring-[#c8a84b]/20"
            />
          </div>
        )}

        {/* BDE Member selector */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Users className="h-3 w-3 text-blue-400" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Associate / Owner</span>
          </div>
          <Select value={selectedBDE} onValueChange={setSelectedBDE}>
            <SelectTrigger className="w-full bg-black/40 border-white/10 text-white h-12 rounded-xl focus:ring-[#c8a84b]/20">
              <SelectValue placeholder="All Associates" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-900 border-white/10 text-white">
              <SelectItem value="all">All Global Employees</SelectItem>
              {bdeProfiles.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Export triggers */}
        <div className="flex gap-2">
          <Button 
            onClick={handleExportCSV}
            className="flex-1 h-12 rounded-xl border border-white/10 bg-black/30 text-white hover:bg-[#c8a84b]/5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4 text-green-500" />
            CSV
          </Button>
          <Button 
            onClick={handleExportPDF}
            className="flex-1 h-12 rounded-xl border border-white/10 bg-black/30 text-white hover:bg-[#c8a84b]/5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <FileText className="h-4 w-4 text-red-500" />
            PDF
          </Button>
        </div>
      </div>

      {/* ==========================================
          TAB 1: WEEKLY PERFORMANCE REPORT
          ========================================== */}
      {activeTab === "executive" && executiveView === "weekly" && (
        <div className="space-y-8 animate-fade-in">
          {/* Key KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 bg-gradient-to-br from-neutral-900/60 to-black border-white/5 flex flex-col justify-between group overflow-hidden relative">
              <Users className="h-12 w-12 text-blue-400/5 absolute -bottom-2 -right-2 rotate-12" />
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Weekly Flow</div>
              <div className="mt-4">
                <div className="text-3xl font-black font-mono text-white">{weeklyReport.totalLeadsHandled}</div>
                <div className="text-[10px] text-blue-400 font-bold uppercase mt-1">Total Leads Handled</div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-neutral-900/60 to-black border-white/5 flex flex-col justify-between group overflow-hidden relative">
              <Phone className="h-12 w-12 text-purple-400/5 absolute -bottom-2 -right-2 rotate-12" />
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Tasks & Outreach</div>
              <div className="mt-4 space-y-2">
                <div className="text-3xl font-black font-mono text-purple-400">{weeklyReport.followUpCompletionRate}%</div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-purple-500 h-full transition-all duration-500"
                    style={{ width: `${Math.min(weeklyReport.followUpCompletionRate, 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground font-bold uppercase">
                  Follow-up Completed ({weeklyReport.followUpCompleted}/{weeklyReport.followUpTotal})
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-neutral-900/60 to-black border-white/5 flex flex-col justify-between group overflow-hidden relative">
              <Activity className="h-12 w-12 text-cyan-400/5 absolute -bottom-2 -right-2 rotate-12" />
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Engagement metrics</div>
              <div className="mt-4 grid grid-cols-3 gap-2 divide-x divide-white/5 text-center">
                <div>
                  <div className="text-lg font-black font-mono text-white">{weeklyReport.meetingsArranged}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black">Meetings</div>
                </div>
                <div>
                  <div className="text-lg font-black font-mono text-white">{weeklyReport.quotationsSubmitted}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black">Quotes</div>
                </div>
                <div>
                  <div className="text-lg font-black font-mono text-white">{weeklyReport.newCustomersAcquired}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-black">Acquired</div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-neutral-900/60 to-black border-white/5 flex flex-col justify-between group overflow-hidden relative border-l-4 border-l-[#c8a84b]/30">
              <DollarSign className="h-12 w-12 text-emerald-400/5 absolute -bottom-2 -right-2 rotate-12" />
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Sales Target Tracker</div>
              <div className="mt-4 space-y-2">
                <div className="text-2xl font-black font-mono text-[#c8a84b]">
                  ${weeklyReport.revenueGenerated.toLocaleString()}
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#c8a84b] h-full transition-all duration-500" 
                    style={{ width: `${Math.min(weeklyReport.targetAchievedPercentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase">
                  <span>Progress: {weeklyReport.targetAchievedPercentage}%</span>
                  <span>Target: ${weeklyReport.targetAmount.toLocaleString()}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Activity Breakdown Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 p-8 bg-neutral-900/40 border-white/5 backdrop-blur-xl rounded-3xl">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-6">Weekly Operational Outreach</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} />
                    <YAxis stroke="#666" fontSize={10} tickLine={false} />
                    <ReChartsTooltip 
                      contentStyle={{ backgroundColor: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                      labelStyle={{ color: "#c8a84b", fontWeight: "bold" }}
                    />
                    <Bar dataKey="value" fill="#c8a84b" radius={[6, 6, 0, 0]}>
                      {weeklyChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 5 ? "#10b981" : "#c8a84b"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-8 bg-neutral-900/40 border-white/5 backdrop-blur-xl rounded-3xl flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-4">Target Achievement</h3>
                <p className="text-xs text-muted-foreground mb-6">Weekly revenue goals breakdown versus pipeline achievement</p>
                <div className="h-[200px] flex items-center justify-center relative">
                  <div className="text-center">
                    <div className="text-5xl font-black font-mono text-[#c8a84b] tracking-tighter">
                      {weeklyReport.targetAchievedPercentage}%
                    </div>
                    <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-2">
                      Weekly Goal Achieved
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-white/5 pt-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Revenue Generated</span>
                  <span className="font-bold font-mono text-emerald-400">${weeklyReport.revenueGenerated.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Weekly Target</span>
                  <span className="font-bold font-mono text-white">${weeklyReport.targetAmount.toLocaleString()}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Manual Weekly Performance Logs Section */}
          <div className="space-y-6 pt-10 border-t border-white/5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-6 w-6 text-[#c8a84b]" />
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Manual Weekly Performance Logs</h2>
              </div>
              <div className="flex items-center gap-3">
                {(isBDE || isAdminOrManager) && (
                  <Button 
                    onClick={() => {
                      setModalReportType("weekly");
                      setReportForm(prev => ({
                        ...prev,
                        report_date: format(new Date(), 'yyyy-MM-dd')
                      }));
                      setIsReportModalOpen(true);
                    }}
                    className="bg-[#c8a84b] hover:bg-[#a68a3d] text-black font-bold h-10 rounded-xl uppercase text-[10px] tracking-widest px-6 shadow-lg shadow-[#c8a84b]/20"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Submit Weekly Report
                  </Button>
                )}
              </div>
            </div>

            <Card className="border border-white/5 rounded-2xl overflow-hidden bg-neutral-900/40 backdrop-blur-xl shadow-2xl">
              <Table>
                <TableHeader className="bg-black/40">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase font-black text-muted-foreground py-4">Week Start</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-muted-foreground py-4">BDE Name</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-muted-foreground text-center py-4">Country</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-muted-foreground text-center py-4">Leads Handled</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-muted-foreground text-center py-4">Follow-up Comp %</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-muted-foreground text-center py-4">Meetings</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-muted-foreground text-center py-4">Quotes</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-muted-foreground text-center py-4">Acquired</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-muted-foreground text-center py-4">Revenue</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-muted-foreground text-right px-6 py-4">Achievement %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rawDbData?.dailyReports || [])
                    .filter(r => r.report_type === 'weekly' && isInDateRange(r.report_date) && isEmpMatch(r.bde_id, selectedBDE))
                    .length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-20 text-muted-foreground italic font-medium">
                        No manual weekly performance logs found for the selected period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (rawDbData?.dailyReports || [])
                      .filter(r => r.report_type === 'weekly' && isInDateRange(r.report_date) && isEmpMatch(r.bde_id, selectedBDE))
                      .map((report, idx) => {
                        const m = report.metrics || {};
                        return (
                          <TableRow 
                            key={idx} 
                            className="border-white/5 hover:bg-[#c8a84b]/10 transition-all cursor-pointer group"
                            onClick={() => {
                              setSelectedDetailReport(report);
                              setIsDetailOpen(true);
                            }}
                          >
                            <TableCell className="font-mono text-xs font-bold text-white/70 py-4">{report.report_date}</TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-[#c8a84b]/20 flex items-center justify-center text-[#c8a84b] text-[10px] font-bold">
                                  {(bdeProfiles.find(p => p.id === report.bde_id)?.full_name || "U")[0]}
                                </div>
                                <span className="text-xs font-bold text-white">{bdeProfiles.find(p => p.id === report.bde_id)?.full_name || 'Unknown BDE'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-xs font-medium text-muted-foreground py-4">{report.country || "Worldwide"}</TableCell>
                            <TableCell className="text-center text-xs font-black text-white py-4">{m.leads_handled || 0}</TableCell>
                            <TableCell className="text-center text-xs font-black text-purple-400 py-4">{m.followup_completion_rate || 0}%</TableCell>
                            <TableCell className="text-center text-xs font-black text-blue-400 py-4">{m.meetings || 0}</TableCell>
                            <TableCell className="text-center text-xs font-black text-orange-400 py-4">{m.quotes || 0}</TableCell>
                            <TableCell className="text-center text-xs font-black text-emerald-500 py-4">{m.acquired || 0}</TableCell>
                            <TableCell className="text-center text-xs font-black text-emerald-400 py-4">${(m.revenue || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right px-6 py-4">
                              <span className="text-xs font-black text-emerald-500 font-mono">{m.target_achieved_pct || 0}%</span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: MONTHLY SALES REPORT
          ========================================== */}
      {activeTab === "executive" && executiveView === "monthly" && (
        <div className="space-y-8 animate-fade-in">
          {/* Monthly KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 bg-gradient-to-br from-neutral-900/60 to-black border-white/5 flex flex-col justify-between group overflow-hidden relative">
              <DollarSign className="h-12 w-12 text-[#c8a84b]/5 absolute -bottom-2 -right-2 rotate-12" />
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Sales Pipeline Value</div>
              <div className="mt-4">
                <div className="text-3xl font-black font-mono text-white">
                  ${monthlyReport.monthlySalesValue.toLocaleString()}
                </div>
                <div className="text-[10px] text-[#c8a84b] font-bold uppercase mt-1">Monthly Sales value</div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-neutral-900/60 to-black border-white/5 flex flex-col justify-between group overflow-hidden relative">
              <FileSpreadsheet className="h-12 w-12 text-purple-400/5 absolute -bottom-2 -right-2 rotate-12" />
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Fulfillment Quantity</div>
              <div className="mt-4">
                <div className="text-3xl font-black font-mono text-purple-400">
                  {monthlyReport.totalOrders}
                </div>
                <div className="text-[10px] text-purple-400 font-bold uppercase mt-1">Total export orders placed</div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-neutral-900/60 to-black border-white/5 flex flex-col justify-between group overflow-hidden relative">
              <Users className="h-12 w-12 text-blue-400/5 absolute -bottom-2 -right-2 rotate-12" />
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Client Acquisition</div>
              <div className="mt-4">
                <div className="text-3xl font-black font-mono text-blue-400">
                  {monthlyReport.newClientsAcquired}
                </div>
                <div className="text-[10px] text-blue-400 font-bold uppercase mt-1">New clients acquired</div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-neutral-900/60 to-black border-white/5 flex flex-col justify-between group overflow-hidden relative border-l-4 border-l-emerald-500/30">
              <RefreshCw className="h-12 w-12 text-emerald-400/5 absolute -bottom-2 -right-2 rotate-12" />
              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Loyalty retention</div>
              <div className="mt-4">
                <div className="text-3xl font-black font-mono text-emerald-400">
                  {monthlyReport.repeatCustomersCount}
                </div>
                <div className="text-[10px] text-emerald-400/80 font-bold uppercase mt-1">Active Repeat customers</div>
              </div>
            </Card>
          </div>

          {/* Sales Target vs Achievement Metric */}
          <Card className="p-8 bg-neutral-900/40 border-white/5 backdrop-blur-xl rounded-3xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">Sales Target vs Achievement</h3>
                <p className="text-xs text-muted-foreground">Monthly targets alignment for both frontend metrics and backend storage limits</p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => {
                    const initialTargets: Record<string, number> = {};
                    bdeProfiles.forEach(p => {
                      initialTargets[p.id] = Number(p.monthly_target) || 0;
                    });
                    setTargetsToUpdate(initialTargets);
                    setIsTargetModalOpen(true);
                  }}
                  variant="outline"
                  className="h-10 rounded-xl border border-white/10 hover:bg-[#c8a84b]/10 text-xs font-bold uppercase"
                >
                  ⚙️ Manage Targets
                </Button>
                <span className="text-sm font-black font-mono text-[#c8a84b] bg-[#c8a84b]/10 border border-[#c8a84b]/20 px-4 py-2 rounded-xl">
                  {monthlyReport.targetAchievedPercentage}% Achieved
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="w-full bg-white/5 h-6 rounded-2xl overflow-hidden p-1 border border-white/10">
                <div 
                  className="bg-gradient-to-r from-[#c8a84b] to-emerald-500 h-full rounded-xl transition-all duration-700" 
                  style={{ width: `${Math.min(monthlyReport.targetAchievedPercentage, 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-2 text-center text-xs divide-x divide-white/5 pt-2">
                <div>
                  <div className="text-muted-foreground uppercase font-black text-[10px] tracking-widest">Total Sales Target</div>
                  <div className="text-xl font-black font-mono text-white mt-1">
                    ${monthlyReport.targetAmount.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground uppercase font-black text-[10px] tracking-widest">Revenue Achieved</div>
                  <div className="text-xl font-black font-mono text-emerald-400 mt-1">
                    ${monthlyReport.monthlySalesValue.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Top Selling Products & Country-wise Sales Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Products */}
            <Card className="p-8 bg-neutral-900/40 border-white/5 backdrop-blur-xl rounded-3xl">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-6">Top-Selling Products</h3>
              {monthlyTopProducts.length > 0 ? (
                <div className="space-y-6">
                  {monthlyTopProducts.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <span className="h-8 w-8 flex items-center justify-center bg-white/5 rounded-lg font-mono text-sm font-bold text-[#c8a84b]">
                          0{idx + 1}
                        </span>
                        <div>
                          <div className="text-sm font-bold text-white">{p.product}</div>
                          <div className="text-[10px] text-muted-foreground">Quantity Sold: {p.quantity}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black font-mono text-white">${p.revenue.toLocaleString()}</div>
                        <div className="text-[10px] text-emerald-400 font-bold uppercase">Revenue</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  No products order data recorded in this period.
                </div>
              )}
            </Card>

            {/* Country Sales Pie Chart */}
            <Card className="p-8 bg-neutral-900/40 border-white/5 backdrop-blur-xl rounded-3xl">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-6">Country-Wise Sales Distribution</h3>
              {monthlyCountrySales.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                  <div className="h-[250px] w-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={monthlyCountrySales}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="revenue"
                        >
                          {monthlyCountrySales.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? "#c8a84b" : index === 1 ? "#10b981" : index === 2 ? "#3b82f6" : "#8b5cf6"} />
                          ))}
                        </Pie>
                        <ReChartsTooltip 
                          contentStyle={{ backgroundColor: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                          formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-3 w-full">
                    {monthlyCountrySales.slice(0, 4).map((c, index) => (
                      <div key={index} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span 
                            className="h-2 w-2 rounded-full shrink-0" 
                            style={{ 
                              backgroundColor: index === 0 ? "#c8a84b" : index === 1 ? "#10b981" : index === 2 ? "#3b82f6" : "#8b5cf6" 
                            }} 
                          />
                          <span className="text-muted-foreground truncate max-w-[100px]">{c.country}</span>
                        </div>
                        <span className="font-bold font-mono text-white">${c.revenue.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  No regional country sales recorded in this period.
                </div>
              )}
            </Card>
          </div>

          {/* Manual Monthly Sales Logs Section */}
          <div className="space-y-6 pt-10 border-t border-white/5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-6 w-6 text-[#c8a84b]" />
                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Manual Monthly Sales Logs</h2>
              </div>
              <div className="flex items-center gap-3">
                {(isBDE || isAdminOrManager) && (
                  <Button 
                    onClick={() => {
                      setModalReportType("monthly");
                      setReportForm(prev => ({
                        ...prev,
                        report_date: format(new Date(), 'yyyy-MM-dd')
                      }));
                      setIsReportModalOpen(true);
                    }}
                    className="bg-[#c8a84b] hover:bg-[#a68a3d] text-black font-bold h-10 rounded-xl uppercase text-[10px] tracking-widest px-6 shadow-lg shadow-[#c8a84b]/20"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Submit Monthly Report
                  </Button>
                )}
              </div>
            </div>

            <Card className="border border-white/5 rounded-2xl overflow-hidden bg-neutral-900/40 backdrop-blur-xl shadow-2xl">
              <Table>
                <TableHeader className="bg-black/40">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase font-black text-muted-foreground py-4">Month</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-muted-foreground py-4">BDE Name</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-muted-foreground text-center py-4">Country</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-muted-foreground text-center py-4">Sales Value</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-muted-foreground text-center py-4">Total Orders</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-muted-foreground text-center py-4">New Clients</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-muted-foreground text-center py-4">Repeat Customers</TableHead>
                    <TableHead className="text-[10px] uppercase font-black text-muted-foreground text-right px-6 py-4">Target vs Achievement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rawDbData?.dailyReports || [])
                    .filter(r => r.report_type === 'monthly' && isInDateRange(r.report_date) && isEmpMatch(r.bde_id, selectedBDE))
                    .length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-20 text-muted-foreground italic font-medium">
                        No manual monthly sales logs found for the selected period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (rawDbData?.dailyReports || [])
                      .filter(r => r.report_type === 'monthly' && isInDateRange(r.report_date) && isEmpMatch(r.bde_id, selectedBDE))
                      .map((report, idx) => {
                        const m = report.metrics || {};
                        return (
                          <TableRow 
                            key={idx} 
                            className="border-white/5 hover:bg-[#c8a84b]/10 transition-all cursor-pointer group"
                            onClick={() => {
                              setSelectedDetailReport(report);
                              setIsDetailOpen(true);
                            }}
                          >
                            <TableCell className="font-mono text-xs font-bold text-white/70 py-4">{report.report_date ? report.report_date.substring(0, 7) : ''}</TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-[#c8a84b]/20 flex items-center justify-center text-[#c8a84b] text-[10px] font-bold">
                                  {(bdeProfiles.find(p => p.id === report.bde_id)?.full_name || "U")[0]}
                                </div>
                                <span className="text-xs font-bold text-white">{bdeProfiles.find(p => p.id === report.bde_id)?.full_name || 'Unknown BDE'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-xs font-medium text-muted-foreground py-4">{report.country || "Worldwide"}</TableCell>
                            <TableCell className="text-center text-xs font-black text-emerald-400 py-4">${(m.sales_value || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-center text-xs font-black text-purple-400 py-4">{m.orders || 0}</TableCell>
                            <TableCell className="text-center text-xs font-black text-blue-400 py-4">{m.new_clients || 0}</TableCell>
                            <TableCell className="text-center text-xs font-black text-orange-400 py-4">{m.repeat_customers || 0}</TableCell>
                            <TableCell className="text-right px-6 py-4">
                              <span className="text-xs font-black text-[#c8a84b] font-mono">{m.target_achieved_pct || 0}%</span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 1: DAILY PERFORMANCE LOGS (ORIGINAL SECTION)
          ========================================== */}
      {activeTab === "activities" && (
        <div className="space-y-6 pt-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-6 w-6 text-[#c8a84b]" />
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">BDE Daily Performance Logs</h2>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-[#c8a84b] border-[#c8a84b]/20 hover:bg-[#c8a84b]/10 h-10 rounded-xl font-bold uppercase text-[10px] tracking-widest px-6 bg-black/20"
              onClick={() => {
                const headers = ["Date", "BDE", "Country", "Calls (Tot/Att/Not)", "LinkedIn", "Emails", "New Leads", "Leads Name", "Notes"];
                const filtered = (rawDbData?.dailyReports || []).filter(r => (r.report_type === 'daily' || !r.report_type) && isInDateRange(r.report_date) && isEmpMatch(r.bde_id, selectedBDE));
                const rows = filtered.map(r => [
                  r.report_date,
                  bdeProfiles.find(p => p.id === r.bde_id)?.full_name || 'Unknown',
                  r.country,
                  `${r.total_calls}/${r.calls_attended}/${r.not_attended_calls}`,
                  r.linkedin_messages,
                  r.emails_sent,
                  r.new_leads,
                  r.attended_names,
                  r.notes
                ]);
                exportCSV([headers, ...rows], `BDE_Daily_Log_Export`);
              }}
            >
              <Download className="mr-2 h-4 w-4" /> Download CSV Export
            </Button>
            
            {(isBDE || isAdminOrManager) && (
              <Button 
                onClick={() => {
                  setModalReportType("daily");
                  setReportForm(prev => ({
                    ...prev,
                    report_date: format(new Date(), 'yyyy-MM-dd')
                  }));
                  setIsReportModalOpen(true);
                }}
                className="bg-[#c8a84b] hover:bg-[#a68a3d] text-black font-bold h-10 rounded-xl uppercase text-[10px] tracking-widest px-6 shadow-lg shadow-[#c8a84b]/20"
              >
                <Plus className="mr-2 h-4 w-4" /> Submit Report
              </Button>
            )}
          </div>
        </div>

        {/* Audit Table */}
        <Card className="border border-white/5 rounded-2xl overflow-hidden bg-neutral-900/40 backdrop-blur-xl shadow-2xl">
          <Table>
            <TableHeader className="bg-black/40">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-[10px] uppercase font-black text-muted-foreground py-4">Date</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-muted-foreground py-4">BDE Name</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-muted-foreground text-center py-4">Country</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-muted-foreground text-center py-4">Calls (Tot/Att/Not)</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-muted-foreground text-center py-4">LinkedIn</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-muted-foreground text-center py-4">Emails</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-muted-foreground text-center py-4">New Leads</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-muted-foreground text-center py-4 leading-tight">Leads Name</TableHead>
                <TableHead className="text-[10px] uppercase font-black text-muted-foreground text-right px-6 py-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rawDbData?.dailyReports || [])
                .filter(r => (r.report_type === 'daily' || !r.report_type) && isInDateRange(r.report_date) && isEmpMatch(r.bde_id, selectedBDE))
                .length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-20 text-muted-foreground italic font-medium">
                    No performance logs found for the selected period.
                  </TableCell>
                </TableRow>
              ) : (
                (rawDbData?.dailyReports || [])
                  .filter(r => (r.report_type === 'daily' || !r.report_type) && isInDateRange(r.report_date) && isEmpMatch(r.bde_id, selectedBDE))
                  .map((report, idx) => (
                    <TableRow 
                      key={idx} 
                      className="border-white/5 hover:bg-[#c8a84b]/10 transition-all cursor-pointer group"
                      onClick={() => {
                        setSelectedDetailReport(report);
                        setIsDetailOpen(true);
                      }}
                    >
                      <TableCell className="font-mono text-xs font-bold text-white/70 py-4">{report.report_date}</TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-[#c8a84b]/20 flex items-center justify-center text-[#c8a84b] text-[10px] font-bold">
                            {(bdeProfiles.find(p => p.id === report.bde_id)?.full_name || "U")[0]}
                          </div>
                          <span className="text-xs font-bold text-white">{bdeProfiles.find(p => p.id === report.bde_id)?.full_name || 'Unknown BDE'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs font-medium text-muted-foreground py-4">{report.country || "Worldwide"}</TableCell>
                      <TableCell className="text-center py-4">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs font-black text-white">{report.total_calls}</span>
                          <span className="text-[10px] text-muted-foreground">/</span>
                          <span className="text-xs font-black text-emerald-500">{report.calls_attended}</span>
                          <span className="text-[10px] text-muted-foreground">/</span>
                          <span className="text-xs font-black text-red-500">{report.not_attended_calls}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs font-black text-blue-400 py-4">{report.linkedin_messages}</TableCell>
                      <TableCell className="text-center text-xs font-black text-orange-400 py-4">{report.emails_sent}</TableCell>
                      <TableCell className="text-center text-xs font-black text-emerald-500 py-4">{report.new_leads}</TableCell>
                      <TableCell className="text-center py-4">
                         <div className="max-w-[150px] truncate mx-auto text-[10px] font-bold text-muted-foreground" title={report.attended_names}>
                            {report.attended_names || "No specific leads"}
                         </div>
                      </TableCell>
                      <TableCell className="text-right px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Verified</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
      )}

      {/* Target Management Modal */}
      <Dialog open={isTargetModalOpen} onOpenChange={setIsTargetModalOpen}>
        <DialogContent className="bg-neutral-900 border-white/10 text-white max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase text-[#c8a84b]">Manage Sales Targets</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Set or update the monthly sales targets (in USD) for each BDE associate.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[350px] overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-white/10">
            {bdeProfiles.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-4 py-2 border-b border-white/5 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate text-white">{p.full_name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{p.role || 'Associate'}</p>
                </div>
                <div className="w-[150px] relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <input
                    type="number"
                    value={targetsToUpdate[p.id] !== undefined ? targetsToUpdate[p.id] : (p.monthly_target || 0)}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTargetsToUpdate(prev => ({ ...prev, [p.id]: val }));
                    }}
                    className="w-full pl-7 pr-3 bg-black/40 border border-white/10 text-white font-mono text-sm h-10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#c8a84b]"
                    placeholder="0"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-white/5">
            <Button variant="outline" onClick={() => setIsTargetModalOpen(false)} className="rounded-xl border border-white/10 h-10 text-xs">
              Cancel
            </Button>
            <Button onClick={handleSaveTargets} className="btn-gold h-10 px-6 rounded-xl text-xs font-bold uppercase">
              Save Targets
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl bg-neutral-900 border-white/10 p-0 overflow-hidden shadow-2xl rounded-3xl text-white">
          <div className="p-6 border-b border-white/5 bg-black/40 relative">
            <button onClick={() => setIsDetailOpen(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-white">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-neutral-800 border border-white/5 flex items-center justify-center text-[#c8a84b] font-black text-lg">
                {(bdeProfiles.find(p => p.id === selectedDetailReport?.bde_id)?.full_name || 'U')[0]}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-black text-white leading-none">
                  {bdeProfiles.find(p => p.id === selectedDetailReport?.bde_id)?.full_name || 'Unknown BDE'}
                </h3>
                <div className="text-sm text-muted-foreground mt-1">
                  {selectedDetailReport?.report_date ? (format(parseISO(selectedDetailReport.report_date), 'PPP')) : ''} • {selectedDetailReport?.country || 'Worldwide'}
                </div>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-black text-emerald-500 uppercase">Verified</span>
                </div>
              </div>
            </div>
          </div>

          {selectedDetailReport && (
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {/* Daily Specific Details */}
                {(selectedDetailReport.report_type === 'daily' || !selectedDetailReport.report_type) && (
                  <>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">Total Calls</div>
                      <div className="text-xl font-black text-white mt-1">{selectedDetailReport.total_calls}</div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">Attended</div>
                      <div className="text-xl font-black text-emerald-500 mt-1">{selectedDetailReport.calls_attended}</div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">Not Attended</div>
                      <div className="text-xl font-black text-red-500 mt-1">{selectedDetailReport.not_attended_calls}</div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">LinkedIn Messages</div>
                      <div className="text-xl font-black text-blue-400 mt-1">{selectedDetailReport.linkedin_messages}</div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">Emails Sent</div>
                      <div className="text-xl font-black text-orange-400 mt-1">{selectedDetailReport.emails_sent}</div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">New Leads</div>
                      <div className="text-xl font-black text-[#c8a84b] mt-1">{selectedDetailReport.new_leads}</div>
                    </div>

                    <div className="col-span-1 sm:col-span-2 md:col-span-3 space-y-2">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">Leads Contacted</div>
                      <div className="text-sm font-medium text-white bg-white/5 rounded-md p-3 border border-white/5">{selectedDetailReport.attended_names || 'No specific leads'}</div>
                    </div>
                  </>
                )}

                {/* Weekly Specific Details */}
                {selectedDetailReport.report_type === 'weekly' && (
                  <>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">Leads Handled</div>
                      <div className="text-xl font-black text-white mt-1">{selectedDetailReport.metrics?.leads_handled || 0}</div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">Follow-up Comp %</div>
                      <div className="text-xl font-black text-purple-400 mt-1">{selectedDetailReport.metrics?.followup_completion_rate || 0}%</div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">Meetings Arranged</div>
                      <div className="text-xl font-black text-blue-400 mt-1">{selectedDetailReport.metrics?.meetings || 0}</div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">Quotes Submitted</div>
                      <div className="text-xl font-black text-orange-400 mt-1">{selectedDetailReport.metrics?.quotes || 0}</div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">New Cust Acquired</div>
                      <div className="text-xl font-black text-emerald-500 mt-1">{selectedDetailReport.metrics?.acquired || 0}</div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">Revenue Generated</div>
                      <div className="text-xl font-black text-emerald-400 mt-1">${(selectedDetailReport.metrics?.revenue || 0).toLocaleString()}</div>
                    </div>

                    <div className="col-span-1 sm:col-span-2 md:col-span-3 bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">Target Achieved %</div>
                      <div className="text-xl font-black text-[#c8a84b] mt-1">{selectedDetailReport.metrics?.target_achieved_pct || 0}%</div>
                    </div>
                  </>
                )}

                {/* Monthly Specific Details */}
                {selectedDetailReport.report_type === 'monthly' && (
                  <>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">Sales Value</div>
                      <div className="text-xl font-black text-emerald-400 mt-1">${(selectedDetailReport.metrics?.sales_value || 0).toLocaleString()}</div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">Total Orders</div>
                      <div className="text-xl font-black text-purple-400 mt-1">{selectedDetailReport.metrics?.orders || 0}</div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">New Clients Acquired</div>
                      <div className="text-xl font-black text-blue-400 mt-1">{selectedDetailReport.metrics?.new_clients || 0}</div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">Repeat Customers</div>
                      <div className="text-xl font-black text-orange-400 mt-1">{selectedDetailReport.metrics?.repeat_customers || 0}</div>
                    </div>

                    <div className="col-span-1 sm:col-span-2 md:col-span-3 bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">Target vs Achievement %</div>
                      <div className="text-xl font-black text-[#c8a84b] mt-1">{selectedDetailReport.metrics?.target_achieved_pct || 0}%</div>
                    </div>

                    <div className="col-span-1 sm:col-span-2 md:col-span-3 space-y-2">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">Top Products</div>
                      <div className="text-sm font-medium text-white bg-white/5 rounded-md p-3 border border-white/5">{selectedDetailReport.metrics?.top_products || 'None listed'}</div>
                    </div>

                    <div className="col-span-1 sm:col-span-2 md:col-span-3 space-y-2">
                      <div className="text-[10px] text-muted-foreground uppercase font-black">Country Sales</div>
                      <div className="text-sm font-medium text-white bg-white/5 rounded-md p-3 border border-white/5">{selectedDetailReport.metrics?.country_sales || 'None listed'}</div>
                    </div>
                  </>
                )}

                <div className="col-span-1 sm:col-span-2 md:col-span-3 space-y-2">
                  <div className="text-[10px] text-muted-foreground uppercase font-black">Notes</div>
                  <div className="text-sm text-muted-foreground italic bg-white/5 rounded-md p-3 border border-white/5">{selectedDetailReport.notes || 'No notes provided.'}</div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 flex justify-end">
                <Button 
                  onClick={() => setIsDetailOpen(false)}
                  className="bg-white text-black hover:bg-white/90 font-black uppercase text-[10px] px-6 h-10 rounded-xl tracking-widest"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Report Submission Dialog */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="max-w-md bg-neutral-900 border-white/10 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 text-white rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#c8a84b] font-bold uppercase">SUBMIT {modalReportType.toUpperCase()} REPORT</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">Enter your performance metrics for the selected period.</DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              if (!reportForm.bde_id) {
                toast.error("Please select a BDE Member Name");
                return;
              }

              const payload: any = {
                bde_id: reportForm.bde_id,
                company_id: currentUser?.company_id || null,
                report_date: reportForm.report_date,
                country: reportForm.country,
                report_type: modalReportType,
                notes: reportForm.notes
              };

              if (modalReportType === 'daily') {
                payload.total_calls = Number(reportForm.total_calls) || 0;
                payload.calls_attended = Number(reportForm.calls_attended) || 0;
                payload.not_attended_calls = Number(reportForm.not_attended_calls) || 0;
                payload.linkedin_messages = Number(reportForm.linkedin_messages) || 0;
                payload.emails_sent = Number(reportForm.emails_sent) || 0;
                payload.new_leads = Number(reportForm.new_leads) || 0;
                payload.attended_names = selectedLeads.join(", ");
              } else if (modalReportType === 'weekly') {
                payload.metrics = {
                  leads_handled: Number(reportForm.weekly_leads_handled) || 0,
                  followup_completion_rate: Number(reportForm.weekly_followup_completion_rate) || 0,
                  meetings: Number(reportForm.weekly_meetings) || 0,
                  quotes: Number(reportForm.weekly_quotes) || 0,
                  acquired: Number(reportForm.weekly_acquired) || 0,
                  revenue: Number(reportForm.weekly_revenue) || 0,
                  target_achieved_pct: Number(reportForm.weekly_target_achieved_pct) || 0
                };
              } else if (modalReportType === 'monthly') {
                payload.metrics = {
                  sales_value: Number(reportForm.monthly_sales_value) || 0,
                  orders: Number(reportForm.monthly_orders) || 0,
                  new_clients: Number(reportForm.monthly_new_clients) || 0,
                  repeat_customers: Number(reportForm.monthly_repeat_customers) || 0,
                  top_products: reportForm.monthly_top_products,
                  country_sales: reportForm.monthly_country_sales,
                  target_achieved_pct: Number(reportForm.monthly_target_achieved_pct) || 0
                };
              }

              const { data: { session } } = await supabase.auth.getSession();
              const res = await fetch('/api/analytics/daily_reports', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify(payload)
              });
              
              if (!res.ok) throw new Error("Failed to insert daily report");

              toast.success(`${modalReportType.toUpperCase()} report submitted successfully`);
              setIsReportModalOpen(false);
              setReportForm({
                report_date: format(new Date(), 'yyyy-MM-dd'),
                bde_id: '',
                country: '',
                total_calls: 0,
                calls_attended: 0,
                not_attended_calls: 0,
                linkedin_messages: 0,
                emails_sent: 0,
                new_leads: 0,
                weekly_leads_handled: 0,
                weekly_followup_completion_rate: 0,
                weekly_meetings: 0,
                weekly_quotes: 0,
                weekly_acquired: 0,
                weekly_revenue: 0,
                weekly_target_achieved_pct: 0,
                monthly_sales_value: 0,
                monthly_orders: 0,
                monthly_new_clients: 0,
                monthly_repeat_customers: 0,
                monthly_top_products: '',
                monthly_country_sales: '',
                monthly_target_achieved_pct: 0,
                notes: ''
              });
              setSelectedLeads([]);
              fetchRawData(); 
            } catch (err: any) {
              toast.error(err.message || "Failed to submit report");
            }
          }} className="grid grid-cols-2 gap-4 pt-4">
            <div className="col-span-2 space-y-2">
              <Label className="text-white">Report Date</Label>
              {modalReportType === 'monthly' ? (
                <input
                  type="month"
                  value={reportForm.report_date.substring(0, 7)}
                  onChange={e => setReportForm({...reportForm, report_date: `${e.target.value}-01`})}
                  required
                  className="w-full bg-black/40 border border-white/10 text-white rounded-xl h-10 px-3 focus:outline-none focus:ring-1 focus:ring-[#c8a84b]"
                />
              ) : (
                <Input type="date" value={reportForm.report_date} onChange={e => setReportForm({...reportForm, report_date: e.target.value})} required className="bg-black/40 border-white/10 text-white rounded-xl h-10" />
              )}
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-white">BDE Member Name *</Label>
              <Select value={reportForm.bde_id} onValueChange={(val) => setReportForm({ ...reportForm, bde_id: val })}>
                <SelectTrigger className="bg-black/40 border-white/10 text-white h-10 rounded-xl">
                  <SelectValue placeholder="Select BDE Member..." />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-white/10 text-white">
                  {bdeProfiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-white">Region / Country</Label>
              <Input type="text" value={reportForm.country} onChange={e => setReportForm({...reportForm, country: e.target.value})} placeholder="e.g. Malaysia, USA" className="bg-black/40 border-white/10 text-white rounded-xl h-10" />
            </div>

            {/* Daily Specific Fields */}
            {modalReportType === 'daily' && (
              <>
                <div className="space-y-2">
                  <Label className="text-white">Total Calls</Label>
                  <Input type="number" min={0} value={reportForm.total_calls === 0 ? '' : reportForm.total_calls} onChange={e => setReportForm({...reportForm, total_calls: e.target.value === '' ? 0 : parseInt(e.target.value, 10)})} className="bg-black/40 border-white/10 text-white rounded-xl h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Calls Attended</Label>
                  <Input type="number" min={0} value={reportForm.calls_attended === 0 ? '' : reportForm.calls_attended} onChange={e => setReportForm({...reportForm, calls_attended: e.target.value === '' ? 0 : parseInt(e.target.value, 10)})} className="bg-black/40 border-white/10 text-white rounded-xl h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Not Attended</Label>
                  <Input type="number" min={0} value={reportForm.not_attended_calls === 0 ? '' : reportForm.not_attended_calls} onChange={e => setReportForm({...reportForm, not_attended_calls: e.target.value === '' ? 0 : parseInt(e.target.value, 10)})} className="bg-black/40 border-white/10 text-white rounded-xl h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">New Leads Count</Label>
                  <Input type="number" min={0} value={reportForm.new_leads === 0 ? '' : reportForm.new_leads} onChange={e => setReportForm({...reportForm, new_leads: e.target.value === '' ? 0 : parseInt(e.target.value, 10)})} className="bg-black/40 border-white/10 text-white rounded-xl h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">LinkedIn Messages</Label>
                  <Input type="number" min={0} value={reportForm.linkedin_messages === 0 ? '' : reportForm.linkedin_messages} onChange={e => setReportForm({...reportForm, linkedin_messages: e.target.value === '' ? 0 : parseInt(e.target.value, 10)})} className="bg-black/40 border-white/10 text-white rounded-xl h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Emails Sent</Label>
                  <Input type="number" min={0} value={reportForm.emails_sent === 0 ? '' : reportForm.emails_sent} onChange={e => setReportForm({...reportForm, emails_sent: e.target.value === '' ? 0 : parseInt(e.target.value, 10)})} className="bg-black/40 border-white/10 text-white rounded-xl h-10" />
                </div>
                
                <div className="col-span-2 space-y-2">
                  <Label className="text-white">Leads Contacted</Label>
                  <Popover open={isLeadsPopoverOpen} onOpenChange={setIsLeadsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between bg-black/40 border-white/10 text-left font-normal h-auto min-h-[40px] py-2 text-white hover:bg-black/60 rounded-xl">
                        <div className="flex flex-wrap gap-1 max-w-[300px]">
                          {selectedLeads.length > 0 ? selectedLeads.join(", ") : "Select company..."}
                        </div>
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[360px] p-0 bg-neutral-900 border-white/10" align="start">
                      <div className="p-2 border-b border-white/5">
                        <div className="flex items-center bg-black/20 rounded px-2">
                          <Search className="h-4 w-4 text-muted-foreground mr-2" />
                          <Input placeholder="Filter leads..." className="border-0 bg-transparent focus-visible:ring-0 h-8 text-xs text-white" value={leadSearch} onChange={e => setLeadSearch(e.target.value)} />
                        </div>
                      </div>
                      <div className="max-h-[250px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-white/10">
                        {filteredLeadsForModal.length === 0 && (
                          <div className="p-4 text-center text-xs text-muted-foreground">No leads found.</div>
                        )}
                        {filteredLeadsForModal.map((lead) => (
                          <div
                            key={lead.id}
                            className={`px-2 py-2 hover:bg-[#c8a84b]/10 cursor-pointer rounded text-xs ${selectedLeads.includes(lead.company_name) ? "text-[#c8a84b] font-bold bg-[#c8a84b]/5" : "text-white"}`}
                            onClick={() => {
                              if (selectedLeads.includes(lead.company_name)) {
                                setSelectedLeads(selectedLeads.filter(s => s !== lead.company_name));
                              } else {
                                setSelectedLeads([...selectedLeads, lead.company_name]);
                              }
                            }}
                          >
                            {lead.company_name}
                          </div>
                        ))}
                      </div>
                      <div className="p-2 border-t border-white/5 bg-black/20 flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">{selectedLeads.length} selected</span>
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] text-[#c8a84b]" onClick={() => setSelectedLeads([])}>Clear All</Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            {/* Weekly Specific Fields */}
            {modalReportType === 'weekly' && (
              <>
                <div className="space-y-2">
                  <Label className="text-white">Leads Handled</Label>
                  <Input type="number" min={0} value={reportForm.weekly_leads_handled === 0 ? '' : reportForm.weekly_leads_handled} onChange={e => setReportForm({...reportForm, weekly_leads_handled: e.target.value === '' ? 0 : parseInt(e.target.value, 10)})} className="bg-black/40 border-white/10 text-white rounded-xl h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Follow-up Comp %</Label>
                  <Input type="number" min={0} max={100} step="0.1" value={reportForm.weekly_followup_completion_rate === 0 ? '' : reportForm.weekly_followup_completion_rate} onChange={e => setReportForm({...reportForm, weekly_followup_completion_rate: e.target.value === '' ? 0 : parseFloat(e.target.value)})} className="bg-black/40 border-white/10 text-white rounded-xl h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Meetings Arranged</Label>
                  <Input type="number" min={0} value={reportForm.weekly_meetings === 0 ? '' : reportForm.weekly_meetings} onChange={e => setReportForm({...reportForm, weekly_meetings: e.target.value === '' ? 0 : parseInt(e.target.value, 10)})} className="bg-black/40 border-white/10 text-white rounded-xl h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Quotes Submitted</Label>
                  <Input type="number" min={0} value={reportForm.weekly_quotes === 0 ? '' : reportForm.weekly_quotes} onChange={e => setReportForm({...reportForm, weekly_quotes: e.target.value === '' ? 0 : parseInt(e.target.value, 10)})} className="bg-black/40 border-white/10 text-white rounded-xl h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">New Cust Acquired</Label>
                  <Input type="number" min={0} value={reportForm.weekly_acquired === 0 ? '' : reportForm.weekly_acquired} onChange={e => setReportForm({...reportForm, weekly_acquired: e.target.value === '' ? 0 : parseInt(e.target.value, 10)})} className="bg-black/40 border-white/10 text-white rounded-xl h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Revenue Gen (USD)</Label>
                  <Input type="number" min={0} value={reportForm.weekly_revenue === 0 ? '' : reportForm.weekly_revenue} onChange={e => setReportForm({...reportForm, weekly_revenue: e.target.value === '' ? 0 : parseFloat(e.target.value)})} className="bg-black/40 border-white/10 text-white rounded-xl h-10" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="text-white">Target Achieved %</Label>
                  <Input type="number" min={0} step="0.1" value={reportForm.weekly_target_achieved_pct === 0 ? '' : reportForm.weekly_target_achieved_pct} onChange={e => setReportForm({...reportForm, weekly_target_achieved_pct: e.target.value === '' ? 0 : parseFloat(e.target.value)})} className="bg-black/40 border-white/10 text-white rounded-xl h-10" />
                </div>
              </>
            )}

            {/* Monthly Specific Fields */}
            {modalReportType === 'monthly' && (
              <>
                <div className="space-y-2">
                  <Label className="text-white">Sales Value (USD)</Label>
                  <Input type="number" min={0} value={reportForm.monthly_sales_value === 0 ? '' : reportForm.monthly_sales_value} onChange={e => setReportForm({...reportForm, monthly_sales_value: e.target.value === '' ? 0 : parseFloat(e.target.value)})} className="bg-black/40 border-white/10 text-white rounded-xl h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Total Orders</Label>
                  <Input type="number" min={0} value={reportForm.monthly_orders === 0 ? '' : reportForm.monthly_orders} onChange={e => setReportForm({...reportForm, monthly_orders: e.target.value === '' ? 0 : parseInt(e.target.value, 10)})} className="bg-black/40 border-white/10 text-white rounded-xl h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">New Clients Acquired</Label>
                  <Input type="number" min={0} value={reportForm.monthly_new_clients === 0 ? '' : reportForm.monthly_new_clients} onChange={e => setReportForm({...reportForm, monthly_new_clients: e.target.value === '' ? 0 : parseInt(e.target.value, 10)})} className="bg-black/40 border-white/10 text-white rounded-xl h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Repeat Customers</Label>
                  <Input type="number" min={0} value={reportForm.monthly_repeat_customers === 0 ? '' : reportForm.monthly_repeat_customers} onChange={e => setReportForm({...reportForm, monthly_repeat_customers: e.target.value === '' ? 0 : parseInt(e.target.value, 10)})} className="bg-[#1a1a1a] border-white/10 text-white rounded-xl h-10" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="text-white">Top Products (e.g. Clove: 10, Cardamom: 5)</Label>
                  <Input type="text" value={reportForm.monthly_top_products} onChange={e => setReportForm({...reportForm, monthly_top_products: e.target.value})} className="bg-[#1a1a1a] border-white/10 text-white rounded-xl h-10" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="text-white">Country Sales (e.g. USA: 5000, UK: 2000)</Label>
                  <Input type="text" value={reportForm.monthly_country_sales} onChange={e => setReportForm({...reportForm, monthly_country_sales: e.target.value})} className="bg-[#1a1a1a] border-white/10 text-white rounded-xl h-10" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="text-white">Target vs Achievement %</Label>
                  <Input type="number" min={0} step="0.1" value={reportForm.monthly_target_achieved_pct === 0 ? '' : reportForm.monthly_target_achieved_pct} onChange={e => setReportForm({...reportForm, monthly_target_achieved_pct: e.target.value === '' ? 0 : parseFloat(e.target.value)})} className="bg-[#1a1a1a] border-white/10 text-white rounded-xl h-10" />
                </div>
              </>
            )}

            <div className="col-span-2 space-y-2">
              <Label className="text-white">Notes</Label>
              <Textarea value={reportForm.notes} onChange={e => setReportForm({...reportForm, notes: e.target.value})} className="bg-black/40 border-white/10 min-h-[80px] text-white rounded-xl" />
            </div>
            <Button type="submit" className="col-span-2 bg-[#c8a84b] hover:bg-[#a68a3d] text-black font-bold h-12 rounded-xl text-xs uppercase tracking-wider">
              Submit {modalReportType.toUpperCase()} Report
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
