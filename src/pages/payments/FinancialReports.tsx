import { useState } from "react";
import { Download, FileBarChart, Loader2, CheckCircle2, Zap, Eye, X, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/shared/FormShell";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataTable } from "@/components/shared/DataTable";

const reports = [
  { name: "Profit & Loss Statement", desc: "Monthly P&L with year-over-year comparison", live: true, icon: <TrendingUp className="h-6 w-6" /> },
  { name: "Balance Sheet", desc: "Assets, liabilities and equity snapshot", live: true, icon: <FileBarChart className="h-6 w-6" /> },
  { name: "Cash Flow Statement", desc: "Operating, investing and financing activities", live: true, icon: <DollarSign className="h-6 w-6" /> },
  { name: "Accounts Receivable Aging", desc: "Outstanding invoices by age bucket", live: true, icon: <Calendar className="h-6 w-6" /> },
];

export default function FinancialReports() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ name: string; data: any[]; total: number; columns: any[] } | null>(null);

  const handleGenerate = async (name: string, isLive: boolean) => {
    setGenerating(name);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (isLive) {
        if (name === "Accounts Receivable Aging") {
          const { data: { session: __session_5 } } = await supabase.auth.getSession();
          const arRes = await fetch(`/api/finance/reports/ar_aging`, {
            headers: { 'Authorization': `Bearer ${__session_5?.access_token}` }
          });
          const data = arRes.ok ? await arRes.json() : [];
          
          const formatted = (data || []).map(o => ({
            ref: o.order_number,
            party: o.customer?.name,
            amount: o.amount,
            currency: o.currency,
            date: o.delivery_date
          }));

          setPreviewData({
            name,
            data: formatted,
            total: formatted.reduce((sum, item) => sum + Number(item.amount), 0),
            columns: [
              { key: "ref", header: "Order #" },
              { key: "party", header: "Customer" },
              { key: "date", header: "Due Date" },
              { key: "amount", header: "Amount", render: (r: any) => `${r.currency} ${Number(r.amount).toLocaleString()}` }
            ]
          });
        } else if (name === "Profit & Loss Statement") {
          const { data: { session: __session_6 } } = await supabase.auth.getSession();
          const pRes = await fetch('/api/finance/payments?status=Completed', {
            headers: { 'Authorization': `Bearer ${__session_6?.access_token}` }
          });
          const revenue = pRes.ok ? await pRes.json() : [];

          const poRes1 = await fetch('/api/finance/purchase_orders?status=approved', {
            headers: { 'Authorization': `Bearer ${__session_6?.access_token}` }
          });
          const poRes2 = await fetch('/api/finance/purchase_orders?status=received', {
            headers: { 'Authorization': `Bearer ${__session_6?.access_token}` }
          });
          const expenses = [...(poRes1.ok ? await poRes1.json() : []), ...(poRes2.ok ? await poRes2.json() : [])];
          
          const revFormatted = (revenue || []).map(p => ({
            ref: p.payment_number,
            type: "Revenue",
            amount: p.amount,
            currency: p.currency,
            date: p.received_at
          }));

          const expFormatted = (expenses || []).map(e => ({
            ref: e.po_number,
            type: "Expense (PO)",
            amount: -Number(e.total),
            currency: e.currency,
            date: e.order_date
          }));

          const combined = [...revFormatted, ...expFormatted].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          setPreviewData({
            name,
            data: combined,
            total: combined.reduce((sum, item) => sum + Number(item.amount), 0),
            columns: [
              { key: "date", header: "Date", render: (r: any) => new Date(r.date).toLocaleDateString() },
              { key: "ref", header: "Reference" },
              { key: "type", header: "Type" },
              { key: "amount", header: "Amount", render: (r: any) => (
                <span className={Number(r.amount) >= 0 ? 'text-green-400' : 'text-red-400'}>
                  ₹{Math.abs(Number(r.amount)).toLocaleString()}
                </span>
              )}
            ]
          });
        } else if (name === "Balance Sheet") {
          const { data: { session: __session_7 } } = await supabase.auth.getSession();
          
          const payRes = await fetch('/api/finance/payments?status=Completed', { headers: { 'Authorization': `Bearer ${__session_7?.access_token}` } });
          const payments = payRes.ok ? await payRes.json() : [];
          
          const invRes = await fetch('/api/inventory/inventory_batches', { headers: { 'Authorization': `Bearer ${__session_7?.access_token}` } });
          const inventory = invRes.ok ? await invRes.json() : [];
          
          const soRes = await fetch('/api/finance/sales_orders?status=Pending', { headers: { 'Authorization': `Bearer ${__session_7?.access_token}` } });
          const receivables = soRes.ok ? await soRes.json() : [];
          
          const poRes1 = await fetch('/api/finance/purchase_orders?status=approved', { headers: { 'Authorization': `Bearer ${__session_7?.access_token}` } });
          const poRes2 = await fetch('/api/finance/purchase_orders?status=received', { headers: { 'Authorization': `Bearer ${__session_7?.access_token}` } });
          const payables = [...(poRes1.ok ? await poRes1.json() : []), ...(poRes2.ok ? await poRes2.json() : [])];

          const cashTotal = (payments || []).reduce((s, p) => s + Number(p.amount), 0);
          const inventoryVal = (inventory || []).reduce((s, i) => s + (Number(i.quantity_remaining_kg) * (Number(i.cost_per_kg) || 50)), 0); 
          const arTotal = (receivables || []).reduce((s, r) => s + Number(r.amount), 0);
          const apTotal = (payables || []).reduce((s, p) => s + Number(p.total), 0);

          const bsData = [
            { type: "Asset", category: "Cash & Equivalents", amount: cashTotal },
            { type: "Asset", category: "Inventory Value (Est.)", amount: inventoryVal },
            { type: "Asset", category: "Accounts Receivable", amount: arTotal },
            { type: "Liability", category: "Accounts Payable", amount: apTotal },
          ];

          setPreviewData({
            name,
            data: bsData,
            total: cashTotal + inventoryVal + arTotal - apTotal,
            columns: [
              { key: "type", header: "Type" },
              { key: "category", header: "Category" },
              { key: "amount", header: "Amount", render: (r: any) => `₹${Number(r.amount).toLocaleString()}` }
            ]
          });
        } else if (name === "Cash Flow Statement") {
          const { data: { session: __session_8 } } = await supabase.auth.getSession();
          const cfRes = await fetch(`/api/finance/reports/cash_flow`, {
            headers: { 'Authorization': `Bearer ${__session_8?.access_token}` }
          });
          const { inflow = [], outflow = [] } = cfRes.ok ? await cfRes.json() : {};

          const cashIn = (inflow || []).map(i => ({
            ref: i.payment_number,
            party: i.customer?.name || "Customer",
            type: "Inflow",
            amount: i.amount,
            currency: i.currency,
            date: i.received_at
          }));

          const cashOut = (outflow || []).map(o => ({
            ref: o.po_number,
            party: o.farmer?.full_name || "Supplier",
            type: "Outflow",
            amount: -Number(o.total),
            currency: o.currency,
            date: o.order_date
          }));

          const combined = [...cashIn, ...cashOut].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          setPreviewData({
            name,
            data: combined,
            total: combined.reduce((sum, item) => sum + Number(item.amount), 0),
            columns: [
              { key: "date", header: "Date", render: (r: any) => new Date(r.date).toLocaleDateString() },
              { key: "ref", header: "Reference" },
              { key: "party", header: "Entity" },
              { key: "type", header: "Type", render: (r: any) => (
                <span className={r.type === 'Inflow' ? 'text-green-400' : 'text-red-400'}>{r.type}</span>
              )},
              { key: "amount", header: "Amount", render: (r: any) => `₹${Math.abs(Number(r.amount)).toLocaleString()}` }
            ]
          });
        }
      } else {
        toast.info(`${name} template generated (Demo data)`);
      }
    } catch (err: any) {
      toast.error(`Failed to generate ${name}: ${err.message}`);
    } finally {
      setGenerating(null);
    }
  };

  const downloadCSV = () => {
    if (!previewData) return;
    const csvContent = "data:text/csv;charset=utf-8," + 
      previewData.columns.map(c => c.header).join(",") + "\n" +
      previewData.data.map(row => previewData.columns.map(c => row[c.key]).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${previewData.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6">
      <PageHeader title="Financial Reports" description="Generate professional statements from live business data" breadcrumbs={[{ label: "Payments" }, { label: "Reports" }]} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {reports.map((r) => (
          <Section key={r.name} className="erp-card group hover:border-primary/30 transition-all">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 group-hover:scale-110 transition-transform">
                {r.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-bold text-base text-white group-hover:text-primary transition-colors">{r.name}</div>
                  {r.live && (
                    <div className="flex items-center gap-1 bg-green-500/10 text-green-500 text-[9px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded border border-green-500/20">
                      <Zap className="h-2 w-2 fill-current" /> Live
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.desc}</div>
                
                <Button 
                  onClick={() => handleGenerate(r.name, r.live)}
                  disabled={generating === r.name}
                  className="mt-4 btn-gold w-full sm:w-auto"
                >
                  {generating === r.name ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      View Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Section>
        ))}
      </div>

      <Dialog open={!!previewData} onOpenChange={(open) => !open && setPreviewData(null)}>
        <DialogContent className="erp-card border-white/10 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-white/10 pb-4 mb-6">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <span className="w-1.5 h-8 bg-primary rounded-full" />
              {previewData?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Total Amount</div>
              <div className="text-2xl font-bold text-gradient-gold">₹{previewData?.total?.toLocaleString()}</div>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Record Count</div>
              <div className="text-2xl font-bold text-white">{previewData?.data?.length}</div>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Report Date</div>
              <div className="text-2xl font-bold text-white">{new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 overflow-hidden bg-black/20">
            <DataTable 
              data={previewData?.data || []}
              columns={previewData?.columns || []}
              searchKeys={["ref", "party"]}
            />
          </div>

          <DialogFooter className="mt-8 pt-4 border-t border-white/10 gap-2">
            <Button variant="outline" onClick={() => setPreviewData(null)} className="border-white/10">Close</Button>
            <Button className="btn-gold" onClick={downloadCSV}>
              <Download className="mr-2 h-4 w-4" /> Export to CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
