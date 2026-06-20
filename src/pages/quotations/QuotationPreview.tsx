import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Download, Edit, Send, Mail, Loader2, Copy, FileText, Printer, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/shared/FormShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { softDeleteRecord } from "@/lib/softDelete";
import { exportQuotationsToPDF } from "@/lib/quotation-export";

export default function QuotationPreview() {
  const { id } = useParams();
  const nav = useNavigate();
  const queryClient = useQueryClient();

  const { data: q, isLoading, refetch } = useQuery({
    queryKey: ['quotation', id],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const qRes = await fetch(`/api/quotations/${id}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!qRes.ok) throw new Error("Failed to load quotation");
      const quotation = await qRes.json();

      const itemsRes = await fetch(`/api/quotations/${id}/items`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!itemsRes.ok) throw new Error("Failed to load quotation items");
      const items = await itemsRes.json();

      return {
        ...quotation,
        customer: quotation.customers, // Map the API 'customers' property to 'customer' for frontend compatibility
        items
      };
    },
    enabled: !!id
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/quotations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ quotation: { status: "Pending" } })
      });
      if (!res.ok) throw new Error("Failed to update status");
    },
    onSuccess: () => {
      toast.success("Quotation sent for approval");
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send quotation");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/quotations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (!res.ok) throw new Error("Failed to delete quotation");
    },
    onSuccess: () => {
      toast.success("Quotation archived successfully");
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      nav("/quotations");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to archive quotation");
    }
  });

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete quotation ${q?.quotation_number}? This action cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/share/quote/${id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Public share link copied to clipboard!");
  };

  const handleEmail = () => {
    const shareUrl = `${window.location.origin}/share/quote/${id}`;
    const subject = encodeURIComponent(`Quotation ${q.quotation_number} from Shastika Global`);
    const body = encodeURIComponent(`Dear ${q.customer?.name || 'Customer'},\n\nPlease find our quotation ${q.quotation_number} at the link below:\n\n${shareUrl}\n\nBest regards,\nShastika Global Team`);
    window.location.href = `mailto:${q.customer?.email || ''}?subject=${subject}&body=${body}`;
  };

  const handleExport = () => {
    try {
      const formatted = {
        ...q,
        customer_name: q.customer?.name || q.customer_name || "Unknown"
      };
      exportQuotationsToPDF([formatted], false);
      toast.success("PDF file downloaded");
    } catch (err) {
      toast.error("Failed to generate PDF");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  if (!q) return <div className="p-12 text-center text-muted-foreground">Quotation not found.</div>;

  return (
    <div>
      <PageHeader 
        title={q.quotation_number} 
        description="Quotation detail & sharing" 
        breadcrumbs={[{ label: "Quotations", to: "/quotations" }, { label: q.quotation_number }]}
        actions={<>
          <Button variant="outline" size="sm" onClick={() => nav(-1)}><ArrowLeft className="h-4 w-4 mr-1.5" />Back</Button>
          <Button variant="outline" size="sm" onClick={() => nav(`/quotations/edit/${id}`)}><Edit className="h-4 w-4 mr-1.5" />Edit</Button>
          <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 border-destructive/30" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}Delete
          </Button>
          <Button variant="outline" size="sm" onClick={() => nav(`/quotations/${id}/report`)} className="bg-[#1A5276]/10 text-[#1A5276] border-[#1A5276]/20"><Printer className="h-4 w-4 mr-1.5" />Print Report</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1.5" />PDF</Button>
          <Button variant="outline" size="sm" onClick={handleShare}><Copy className="h-4 w-4 mr-1.5" />Share Link</Button>
          <Button variant="outline" size="sm" onClick={handleEmail}><Mail className="h-4 w-4 mr-1.5" />Email</Button>
          <Button 
            size="sm" 
            className="btn-gold" 
            onClick={() => sendMutation.mutate()} 
            disabled={sendMutation.isPending || q.status !== 'Draft'}
          >
            {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
            {q.status === 'Draft' ? 'Send for Approval' : 'Sent'}
          </Button>
        </>}
      />
      <Section>
        <div className="max-w-4xl mx-auto space-y-8 bg-card p-10 rounded-2xl border shadow-lg relative overflow-hidden">
          {/* Watermark/Decorative element */}
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <FileText className="h-64 w-64 rotate-12" />
          </div>

          <div className="flex items-start justify-between pb-8 border-b border-border">
            <div>
              <div className="text-4xl font-black tracking-tighter text-primary mb-1">QUOTATION</div>
              <div className="text-sm font-mono text-muted-foreground tracking-widest">{q.quotation_number}</div>
            </div>
            <div className="text-right">
              <StatusBadge status={q.status} />
              <div className="text-xs text-muted-foreground mt-2">Date: {new Date(q.created_at).toLocaleDateString()}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-16 py-8">
            <div>
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Exporter</div>
              <div className="font-bold text-lg">Shastika Global Exports</div>
              <div className="text-sm text-muted-foreground mt-3 leading-relaxed">
                123 Marine Drive<br />
                Mumbai 400001, India<br />
                GST: 27ABCDE1234F1Z5
              </div>
            </div>
            <div>
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Consignee / Bill To</div>
              <div className="font-bold text-lg">{q.customer?.name || q.customer_name || 'Customer Name'}</div>
              <div className="text-sm text-muted-foreground mt-3 space-y-2 leading-relaxed">
                <p>{q.customer?.address || q.customer_address || 'Address not provided'}</p>
                {(q.customer_phone || q.customer?.phone) && (
                  <p className="text-xs font-semibold">Phone: {q.customer_phone || q.customer?.phone}</p>
                )}
                <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block uppercase tracking-tighter font-bold">Valid until</span>
                    <span className="font-medium">{q.valid_until ? new Date(q.valid_until).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase tracking-tighter font-bold">Incoterm</span>
                    <span className="font-medium">{q.incoterm || '---'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase tracking-tighter font-bold">Packaging Type</span>
                    <span className="font-medium">{q.packaging_type || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase tracking-tighter font-bold">Shipment Type</span>
                    <span className="font-medium">{q.shipment_type || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-6 py-4 font-bold text-xs uppercase tracking-wider">Description</th>
                  <th className="text-right px-6 py-4 font-bold text-xs uppercase tracking-wider w-24">Qty</th>
                  <th className="text-right px-6 py-4 font-bold text-xs uppercase tracking-wider w-32">Unit Price</th>
                  <th className="text-right px-6 py-4 font-bold text-xs uppercase tracking-wider w-32">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(q.items || []).map((item: any, i: number) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-5">
                      <p className="font-bold text-base">{item.product?.name || 'Custom Item'}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-1 uppercase tracking-tight">{item.product?.sku || 'GENERIC-SKU'}</p>
                    </td>
                    <td className="text-right px-6 py-5 tabular-nums text-muted-foreground font-medium">{item.quantity.toLocaleString()} {item.product?.unit || 'kg'}</td>
                    <td className="text-right px-6 py-5 tabular-nums text-muted-foreground">{q.currency} {Number(item.unit_price).toLocaleString()}</td>
                    <td className="text-right px-6 py-5 tabular-nums font-bold text-primary">{q.currency} {Number(item.total_price).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col md:flex-row justify-between gap-12 pt-8 border-t border-border">
            <div className="flex-1 space-y-4">
              <div>
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Terms of Payment</h4>
                <p className="text-xs text-muted-foreground leading-relaxed italic whitespace-pre-wrap bg-muted/30 p-4 rounded-lg border border-dashed border-border">
                  {q.payment_terms || "Standard terms apply. 100% advance or LC at sight."}
                </p>
              </div>
            </div>
            <div className="w-full md:w-72 space-y-3">
              <div className="flex justify-between text-sm px-2">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums font-medium">{q.currency} {Number(q.subtotal || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm px-2">
                <span className="text-muted-foreground">Packaging Cost</span>
                <span className="tabular-nums font-medium">{q.currency} {Number(q.packaging_cost || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm px-2">
                <span className="text-muted-foreground">Shipment Cost</span>
                <span className="tabular-nums font-medium">{q.currency} {Number(q.shipping_cost || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm px-2">
                <span className="text-muted-foreground">Tax ({q.tax_rate || 0}%)</span>
                <span className="tabular-nums font-medium">{q.currency} {Number(q.tax_amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-4 rounded-xl bg-primary text-primary-foreground font-bold text-xl shadow-lg shadow-primary/20">
                <span>Total</span>
                <span className="tabular-nums">{q.currency} {Number(q.amount || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital Document Verified · Shastika Secure</div>
            </div>
            
            {q.status === "Approved" ? (
              <Button className="btn-gold shadow-gold/20" onClick={() => nav("/quotations/convert")}>
                Convert to Order <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : q.status === "Pending" ? (
              <div className="flex items-center gap-2 text-amber-600 font-bold text-sm bg-amber-50 px-4 py-2 rounded-full border border-amber-100">
                <Loader2 className="h-4 w-4 animate-spin" />
                Awaiting Approval
              </div>
            ) : q.status === "Converted" ? (
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                ✓ Converted to Order
              </div>
            ) : null}
          </div>
        </div>
      </Section>
    </div>
  );
}
