import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Section } from "@/components/shared/FormShell";
import { Wallet } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function FinancialOverview() {
  const { data: exportOrders = [] } = useQuery({
    queryKey: ['financial_export_orders'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/finance/export_orders', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) return [];
      return await res.json();
    }
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['financial_purchase_orders'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/finance/purchase_orders', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) return [];
      return await res.json();
    }
  });

  // Calculations
  const receivables = exportOrders
    .filter((o: any) => o.payment_status === 'unpaid' || o.payment_status === 'pending')
    .reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0);

  const payables = purchaseOrders
    .filter((po: any) => po.payment_status === 'unpaid' || po.payment_status === 'pending')
    .reduce((sum: number, po: any) => sum + (Number(po.total_amount || po.total) || 0), 0);

  const cashIn = exportOrders
    .filter((o: any) => o.payment_status === 'paid')
    .reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0);

  const cashOut = purchaseOrders
    .filter((po: any) => po.payment_status === 'paid')
    .reduce((sum: number, po: any) => sum + (Number(po.total_amount || po.total) || 0), 0);

  const cashOnHand = cashIn - cashOut;

  // Chart data (Revenue by month)
  const chartSales = (() => {
    const monthlyData: Record<string, { month: string; revenue: number }> = {};
    exportOrders.forEach((o: any) => {
      const date = new Date(o.created_at || o.order_date || Date.now());
      const monthKey = date.toLocaleString('default', { month: 'short' });
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { month: monthKey, revenue: 0 };
      monthlyData[monthKey].revenue += Number(o.total_amount) || 0;
    });
    return Object.values(monthlyData).slice(-6);
  })();

  return (
    <div>
      <PageHeader title="Financial Overview" description="Cash position, receivables and currency exposure" breadcrumbs={[{ label: "Dashboards" }, { label: "Financial" }]} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Receivables" value={`$${(receivables/1000).toFixed(1)}K`} delta={{ value: "Live", positive: true }} hint="from VPS" />
        <StatCard label="Payables" value={`$${(payables/1000).toFixed(1)}K`} delta={{ value: "Live", positive: false }} hint="from VPS" />
        <StatCard label="Cash on Hand" value={`$${(cashOnHand/1000).toFixed(1)}K`} delta={{ value: "Live", positive: cashOnHand >= 0 }} hint="from VPS" />
        <StatCard label="Overdue" value="$0K" delta={{ value: "Pending Logic", positive: false }} />
      </div>
      <Section title="Cash Flow">
        <div className="h-72 flex items-center justify-center">
          {chartSales.length === 0 ? (
            <div className="text-center">
              <Wallet className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-20" />
              <p className="text-xs text-muted-foreground italic">No cash flow data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartSales}>
                <defs>
                  <linearGradient id="cf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--chart-2))" fill="url(#cf)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Section>
    </div>
  );
}
