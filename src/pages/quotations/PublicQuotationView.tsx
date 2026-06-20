import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, Printer, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";

export default function PublicQuotationView() {
  const { id } = useParams();

  const { data: q, isLoading } = useQuery({
    queryKey: ['public_quotation', id],
    queryFn: async () => {
      // NOTE: For public pages, we use the local API endpoint that does not require auth.
      // Make sure the Express server is handling CORS properly for public routes if accessed from a different origin.
      const apiBase = window.location.origin.includes('localhost') ? 'http://localhost:8082' : ''; // Or just relative if proxied
      const res = await fetch(`/api/quotations/public/${id}`);
      if (!res.ok) {
        throw new Error("Failed to load quotation");
      }
      const data = await res.json();
      
      return {
        ...data,
        customer: data.customers, // Map backend 'customers' to frontend 'customer'
        items: data.items
      };
    },
    enabled: !!id
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  if (!q) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Quotation Not Found</h1>
          <p className="text-muted-foreground mt-2">This link may have expired or is incorrect.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 print:bg-white print:py-0">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Customer Actions (Hidden on Print) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 glass-panel border-primary/20 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">Official Quotation</p>
              <p className="text-xs text-muted-foreground">Valid until {new Date(q.valid_until).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
            <Button className="btn-gold" size="sm">
              <Download className="h-4 w-4 mr-2" /> Download PDF
            </Button>
          </div>
        </div>

        {/* The Document */}
        <Card className="border-none shadow-2xl shadow-slate-200/50 print:shadow-none">
          <CardContent className="p-8 sm:p-12 space-y-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold text-2xl">S</div>
                   <h1 className="text-2xl font-black tracking-tight uppercase">Shastika Global</h1>
                </div>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  <p>123 Marine Drive, Mumbai 400001, India</p>
                  <p>Phone: +91 98765 43210</p>
                  <p>Email: exports@shastikaglobal.com</p>
                  <p>Website: www.shastikaglobal.com</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-4xl font-black text-slate-900 mb-2">QUOTATION</h2>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Number:</span> <span className="font-mono font-bold">{q.quotation_number}</span></p>
                  <p><span className="text-muted-foreground">Date:</span> <span className="font-bold">{new Date(q.created_at).toLocaleDateString()}</span></p>
                  <p><span className="text-muted-foreground">Status:</span> <StatusBadge status={q.status} /></p>
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="grid grid-cols-2 gap-12 pt-8 border-t border-slate-100">
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Quote To</h3>
                <div className="space-y-1">
                  <p className="font-bold text-lg">{q.customer?.name}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{q.customer?.address || '—'}</p>
                  <p className="text-sm text-muted-foreground">{q.customer?.email || '—'}</p>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Shipping Terms</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Incoterm:</span> <span className="font-bold text-slate-700">CIF</span>
                  <span className="text-muted-foreground">Container:</span> <span className="font-bold text-slate-700">{q.container_type || '—'}</span>
                  <span className="text-muted-foreground">Packaging:</span> <span className="font-bold text-slate-700">{q.packaging_type || '—'}</span>
                  <span className="text-muted-foreground">Currency:</span> <span className="font-bold text-slate-700">{q.currency}</span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="pt-4 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-900">
                    <th className="text-left py-4 px-0 font-black uppercase text-[11px] tracking-widest w-12 text-center">#</th>
                    <th className="text-left py-4 px-0 font-black uppercase text-[11px] tracking-widest">Description</th>
                    <th className="text-right py-4 px-4 font-black uppercase text-[11px] tracking-widest w-24">Qty</th>
                    <th className="text-right py-4 px-4 font-black uppercase text-[11px] tracking-widest w-32">Unit Price</th>
                    <th className="text-right py-4 px-0 font-black uppercase text-[11px] tracking-widest w-32">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(q.items || []).map((item: any, i: number) => (
                    <tr key={item.id}>
                      <td className="py-6 px-0 text-center font-bold text-slate-400">{String.fromCharCode(65 + i)}</td>
                      <td className="py-6 px-0">
                        <p className="font-bold text-slate-900">{item.product?.name || 'Custom Product'}</p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-1 uppercase">{item.product?.sku || 'GENERIC'}</p>
                      </td>
                      <td className="text-right py-6 px-4 tabular-nums text-slate-700">{item.quantity.toLocaleString()} {item.unit || 'KG'}</td>
                      <td className="text-right py-6 px-4 tabular-nums text-slate-700">{q.currency} {item.unit_price.toLocaleString()}</td>
                      <td className="text-right py-6 px-0 tabular-nums font-bold text-slate-900">{q.currency} {item.total_price.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex flex-col md:flex-row justify-between gap-12 pt-8 border-t-2 border-slate-100">
              <div className="flex-1 space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Payment Terms</h3>
                <p className="text-xs text-muted-foreground leading-relaxed italic whitespace-pre-wrap">
                  {q.payment_terms || "Standard terms apply."}
                </p>
              </div>
              <div className="w-full md:w-64 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums font-medium text-slate-700">{q.currency} {q.subtotal?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({q.tax_rate}%)</span>
                  <span className="tabular-nums font-medium text-slate-700">{q.currency} {q.tax_amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-4 border-t-2 border-slate-900">
                  <span className="font-black text-slate-900">GRAND TOTAL</span>
                  <span className="text-xl font-black text-primary tabular-nums">{q.currency} {q.amount?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-24 flex flex-col items-center justify-center text-center space-y-4">
               <div className="w-16 h-1 bg-primary/20 rounded-full" />
               <p className="text-xs text-muted-foreground max-w-md">
                 This is a computer generated document. For any inquiries, please contact Shastika Global within 7 days of receiving this quotation.
               </p>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                 Powered by Shastika ERP
               </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
