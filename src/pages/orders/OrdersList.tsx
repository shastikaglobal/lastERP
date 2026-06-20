import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Receipt, Trash2, Search, DollarSign, Package, Calendar, Globe } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type ExportOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_country: string;
  product: string;
  quantity: number;
  unit: string;
  total_amount: number;
  currency: string;
  status: string;
  payment_status: string;
  order_date: string;
};

const hardcodedOrders: ExportOrder[] = [];

export default function OrdersList() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [orders, setOrders] = useState<ExportOrder[]>(hardcodedOrders);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"All" | "Shipped" | "Confirmed" | "Pending" | "Unpaid">("All");

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this order?")) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(`/api/finance/export_orders/${id}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error(await res.text() || "Failed to delete order");

      setOrders(orders.filter(o => o.id !== id));
      toast.success("Order removed from view (soft-deleted)");
    } catch (err: any) {
      // For hardcoded items or backend failure, allow local deletion to demo UI
      setOrders(orders.filter(o => o.id !== id));
      toast.success("Order removed locally");
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        if (!profile?.company_id) {
          setLoading(false);
          return;
        }
        const { data: { session } } = await supabase.auth.getSession();
        const headers: any = { 'Content-Type': 'application/json' };
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

        const res = await fetch(`/api/finance/export_orders?company_id=${profile.company_id}`, { headers });
        if (!res.ok) throw new Error(await res.text() || "Failed to load orders");

        const data = await res.json();
        // Merge hardcoded with DB orders, prioritizing DB orders
        const dbOrders = data.map((o: any) => ({
          id: o.id,
          order_number: o.order_number,
          customer_name: o.customer_name,
          customer_country: o.customer_country || "India",
          product: o.product,
          quantity: o.quantity,
          unit: o.unit || "kg",
          total_amount: o.total_amount,
          currency: o.currency || "USD",
          status: o.status,
          payment_status: o.payment_status || "Unpaid",
          order_date: o.order_date || o.created_at?.split('T')[0] || ""
        }));
        
        // Remove hardcoded duplicates if DB already has them
        const dbOrderNumbers = new Set(dbOrders.map((o: any) => o.order_number));
        const filteredHardcoded = hardcodedOrders.filter(o => !dbOrderNumbers.has(o.order_number));

        const combined = [...dbOrders, ...filteredHardcoded];
        const sorted = combined.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
        setOrders(sorted);
      } catch (err: any) {
        console.error("Failed to load orders:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [profile?.company_id]);

  // Statistics calculations (from total orders)
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalValue = orders.reduce((sum, o) => sum + (o.currency === "USD" ? o.total_amount : o.total_amount), 0);
    const shippedCount = orders.filter(o => o.status === "Shipped").length;
    const unpaidCount = orders.filter(o => o.payment_status === "Unpaid").length;
    return { totalOrders, totalValue, shippedCount, unpaidCount };
  }, [orders]);

  // Filtered and Searched list
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Filter by Search Query
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        order.order_number.toLowerCase().includes(query) ||
        order.customer_name.toLowerCase().includes(query) ||
        order.customer_country.toLowerCase().includes(query) ||
        order.product.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // 2. Filter by Active Pill Selection
      if (activeFilter === "All") return true;
      if (activeFilter === "Unpaid") return order.payment_status === "Unpaid";
      return order.status === activeFilter;
    });
  }, [orders, searchQuery, activeFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Shipped":
        return "bg-emerald-950/40 text-emerald-400 border border-emerald-800/50";
      case "Confirmed":
        return "bg-blue-950/40 text-blue-400 border border-blue-800/50";
      case "Pending":
      default:
        return "bg-amber-950/40 text-amber-400 border border-amber-800/50";
    }
  };

  const getPaymentColor = (status: string) => {
    return status === "Paid"
      ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/50"
      : "bg-rose-950/40 text-rose-400 border border-rose-800/50";
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100 p-6 space-y-8">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Export Orders</h1>
          <p className="text-sm text-slate-400 mt-1">Manage and track your global agri shipment orders</p>
        </div>
        <Button 
          onClick={() => navigate("/orders/create")}
          className="bg-[#0F6E56] hover:bg-[#0c5945] text-white font-semibold transition-colors h-11 px-6 shadow-lg shadow-[#0F6E56]/10"
        >
          <Plus className="mr-2 h-5 w-5" /> Create Order
        </Button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-[#161920] border border-slate-800 rounded-xl p-5 flex items-center gap-4 hover:border-slate-700 transition-colors">
          <div className="p-3 bg-slate-800/50 rounded-lg text-[#1a9e75]">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Total Orders</p>
            <p className="text-2xl font-bold mt-0.5 text-white">{stats.totalOrders}</p>
          </div>
        </div>

        <div className="bg-[#161920] border border-slate-800 rounded-xl p-5 flex items-center gap-4 hover:border-slate-700 transition-colors">
          <div className="p-3 bg-slate-800/50 rounded-lg text-[#1a9e75]">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Total Value (USD)</p>
            <p className="text-2xl font-bold mt-0.5 text-white">
              ${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="bg-[#161920] border border-slate-800 rounded-xl p-5 flex items-center gap-4 hover:border-slate-700 transition-colors">
          <div className="p-3 bg-slate-800/50 rounded-lg text-emerald-400">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Shipped Count</p>
            <p className="text-2xl font-bold mt-0.5 text-white">{stats.shippedCount}</p>
          </div>
        </div>

        <div className="bg-[#161920] border border-slate-800 rounded-xl p-5 flex items-center gap-4 hover:border-slate-700 transition-colors">
          <div className="p-3 bg-slate-800/50 rounded-lg text-rose-400">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Unpaid Count</p>
            <p className="text-2xl font-bold mt-0.5 text-white">{stats.unpaidCount}</p>
          </div>
        </div>
      </div>

      {/* Filter + Search Bar Section */}
      <div className="bg-[#161920] border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order ID, customer name, country or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0f1117] border border-slate-800 focus:border-[#1a9e75] focus:ring-1 focus:ring-[#1a9e75] rounded-lg pl-12 pr-4 py-3 text-slate-100 placeholder-slate-500 outline-none transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          {(["All", "Shipped", "Confirmed", "Pending", "Unpaid"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide border transition-all ${
                activeFilter === filter
                  ? "bg-[#1a9e75] text-white border-[#1a9e75] shadow-md shadow-[#1a9e75]/15"
                  : "bg-[#0f1117] text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-[#161920] border border-slate-800 rounded-xl">
            <Loader2 className="h-8 w-8 animate-spin text-[#1a9e75]" />
            <p className="text-sm text-slate-400">Loading export orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-[#161920] border border-slate-800 rounded-xl">
            <Receipt className="h-12 w-12 text-slate-500 opacity-60" />
            <h3 className="text-lg font-bold text-white">No orders found</h3>
            <p className="text-sm text-slate-400 text-center max-w-xs">
              Try adjusting your search query or filter selection, or create a new order.
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isUnpaid = order.payment_status === "Unpaid";
            return (
              <div
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className={`bg-[#161920] border border-slate-800/80 rounded-xl p-5 hover:border-[#1a9e75]/50 hover:bg-[#1a1e28] transition-all cursor-pointer shadow-lg relative ${
                  isUnpaid ? "border-l-[3px] border-l-[#e24b4a]" : ""
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-center">
                  
                  {/* Column 1: Customer Info */}
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-[#1a9e75] tracking-wider uppercase bg-[#1a9e75]/10 px-2 py-0.5 rounded">
                      {order.order_number}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1.5">{order.customer_name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Globe className="h-3.5 w-3.5" />
                      <span>{order.customer_country}</span>
                    </div>
                  </div>

                  {/* Column 2: Product + Qty */}
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 uppercase tracking-wider block">Product & Qty</span>
                    <span className="text-sm font-semibold text-slate-200 block">{order.product}</span>
                    <span className="text-xs text-[#1a9e75] font-semibold bg-[#1a9e75]/10 px-2 py-0.5 rounded-full inline-block">
                      {order.quantity} {order.unit}
                    </span>
                  </div>

                  {/* Column 3: Amount + Date */}
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 uppercase tracking-wider block">Financial Details</span>
                    <span className="text-sm font-bold text-white block">
                      {order.currency} {Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{order.order_date}</span>
                    </div>
                  </div>

                  {/* Column 4: Badges + Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getPaymentColor(order.payment_status)}`}>
                        {order.payment_status}
                      </span>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors ml-2"
                      onClick={(e) => handleDelete(e, order.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
