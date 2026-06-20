import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function DeliveryStatus() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShipments = async () => {
    try {
      const { data, error } = await supabase
        .from("export_shipments")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      setShipments(data || []);
    } catch (err: any) {
      toast.error("Failed to load shipments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from("export_shipments").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      
      toast.success(`Shipment updated to ${newStatus}`);
      setShipments(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    } catch (err: any) {
      toast.error("Failed to update status");
    }
  };

  return (
    <div>
      <PageHeader 
        title="Delivery Status" 
        description="End-to-end delivery monitoring" 
        breadcrumbs={[{ label: "Shipments" }, { label: "Delivery" }]} 
      />
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <DataTable
          data={shipments}
          searchKeys={["shipment_number", "destination_port"]}
          columns={[
            { key: "id", header: "Shipment", render: (r) => <span className="font-mono text-xs font-bold">{r.shipment_number}</span> },
            { key: "dest", header: "Destination", render: (r) => r.destination_port },
            { key: "carrier", header: "Carrier", render: (r) => r.carrier },
            { key: "progress", header: "Progress", render: (r) => {
              const pct = r.status === "Delivered" ? 100 : r.status === "In Transit" ? 65 : r.status === "Processing" ? 25 : 5;
              return (
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs tabular-nums">{pct}%</span>
                </div>
              );
            }},
            { key: "status", header: "Status", render: (r) => (
              <div onClick={(e) => e.stopPropagation()}>
                <Select value={r.status || "Pending"} onValueChange={(val) => updateStatus(r.id, val)}>
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Processing">Processing</SelectItem>
                    <SelectItem value="In Transit">In Transit</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )},
            { key: "eta", header: "ETA", render: (r) => <span className="text-xs">{r.eta ? new Date(r.eta).toLocaleDateString() : "TBD"}</span> },
          ]}
        />
      )}
    </div>
  );
}
