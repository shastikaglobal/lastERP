import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";

export default function ContainerTracking() {
  const { profile } = useAuth();
  const [containers, setContainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.company_id) return;

    const fetchContainers = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: any = { 'Content-Type': 'application/json' };
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

        const [containersRes, shipmentsRes] = await Promise.all([
          fetch(`/api/finance/export_containers?company_id=${profile.company_id}`, { headers }),
          fetch(`/api/finance/export_shipments?company_id=${profile.company_id}`, { headers })
        ]);

        if (!containersRes.ok || !shipmentsRes.ok) {
          throw new Error("Failed to fetch containers or shipments from API");
        }

        const containersData = await containersRes.json();
        const shipmentsData = await shipmentsRes.json();

        const formattedData = (containersData || []).map((c: any) => {
          const shipment = (shipmentsData || []).find((s: any) => s.id === c.shipment_id);
          return {
            dbId: c.id,
            id: c.container_number,
            shipmentId: shipment?.shipment_number || "Unknown",
            type: c.container_type,
            weight: c.weight_kg,
            status: c.status || "Pending",
            location: shipment?.status === "Delivered" 
              ? shipment?.destination_port 
              : shipment?.status === "In Transit" 
                ? "At sea" 
                : shipment?.origin_port || "Unknown Location",
          };
        });

        setContainers(formattedData);
      } catch (err: any) {
        console.error("Containers API load failed, trying Supabase fallback...", err);
        try {
          const { data, error } = await supabase
            .from("export_containers")
            .select(`
              *,
              export_shipments (
                shipment_number,
                origin_port,
                destination_port,
                status
              )
            `)
            .order('created_at', { ascending: false });

          if (error) throw error;

          const formattedData = (data || []).map(c => ({
            dbId: c.id,
            id: c.container_number,
            shipmentId: c.export_shipments?.shipment_number || "Unknown",
            type: c.container_type,
            weight: c.weight_kg,
            status: c.status || "Pending",
            location: c.export_shipments?.status === "Delivered" 
              ? c.export_shipments?.destination_port 
              : c.export_shipments?.status === "In Transit" 
                ? "At sea" 
                : c.export_shipments?.origin_port || "Unknown Location",
          }));

          setContainers(formattedData);
        } catch (supErr: any) {
          console.error("Supabase fallback error:", supErr);
          toast.error("Failed to load containers: " + (supErr.message || supErr));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchContainers();
  }, [profile?.company_id]);

  const updateContainer = async (id: string, field: string, value: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      };
      
      const res = await fetch(`/api/finance/export_containers/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ [field]: value })
      });

      if (!res.ok) {
        // Fallback to direct supabase update
        const { error } = await supabase
          .from("export_containers")
          .update({ [field]: value })
          .eq("id", id);
        if (error) throw error;
      }
      
      toast.success(`Container ${field} updated`);
      setContainers(prev => prev.map(c => c.dbId === id ? { ...c, [field === 'status' ? 'status' : 'weight']: value } : c));
    } catch (err: any) {
      toast.error("Failed to update container: " + (err.message || err));
    }
  };

  return (
    <div>
      <PageHeader 
        title="Container Tracking" 
        description="Live container locations across all shipments" 
        breadcrumbs={[{ label: "Shipments" }, { label: "Containers" }]} 
      />
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <DataTable
          data={containers}
          searchKeys={["id", "shipmentId", "location"]}
          columns={[
            { key: "id", header: "Container", render: (r) => (
              <input 
                type="text" 
                className="font-mono text-xs font-bold w-full bg-transparent border-b border-transparent hover:border-primary focus:border-primary transition-colors outline-none"
                defaultValue={r.id}
                onBlur={(e) => updateContainer(r.dbId, 'container_number', e.target.value)}
                placeholder="Enter #..."
              />
            )},
            { key: "shipment", header: "Shipment", render: (r) => <span className="text-xs text-muted-foreground">{r.shipmentId}</span> },
            { key: "type", header: "Type", render: (r) => r.type },
            { key: "weight", header: "Weight", render: (r) => (
              <div className="flex items-center gap-1">
                <input 
                  type="number" 
                  className="w-16 h-8 bg-transparent border-b border-transparent hover:border-primary focus:border-primary transition-colors px-1 text-xs outline-none"
                  defaultValue={r.weight || ""}
                  onBlur={(e) => updateContainer(r.dbId, 'weight_kg', e.target.value)}
                  placeholder="0"
                />
                <span className="text-[10px] text-muted-foreground">kg</span>
              </div>
            )},
            { key: "loc", header: "Location", render: (r) => <span className="text-xs">{r.location}</span> },
            { key: "status", header: "Status", render: (r) => (
              <Select value={r.status} onValueChange={(val) => updateContainer(r.dbId, 'status', val)}>
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Loaded">Loaded</SelectItem>
                  <SelectItem value="Gate-Out">Gate-Out</SelectItem>
                  <SelectItem value="At Sea">At Sea</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            )},
          ]}
        />
      )}
    </div>
  );
}
