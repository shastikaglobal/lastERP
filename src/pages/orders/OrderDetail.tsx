import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { Loader2, ArrowLeft, Building2, MapPin, Package, Mail, Calendar, DollarSign, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-blue-500",
  processing: "bg-orange-500",
  shipped: "bg-purple-500",
  delivered: "bg-green-500",
  cancelled: "bg-red-500",
};

const PAYMENT_COLORS: Record<string, string> = {
  unpaid: "bg-red-500",
  partial: "bg-yellow-500",
  paid: "bg-green-500",
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: any = { 'Content-Type': 'application/json' };
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

        const res = await fetch(`/api/finance/export_orders?id=${id}`, { headers });
        if (!res.ok) throw new Error(await res.text() || "Failed to load order");
        
        const data = await res.json();
        if (data.length === 0) throw new Error("Order not found");
        setOrder(data[0]);
      } catch (err: any) {
        toast.error("Failed to load order");
        navigate("/orders");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchOrder();
  }, [id, navigate]);

  const updateStatus = async (field: 'status' | 'payment_status', value: string) => {
    setSavingStatus(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(`/api/finance/export_orders/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ [field]: value })
      });
      if (!res.ok) throw new Error(await res.text() || "Update failed");

      setOrder({ ...order, [field]: value });
      toast.success("Order updated");
    } catch (err: any) {
      toast.error("Update failed");
    } finally {
      setSavingStatus(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!order) return null;

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Order ${order.order_number}`}
        description={`Placed on ${format(new Date(order.order_date), "PPP")}`}
        breadcrumbs={[{ label: "Orders", to: "/orders" }, { label: order.order_number }]}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate("/orders")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/10">
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2"><Package className="h-4 w-4" /> Product</p>
                <p className="font-semibold text-lg">{order.product}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Quantity</p>
                <p className="font-semibold text-lg">{order.quantity} {order.unit}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Unit Price</p>
                <p className="font-medium">{order.currency} {Number(order.unit_price).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                <p className="font-bold text-xl text-primary">{order.currency} {Number(order.total_amount).toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-lg border-b pb-2">Customer Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex gap-3 items-start">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Customer</p>
                    <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{order.customer_email || "N/A"}</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{order.customer_country}</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start col-span-2">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Shipping Address</p>
                    <p className="text-sm text-muted-foreground">{order.shipping_address || "Not provided"}</p>
                  </div>
                </div>
              </div>
            </div>

            {order.payment_terms && (
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-2 text-primary flex items-center gap-2"><DollarSign className="h-4 w-4" /> Terms of Payment</h3>
                <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">{order.payment_terms}</p>
              </div>
            )}

            {order.notes && (
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-2 flex items-center gap-2"><Edit3 className="h-4 w-4 text-muted-foreground" /> Internal Notes</h3>
                <p className="text-sm bg-muted p-3 rounded-md">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Order Status</Label>
                  <Badge className={`capitalize text-white ${STATUS_COLORS[order.status]}`}>{order.status}</Badge>
                </div>
                <Select value={order.status} onValueChange={(v) => updateStatus('status', v)} disabled={savingStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label>Payment Status</Label>
                  <Badge className={`capitalize text-white ${PAYMENT_COLORS[order.payment_status]}`}>{order.payment_status}</Badge>
                </div>
                <Select value={order.payment_status} onValueChange={(v) => updateStatus('payment_status', v)} disabled={savingStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(PAYMENT_COLORS).map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logistics Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 items-center">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Expected Delivery</p>
                  <p className="text-sm text-muted-foreground">
                    {order.expected_delivery ? format(new Date(order.expected_delivery), "PPP") : "Not scheduled"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
