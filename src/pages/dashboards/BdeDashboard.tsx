import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Section } from "@/components/shared/FormShell";
import { DollarSign, FileText, ClipboardList, TrendingUp, Users, Plus, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function BdeDashboard() {
  const { profile } = useAuth();
  const nav = useNavigate();

  // --- Query 1: CRM Leads ---
  const { data: leads = [] } = useQuery({
    queryKey: ['bde_leads', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .or(`company_id.eq.${profile.company_id},company_id.is.null`);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.company_id
  });

  // --- Query 2: Quotations ---
  const { data: quotations = [] } = useQuery({
    queryKey: ['bde_quotations', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/quotations', {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch quotations");
        const data = await res.json();
        return data || [];
      } catch (error) {
        console.error('Error fetching quotations:', error);
        return [];
      }
    },
    enabled: !!profile?.company_id
  });

  // --- Query 3: Documentation (Export Orders / Invoices) ---
  const { data: orders = [] } = useQuery({
    queryKey: ['bde_orders', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from('export_orders')
        .select('*')
        .or(`company_id.eq.${profile.company_id},company_id.is.null`);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.company_id
  });

  // Calculations
  const totalLeads = leads.length;
  const wonLeads = leads.filter(l => l.stage === 'won').length;
  const activeLeads = leads.filter(l => l.stage !== 'won' && l.stage !== 'lost').length;
  const leadConversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(0) : '0';

  const totalQuotes = quotations.length;
  const pendingQuotes = quotations.filter(q => q.status === 'Draft' || q.status === 'Sent').length;
  const approvedQuotes = quotations.filter(q => q.status === 'Approved').length;

  const totalInvoices = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Development Dashboard"
        description="Monitor leads, manage quotations, and verify export documentation"
        breadcrumbs={[{ label: "Dashboards" }, { label: "BDE" }]}
      />

      {/* Welcome Hero */}
      <div className="glass-panel p-6 lg:p-8 relative overflow-hidden animate-fade-in" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-glow/20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Welcome back, <span className="text-gradient-gold">BD Executive</span></h2>
            <p className="text-muted-foreground mt-1">Here is the latest status of your leads and export documentation.</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => nav("/crm/leads")}
              className="bg-primary hover:bg-primary/95 text-white shadow-gold text-sm transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4 mr-1.5" /> New CRM Lead
            </Button>
          </div>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
        <StatCard label="Total CRM Leads" value={totalLeads.toString()} delta={{ value: `${activeLeads} active`, positive: true }} hint="Total pipeline leads" icon={<Users className="h-4 w-4" />} />
        <StatCard label="Active Quotations" value={totalQuotes.toString()} delta={{ value: `${pendingQuotes} pending`, positive: true }} hint="Quotations generated" icon={<ClipboardList className="h-4 w-4" />} />
        <StatCard label="Commercial Invoices" value={totalInvoices.toString()} delta={{ value: `$${(totalRevenue / 1000).toFixed(1)}K Value`, positive: true }} hint="Invoices generated" icon={<FileText className="h-4 w-4" />} />
        <StatCard label="CRM Win Rate" value={`${leadConversionRate}%`} delta={{ value: `${wonLeads} deals won`, positive: true }} hint="Lead conversion rate" icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      {/* 4 Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
        
        {/* SECTION 1: CRM & Pipeline */}
        <Section title="CRM & Pipeline" description="Manage active leads and prospects">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/50 p-2.5 rounded-lg">
                <div className="text-lg font-bold text-foreground">{totalLeads - wonLeads - activeLeads}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold">Lost/Closed</div>
              </div>
              <div className="bg-blue-500/10 p-2.5 rounded-lg border border-blue-500/20">
                <div className="text-lg font-bold text-blue-500">{activeLeads}</div>
                <div className="text-[10px] text-blue-500 uppercase font-bold">In Negotiation</div>
              </div>
              <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                <div className="text-lg font-bold text-emerald-500">{wonLeads}</div>
                <div className="text-[10px] text-emerald-500 uppercase font-bold">Won / Converted</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent CRM Leads</h4>
              {leads.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">No leads found</p>
              ) : (
                leads.slice(0, 3).map((lead: any) => (
                  <div key={lead.id} className="flex justify-between items-center p-2 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors" onClick={() => nav(`/crm/leads/${lead.id}`)}>
                    <div>
                      <div className="text-xs font-bold text-foreground">{lead.company_name}</div>
                      <div className="text-[10px] text-muted-foreground">{lead.interested_product || 'General inquiry'}</div>
                    </div>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold uppercase">{lead.stage}</span>
                  </div>
                ))
              )}
            </div>

            <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => nav("/crm/leads")}>
              Go to CRM Pipeline
            </Button>
          </div>
        </Section>

        {/* SECTION 2: Quotation Management */}
        <Section title="Quotation Management" description="Track offer sheets and price proposals">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-border p-3 rounded-lg bg-card">
                <div className="text-[10px] text-muted-foreground uppercase font-bold">Draft / Sent</div>
                <div className="text-xl font-bold text-foreground mt-1">{pendingQuotes}</div>
              </div>
              <div className="border border-border p-3 rounded-lg bg-card">
                <div className="text-[10px] text-muted-foreground uppercase font-bold">Approved by Admin</div>
                <div className="text-xl font-bold text-primary mt-1">{approvedQuotes}</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Quotations</h4>
              {quotations.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">No quotations found</p>
              ) : (
                quotations.slice(0, 3).map((q: any) => (
                  <div key={q.id} className="flex justify-between items-center p-2 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors" onClick={() => nav(`/quotations/${q.id}`)}>
                    <div>
                      <div className="text-xs font-bold text-foreground">Quote #{q.quote_number || q.id.slice(0,8)}</div>
                      <div className="text-[10px] text-muted-foreground">Status: {q.status}</div>
                    </div>
                    <span className="text-xs font-bold text-foreground">{q.currency || 'USD'} {q.total_amount?.toLocaleString() || '0'}</span>
                  </div>
                ))
              )}
            </div>

            <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => nav("/quotations")}>
              Go to Quotations List
            </Button>
          </div>
        </Section>

        {/* SECTION 3: Export Documentation */}
        <Section title="Export Documentation" description="Monitor commercial invoices and certificates of origin">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 bg-muted/40 p-3 rounded-lg border">
                <div className="text-[10px] text-muted-foreground uppercase font-bold">Commercial Invoices</div>
                <div className="text-xl font-bold mt-1 text-foreground">{totalInvoices}</div>
              </div>
              <div className="flex-1 bg-muted/40 p-3 rounded-lg border">
                <div className="text-[10px] text-muted-foreground uppercase font-bold">Certificates of Origin</div>
                <div className="text-xl font-bold mt-1 text-foreground">{totalInvoices}</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Invoices</h4>
              {orders.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">No invoices found</p>
              ) : (
                orders.slice(0, 3).map((o: any) => (
                  <div key={o.id} className="flex justify-between items-center p-2 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <div>
                        <div className="text-xs font-bold text-foreground">{o.order_number?.replace('EXP', 'PI')}</div>
                        <div className="text-[10px] text-muted-foreground">{o.customer_name}</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-foreground">{o.currency} {o.total_amount?.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => nav("/documents/invoices")}>
                View Invoices
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => nav("/documents/certificates")}>
                View Certificates
              </Button>
            </div>
          </div>
        </Section>

        {/* SECTION 4: Quick Actions & Integrations */}
        <Section title="Quick Actions & Integrations" description="BDE shortcuts and productivity features">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="h-20 flex flex-col justify-center items-center gap-1.5" onClick={() => nav("/quotations/create")}>
                <Plus className="h-5 w-5 text-primary" />
                <span className="text-xs font-bold">New Quotation</span>
              </Button>
              <Button size="sm" variant="outline" className="h-20 flex flex-col justify-center items-center gap-1.5" onClick={() => nav("/crm/leads")}>
                <Users className="h-5 w-5 text-blue-500" />
                <span className="text-xs font-bold">Add Lead</span>
              </Button>
              <Button size="sm" variant="outline" className="h-20 flex flex-col justify-center items-center gap-1.5" onClick={() => nav("/system/integrations/zoho")}>
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                <span className="text-xs font-bold">Sync Zoho CRM</span>
              </Button>
              <Button size="sm" variant="outline" className="h-20 flex flex-col justify-center items-center gap-1.5" onClick={() => nav("/documents/certificates")}>
                <Award className="h-5 w-5 text-yellow-500" />
                <span className="text-xs font-bold">Certificates</span>
              </Button>
            </div>

            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
              <p className="text-xs text-muted-foreground italic text-center">
                Need help? Contact the IT administrator or your team leader for system authorizations.
              </p>
            </div>
          </div>
        </Section>

      </div>
    </div>
  );
}
