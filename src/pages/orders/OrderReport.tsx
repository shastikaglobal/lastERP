import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { OrderDocument } from "@/components/orders/OrderDocument";
import { Loader2 } from "lucide-react";

export default function OrderReport() {
  const { id } = useParams();
  const nav = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
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
        console.error("Order Report load error:", err);
        setError(err.message || "Failed to load order");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-[#1A5276]" />
    </div>
  );

  if (error || !order) return (
    <div className="p-10 bg-white min-h-screen font-sans text-red-600">
      <h2 className="text-2xl font-bold">Failed to load Order Report.</h2>
      <p className="mt-2 text-gray-600">{error}</p>
      <button onClick={() => nav("/orders")} className="mt-4 px-4 py-2 bg-gray-100 rounded text-black">Back to Orders</button>
    </div>
  );

  return (
    <OrderDocument 
      order={order} 
      onClose={() => nav(`/orders/${id}`)} 
    />
  );
}
