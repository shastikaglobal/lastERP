import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Section } from "@/components/shared/FormShell";
import { BarChart3, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { format, parse, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";

export default function SalesAnalytics() {
  const { profile } = useAuth();

  // Query 1: Leads from CRM
  const { data: leads = [] } = useQuery({
    queryKey: ['sales_analytics_leads', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('id, company_name, country, assigned_to, stage, created_at, status')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching leads:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!profile?.company_id,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000
  });

  // Query 2: Export Orders (From VPS backend)
  const { data: orders = [] } = useQuery({
    queryKey: ['sales_analytics_orders', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`/api/finance/export_orders?company_id=${profile.company_id}`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch export orders from VPS");
        const data = await res.json();
        return data || [];
      } catch (error) {
        console.error('Error fetching orders from VPS:', error);
        return [];
      }
    },
    enabled: !!profile?.company_id,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000
  });

  // Query 3: Quotations
  const { data: quotations = [] } = useQuery({
    queryKey: ['sales_analytics_quotations', profile?.company_id],
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
    enabled: !!profile?.company_id,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000
  });

  // Calculations
  const chartSales = (() => {
    const monthlyData: Record<string, { month: string; orders: number; revenue: number }> = {};
    
    orders.forEach(order => {
      const date = new Date(order.created_at || order.order_date || Date.now());
      const monthKey = format(date, 'MMM');
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, orders: 0, revenue: 0 };
      }
      monthlyData[monthKey].orders += 1;
      monthlyData[monthKey].revenue += Number(order.total_amount) || 0;
    });

    return Object.values(monthlyData).slice(-6);
  })();

  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  
  const totalLeads = leads.length;
  const wonLeads = leads.filter(l => l.stage === 'closed_won').length;
  const lostLeads = leads.filter(l => l.stage === 'closed_lost').length;
  
  const conversionRate = totalLeads > 0 ? (orders.length / totalLeads) * 100 : 0;
  
  const closedLeads = wonLeads;
  const winRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

  const totalOrders = orders.length;
  const totalOrderAmount = totalRevenue;
  const avgDealSize = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const isLive = profile?.company_id ? true : false;

  return (
    <div>
      <PageHeader title="Sales Analytics" description="Pipeline, conversion and revenue trends" breadcrumbs={[{ label: "Dashboards" }, { label: "Sales" }]} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pipeline Value" value={isLive ? `$${(totalRevenue/1000).toFixed(0)}K` : "—"} delta={{ value: isLive ? "Live" : "No Data", positive: isLive }} hint="from database" />
        <StatCard label="Conversion Rate" value={isLive ? `${conversionRate.toFixed(1)}%` : "—"} delta={{ value: isLive ? "Live" : "No Data", positive: isLive }} hint="leads → orders" />
        <StatCard label="Avg Deal Size" value={isLive ? `$${(avgDealSize/1000).toFixed(1)}K` : "—"} delta={{ value: isLive ? "Live" : "No Data", positive: isLive }} hint="from database" />
        <StatCard label="Win Rate" value={isLive ? `${winRate.toFixed(1)}%` : "—"} delta={{ value: isLive ? "Live" : "No Data", positive: isLive }} hint="from database" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Orders per Month">
          <div className="h-64 flex items-center justify-center">
            {chartSales.length === 0 ? (
              <div className="text-center">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-20" />
                <p className="text-xs text-muted-foreground italic">No sales orders found</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartSales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="orders" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Section>
        <Section title="Revenue Growth">
          <div className="h-64 flex items-center justify-center">
            {chartSales.length === 0 ? (
              <div className="text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-20" />
                <p className="text-xs text-muted-foreground italic">No revenue growth data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartSales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
