import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  DollarSign, BookOpen, AlertCircle, FileSpreadsheet, 
  ArrowRight, FilePlus, Receipt, FileText, BarChart3, Plus 
} from "lucide-react";
import Approvals from "@/pages/Approvals";

export default function FinanceTallyDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  // --- Query 1: Total Invoiced (SUM from export_orders) ---
  const { data: totalInvoiced = 0 } = useQuery({
    queryKey: ['exec_total_invoiced', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return 0;
      const { data, error } = await supabase
        .from('export_orders')
        .select('total_amount')
        .eq('company_id', profile.company_id);
      if (error) throw error;
      return (data || []).reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
    },
    enabled: !!profile?.company_id
  });

  // --- Query 2: Total Received (SUM from payments where status = 'Received' or 'Completed') ---
  const { data: totalReceived = 0 } = useQuery({
    queryKey: ['exec_total_received', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return 0;
      const { data, error } = await supabase
        .from('payments')
        .select('amount')
        .eq('company_id', profile.company_id)
        .in('status', ['Received', 'Completed', 'paid', 'Paid']);
      if (error) throw error;
      return (data || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    },
    enabled: !!profile?.company_id
  });

  // --- Query 3: Total Pending (SUM from payments where status = 'Pending' or 'Unpaid') ---
  const { data: totalPending = 0 } = useQuery({
    queryKey: ['exec_total_pending', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return 0;
      const { data, error } = await supabase
        .from('payments')
        .select('amount')
        .eq('company_id', profile.company_id)
        .in('status', ['Pending', 'Unpaid', 'unpaid']);
      if (error) throw error;
      return (data || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    },
    enabled: !!profile?.company_id
  });

  // --- Query 4: Journal Entries Count ---
  const { data: journalCount = 0 } = useQuery({
    queryKey: ['exec_journal_count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('journal_entries')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    }
  });

  // --- Query 5: Recent Transactions (last 5 payments) ---
  const { data: recentPayments = [] } = useQuery({
    queryKey: ['exec_recent_payments', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.company_id
  });

  // --- Query 6: Recent Journal Entries (last 5) ---
  const { data: recentJournals = [] } = useQuery({
    queryKey: ['exec_recent_journals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    }
  });

  // --- Generate CSV Report Helper ---
  const handleGenerateReport = () => {
    const rows = [
      ["Finance & Tally Dashboard Summary Report", new Date().toLocaleDateString()],
      ["", ""],
      ["Metric", "Value (INR)"],
      ["Total Invoiced", totalInvoiced.toLocaleString('en-IN')],
      ["Total Received", totalReceived.toLocaleString('en-IN')],
      ["Total Pending", totalPending.toLocaleString('en-IN')],
      ["Journal Entries Count", journalCount.toString()],
      ["", ""],
      ["Recent Transactions", ""],
      ["Date", "Party Name", "Amount", "Currency", "Method", "Status"],
      ...recentPayments.map(p => [
        p.received_at ? format(new Date(p.received_at), 'yyyy-MM-dd') : p.created_at ? format(new Date(p.created_at), 'yyyy-MM-dd') : '—',
        p.payer_name || '—',
        p.amount || 0,
        p.currency || 'USD',
        p.method || '—',
        p.status || '—'
      ]),
      ["", ""],
      ["Recent Journal Entries", ""],
      ["Date", "Voucher/Entry No", "Description/Narration", "Debit (INR)", "Credit (INR)"],
      ...recentJournals.map(j => [
        j.date || '—',
        j.voucher_no || j.entry_no || '—',
        j.narration || j.description || '—',
        j.total_debit || j.amount || 0,
        j.total_credit || j.amount || 0
      ])
    ];
    const csv = "data:text/csv;charset=utf-8," + rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `finance_tally_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Finance & Tally report downloaded successfully");
  };

  const quickActions = [
    {
      title: "New Invoice",
      description: "Draft and dispatch commercial client invoices",
      actionText: "Create Invoice",
      url: "/documents/invoices",
      icon: <FilePlus className="h-5 w-5" />
    },
    {
      title: "Add Payment",
      description: "Record bank receipts and cash collections",
      actionText: "Add Payment",
      url: "/payments",
      icon: <Receipt className="h-5 w-5" />
    },
    {
      title: "Journal Entry",
      description: "Log double-entry vouchers to General Ledger",
      actionText: "Make Entry",
      url: "/journal",
      icon: <FileText className="h-5 w-5" />
    },
    {
      title: "GST Report",
      description: "View taxable supplies and GSTR worksheets",
      actionText: "View GST",
      url: "/tally/gst-reports",
      icon: <BarChart3 className="h-5 w-5" />
    }
  ];

  return (
    <div className="space-y-6 bg-[#0f0f0f] min-h-screen text-white pb-12">
      <PageHeader
        title="Finance & Tally Dashboard"
        description="Financial overview and accounting summary"
        breadcrumbs={[{ label: "Dashboards" }, { label: "Finance & Tally" }]}
        actions={
          <Button
            onClick={handleGenerateReport}
            className="btn-gold shadow-gold gap-1.5 text-sm transition-transform hover:-translate-y-0.5"
          >
            Generate Report
          </Button>
        }
      />

      {/* Welcome Hero Banner */}
      <div className="glass-panel p-6 lg:p-8 relative overflow-hidden animate-fade-in" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-glow/20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Welcome back, <span className="text-gradient-gold">Secretary</span></h2>
            <p className="text-muted-foreground mt-1">Here is your financial summary for today.</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
        <StatCard 
          label="TOTAL INVOICED" 
          value={totalInvoiced ? `₹${totalInvoiced.toLocaleString('en-IN')}` : "₹0"} 
          delta={{ value: "Invoices", positive: true }} 
          hint="Total order billing" 
          icon={<FileSpreadsheet className="h-4 w-4 text-[#f0a500]" />} 
        />
        <StatCard 
          label="TOTAL RECEIVED" 
          value={totalReceived ? `₹${totalReceived.toLocaleString('en-IN')}` : "₹0"} 
          delta={{ value: "Received", positive: true }} 
          hint="Completed payments" 
          icon={<DollarSign className="h-4 w-4 text-[#f0a500]" />} 
        />
        <StatCard 
          label="TOTAL PENDING" 
          value={totalPending ? `₹${totalPending.toLocaleString('en-IN')}` : "₹0"} 
          delta={{ value: "Pending", positive: false }} 
          hint="Unpaid receivables" 
          icon={<AlertCircle className="h-4 w-4 text-[#f0a500]" />} 
        />
        <StatCard 
          label="JOURNAL ENTRIES" 
          value={journalCount.toString()} 
          delta={{ value: "Vouchers", positive: true }} 
          hint="Total journal count" 
          icon={<BookOpen className="h-4 w-4 text-[#f0a500]" />} 
        />
      </div>
      <Approvals />

      {/* Quick Actions */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <span className="w-1.5 h-5 bg-[#f0a500] rounded-full" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((act) => (
            <div key={act.title} className="erp-card erp-card-hover p-5 relative overflow-hidden group flex flex-col justify-between min-h-[180px]">
              <div className="absolute -inset-1 bg-gradient-to-br from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
              <div className="relative z-10">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary-glow w-fit group-hover:scale-105 group-hover:bg-primary/20 transition-all duration-300 mb-3">
                  {act.icon}
                </div>
                <h3 className="font-bold text-foreground text-sm">{act.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4 leading-relaxed">{act.description}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs group/btn relative z-10 border-primary/20 hover:border-primary/50 text-[#f0a500] hover:text-[#ffc53d] hover:bg-primary/5"
                onClick={() => navigate(act.url)}
              >
                {act.actionText}
                <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1 text-[#f0a500]" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Tables section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
        {/* RECENT TRANSACTIONS */}
        <div className="erp-card p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-foreground text-base">Recent Transactions</h3>
              <p className="text-xs text-muted-foreground">Latest incoming and pending payments</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[#f0a500] hover:text-[#ffc53d] hover:bg-transparent gap-1 text-xs" 
              onClick={() => navigate('/payments')}
            >
              View All <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="pb-3 pt-1">Date</th>
                  <th className="pb-3 pt-1">Party</th>
                  <th className="pb-3 pt-1">Amount</th>
                  <th className="pb-3 pt-1">Method</th>
                  <th className="pb-3 pt-1">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground italic">No recent transactions</td>
                  </tr>
                ) : (
                  recentPayments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3 font-mono text-xs text-muted-foreground">
                        {p.received_at ? format(new Date(p.received_at), 'yyyy-MM-dd') : p.created_at ? format(new Date(p.created_at), 'yyyy-MM-dd') : '—'}
                      </td>
                      <td className="py-3 font-medium text-foreground group-hover:text-[#f0a500] transition-colors">{p.payer_name || '—'}</td>
                      <td className="py-3 font-bold tabular-nums text-white">
                        {p.currency || 'USD'} {Number(p.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">{p.method || '—'}</td>
                      <td className="py-3">
                        <StatusBadge 
                          status={p.status || 'Pending'} 
                          tone={
                            (p.status || '').toLowerCase() === 'received' || (p.status || '').toLowerCase() === 'completed' || (p.status || '').toLowerCase() === 'paid'
                              ? 'success' 
                              : undefined
                          } 
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RECENT JOURNAL ENTRIES */}
        <div className="erp-card p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-foreground text-base">Recent Journal Entries</h3>
              <p className="text-xs text-muted-foreground">Latest transactions posted to Tally ledger</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[#f0a500] hover:text-[#ffc53d] hover:bg-transparent gap-1 text-xs" 
              onClick={() => navigate('/journal')}
            >
              View All <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="pb-3 pt-1">Date</th>
                  <th className="pb-3 pt-1">Entry No</th>
                  <th className="pb-3 pt-1">Description</th>
                  <th className="pb-3 pt-1 text-right">Debit</th>
                  <th className="pb-3 pt-1 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {recentJournals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground italic">No recent journal entries</td>
                  </tr>
                ) : (
                  recentJournals.map((j: any) => (
                    <tr key={j.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3 font-mono text-xs text-muted-foreground">{j.date || '—'}</td>
                      <td className="py-3 font-mono text-xs text-primary font-bold group-hover:text-[#ffc53d] transition-colors">{j.voucher_no || j.entry_no || '—'}</td>
                      <td className="py-3 text-xs text-muted-foreground max-w-[150px] truncate" title={j.narration || j.description || ''}>
                        {j.narration || j.description || '—'}
                      </td>
                      <td className="py-3 font-mono text-xs text-[#ff6b6b] text-right">
                        {j.total_debit || j.amount ? `₹${Number(j.total_debit || j.amount).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-3 font-mono text-xs text-[#4ade80] text-right">
                        {j.total_credit || j.amount ? `₹${Number(j.total_credit || j.amount).toLocaleString('en-IN')}` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
