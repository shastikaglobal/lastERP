import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProformaInvoice } from "@/components/documents/ProformaInvoice";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InvoiceReport() {
  const { id } = useParams();
  const nav = useNavigate();
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let { data, error } = await supabase
          .from("export_shipments")
          .select("*, export_orders(*)")
          .eq("id", id)
          .maybeSingle();

        if (error || !data) {
          // If not found in shipments, try export_orders directly
          const { data: orderOnly, error: orderErr } = await supabase
            .from("export_orders")
            .select("*, export_shipments(*)")
            .eq("id", id)
            .maybeSingle();
            
          if (orderErr || !orderOnly) {
            // Try fetching from Node API
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/invoices/${id}`, {
              headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            if (!res.ok) throw new Error('Invoice not found');
            const apiData = await res.json();
            data = {
              export_orders: {
                id: apiData.id,
                order_number: apiData.invoice_number || 'INV-' + apiData.id.slice(0, 4),
                customer_name: apiData.customer,
                currency: apiData.currency,
                total_amount: apiData.amount,
                status: apiData.status,
                created_at: apiData.created_at,
                product: apiData.items?.[0]?.description || 'Custom Order',
                quantity: apiData.items?.[0]?.quantity || 1,
                unit_price: apiData.items?.[0]?.unit_price || apiData.amount,
              }
            };
          } else {
            data = { export_orders: orderOnly };
          }
        }
        setShipment(data);
      } catch (err) {
        console.error("Report load error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );

  if (!shipment) return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <p>Invoice not found</p>
      <Button onClick={() => nav("/documents/invoices")}><ArrowLeft className="h-4 w-4 mr-2" /> Back to Invoices</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <ProformaInvoice shipment={shipment} onClose={() => nav("/documents/invoices")} />
    </div>
  );
}