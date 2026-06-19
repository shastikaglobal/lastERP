import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Package, Printer, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type POItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  products: { name: string, unit: string };
};

type PurchaseOrder = {
  id: string;
  po_number: string;
  status: string;
  order_date: string;
  total: number;
  currency: string;
  notes: string;
  farmer: { full_name: string };
};

export default function PurchaseOrderDetailLive() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [items, setItems] = useState<POItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`/api/purchase_orders/${id}`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (!res.ok) throw new Error("Failed to load order details");
        const po = await res.json();

        setOrder(po);
        setItems(po.items || []);
      } catch (err: any) {
        toast.error("Failed to load order details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!order) return <div className="p-8 text-center">Order not found</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/procurement/orders")} className="rounded-full hover:bg-white/5 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">{order.po_number}</h1>
            <p className="text-sm text-muted-foreground mt-1">Status: <span className="uppercase font-bold text-primary">{order.status}</span></p>
          </div>
        </div>
        <Button variant="outline" className="gap-2 border-white/10 hover:bg-white/5" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print PO
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="erp-card">
          <CardHeader className="pb-2 border-b border-white/5">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
              <User className="h-3 w-3" /> Supplier
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-lg font-semibold text-white">{order.farmer?.full_name}</p>
          </CardContent>
        </Card>

        <Card className="erp-card">
          <CardHeader className="pb-2 border-b border-white/5">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
              <Calendar className="h-3 w-3" /> Order Date
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-lg font-semibold text-white">{format(new Date(order.order_date), "MMMM d, yyyy")}</p>
          </CardContent>
        </Card>

        <Card className="erp-card">
          <CardHeader className="pb-2 border-b border-white/5">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
              <Package className="h-3 w-3" /> Total Items
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-lg font-semibold text-white">{items.length} Products</p>
          </CardContent>
        </Card>
      </div>

      <Card className="erp-card overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-white/2">
          <CardTitle className="text-lg font-semibold">Order Manifest</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="py-4 pl-6 text-xs uppercase font-bold">Product</TableHead>
                <TableHead className="py-4 text-xs uppercase font-bold">Quantity</TableHead>
                <TableHead className="py-4 text-xs uppercase font-bold text-right">Unit Price</TableHead>
                <TableHead className="py-4 pr-6 text-xs uppercase font-bold text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <TableCell className="pl-6 py-4 font-medium text-white">{item.products?.name}</TableCell>
                  <TableCell className="py-4">{item.quantity} {item.products?.unit}</TableCell>
                  <TableCell className="py-4 text-right font-mono">{order.currency} {item.unit_price.toLocaleString()}</TableCell>
                  <TableCell className="pr-6 py-4 text-right font-mono font-bold text-white">
                    {order.currency} {item.line_total?.toLocaleString() || (item.quantity * item.unit_price).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {order.notes && (
        <Card className="erp-card">
          <CardHeader className="pb-2 border-b border-white/5">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Notes</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end p-6 bg-black/20 rounded-xl border border-white/5">
        <div className="text-right space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Grand Total</p>
          <p className="text-4xl font-bold text-gradient-gold font-mono">{order.currency} {order.total.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}