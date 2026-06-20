import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Truck, Package, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

export default function Fulfillment() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shippingIds, setShippingIds] = useState<string[]>([]);

  const fetchFulfillments = async () => {
    try {
      if (!profile?.company_id) return;
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(`/api/finance/export_orders?company_id=${profile.company_id}`, { headers });
      if (!res.ok) throw new Error(await res.text() || "Failed to load fulfillments");

      const data = await res.json();
      const pendingFulfillments = data.filter((o: any) => 
        ["confirmed", "processing", "pending", "Pending"].includes(o.status)
      );
      const sorted = pendingFulfillments.sort((a: any, b: any) => new Date(b.created_at || b.order_date).getTime() - new Date(a.created_at || a.order_date).getTime());
      setOrders(sorted || []);
    } catch (err: any) {
      toast.error("Failed to load fulfillments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFulfillments();
  }, [profile?.company_id]);

  const markShipped = async (id: string) => {
    setShippingIds(prev => [...prev, id]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(`/api/finance/export_orders/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: 'shipped' })
      });
      if (!res.ok) throw new Error(await res.text() || "Failed to update status");

      toast.success("Order marked as shipped!");
      setOrders(orders.filter(o => o.id !== id));
    } catch (err: any) {
      toast.error("Failed to update status");
    } finally {
      setShippingIds(prev => prev.filter(sId => sId !== id));
    }
  };

  if (loading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fulfillment Queue</h1>
        <p className="text-sm text-muted-foreground">Orders confirmed and awaiting dispatch</p>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg">
          <Truck className="h-12 w-12 text-muted-foreground opacity-30 mb-4" />
          <h2 className="text-xl font-medium">All caught up!</h2>
          <p className="text-muted-foreground mt-1">No orders currently pending fulfillment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map(order => (
            <Card key={order.id} className="flex flex-col">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{order.order_number}</CardTitle>
                    <p className="text-sm font-medium text-muted-foreground mt-1">{order.customer_name}</p>
                  </div>
                  <Badge variant={order.status === 'processing' ? 'default' : 'secondary'} className="capitalize">
                    {order.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1 space-y-4">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{order.product}</p>
                    <p className="text-sm text-muted-foreground">{order.quantity} {order.unit}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Target Delivery</p>
                    <p className={`text-sm ${new Date(order.expected_delivery) < new Date() ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                      {order.expected_delivery ? format(new Date(order.expected_delivery), "PPP") : "Not specified"}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t bg-muted/10">
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700" 
                  onClick={() => markShipped(order.id)}
                  disabled={shippingIds.includes(order.id)}
                >
                  {shippingIds.includes(order.id) ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Mark as Shipped
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
