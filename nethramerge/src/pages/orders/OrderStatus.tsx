import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Clock, Truck, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-blue-500",
  processing: "bg-orange-500",
  shipped: "bg-purple-500",
  delivered: "bg-green-500",
  cancelled: "bg-red-500",
};

export default function OrderStatus() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getCount = (statuses: string[]) => {
    return orders.filter(o => statuses.includes(o.status)).length;
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: any = { 'Content-Type': 'application/json' };
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

        const res = await fetch('/api/finance/export_orders', { headers });
        if (!res.ok) throw new Error(await res.text() || "Failed to load orders");

        const data = await res.json();
        const sorted = data.sort((a: any, b: any) => new Date(b.created_at || b.order_date).getTime() - new Date(a.created_at || a.order_date).getTime());
        setOrders(sorted || []);
      } catch (err: any) {
        toast.error("Failed to load order statuses");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(`/api/finance/export_orders/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error(await res.text() || "Update failed");

      toast.success(`Order marked as ${newStatus}`);
      setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
    } catch (err: any) {
      toast.error("Failed to update order status");
    }
  };



  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Order Status Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{orders.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{getCount(['pending'])}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Processing / Confirmed</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{getCount(['processing', 'confirmed'])}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Shipped</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{getCount(['shipped'])}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t">
        {['pending', 'confirmed', 'shipped'].map(status => {
          const groupOrders = orders.filter(o => o.status === status || (status === 'confirmed' && o.status === 'processing'));
          return (
            <div key={status} className="space-y-4">
              <h2 className="font-semibold text-lg capitalize flex items-center gap-2">
                {status === 'confirmed' ? 'Processing / Confirmed' : status} <Badge variant="secondary">{groupOrders.length}</Badge>
              </h2>
              {groupOrders.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">No orders {status}</div>
              ) : (
                groupOrders.map(order => (
                  <Card key={order.id} className="shadow-sm border-l-4" style={{borderLeftColor: `var(--${(STATUS_COLORS[order.status?.toLowerCase()] || 'bg-gray-500').split('-')[1]}-500)`}}>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-bold">{order.order_number}</CardTitle>
                        <Badge className={`text-[10px] text-white ${STATUS_COLORS[order.status?.toLowerCase()] || 'bg-gray-500'}`}>{order.status || 'Unknown'}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-sm space-y-3">
                      <div>
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-muted-foreground">{order.product} ({order.quantity} {order.unit})</p>
                      </div>
                      
                      {order.status === 'pending' && (
                        <Button 
                          size="sm" 
                          className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
                          onClick={() => updateStatus(order.id, 'confirmed')}
                        >
                          Confirm & Send to Fulfillment
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
