import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Receipt, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type PurchaseOrder = {
  id: string;
  po_number: string;
  farmer_id: string;
  status: string;
  order_date: string;
  total: number;
  currency: string;
  farmers?: { full_name: string };
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500 hover:bg-gray-600 text-white",
  approved: "bg-blue-500 hover:bg-blue-600 text-white",
  sent: "bg-blue-500 hover:bg-blue-600 text-white",
  confirmed: "bg-green-500 hover:bg-green-600 text-white",
  received: "bg-purple-500 hover:bg-purple-600 text-white",
  cancelled: "bg-red-500 hover:bg-red-600 text-white",
};

export default function PurchaseOrdersListLive() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`/api/purchase_orders`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch purchase orders");
        const poData = await res.json();
        setOrders(poData as PurchaseOrder[]);
      } catch (err: any) {
        toast.error(err.message || "Failed to fetch purchase orders");
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete this purchase order? This will hide the order from the app, but keep it in the database.")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/purchase_orders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to delete purchase order");

      setOrders(orders.filter(o => o.id !== id));
      toast.success("Purchase order hidden from the app");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">Manage your procurement orders from suppliers</p>
        </div>
        <Button onClick={() => navigate("/procurement/orders/create")}>
          <Plus className="mr-2 h-4 w-4" /> Create PO
        </Button>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Loading orders...</p>
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                  <p className="text-muted-foreground">No purchase orders found.</p>
                  <Button variant="link" onClick={() => navigate("/procurement/orders/create")}>
                    Create your first PO
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium text-primary">{po.po_number}</TableCell>
                  <TableCell>{po.farmers?.full_name || "Unknown Supplier"}</TableCell>
                  <TableCell>{format(new Date(po.order_date), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <Badge className={`capitalize ${STATUS_COLORS[po.status] || "bg-gray-500"}`}>
                      {po.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {po.currency} {Number(po.total)?.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right flex justify-end gap-2">
                    {po.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary/10 h-8 px-2 text-xs"
                        onClick={() => navigate(`/warehouse/receiving?po_id=${po.id}`)}
                      >
                        Receive
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-primary hover:bg-white/5"
                      onClick={() => navigate(`/procurement/orders/edit/${po.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDelete(e, po.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}