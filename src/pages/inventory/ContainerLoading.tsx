import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2, Container as ContainerIcon, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useCan } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function ContainerLoading() {
  const nav = useNavigate();
  const can = useCan();
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["wh_export_containers_loading"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("export_containers")
        .select(`
          id,
          container_number,
          container_type,
          weight_kg,
          status,
          created_at,
          export_shipments (
            shipment_number,
            origin_port,
            destination_port
          )
        `)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      
      // Transform data for the table
      return (data || []).map((container: any) => ({
        id: container.id,
        container_number: container.container_number,
        type: container.container_type,
        weight: container.weight_kg,
        status: container.status || "Pending",
        shipment: container.export_shipments?.shipment_number || "Unassigned",
        origin: container.export_shipments?.origin_port || "Unknown",
        destination: container.export_shipments?.destination_port || "Unknown",
      }));
    },
  });

  const markAsLoaded = async (id: string, containerNumber: string) => {
    // This function is kept for backward-compat but will open the confirmation
    // dialog instead of using the blocking `confirm()` browser dialog.
    setPending({ id, containerNumber });
    setDialogOpen(true);
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState<{ id: string; containerNumber: string } | null>(null);

  const handleConfirmMark = async () => {
    if (!pending) return;
    const { id, containerNumber } = pending;
    setDialogOpen(false);
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from("export_containers")
        .update({ status: "Loaded" })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Container ${containerNumber} marked as loaded`);
      queryClient.invalidateQueries({ queryKey: ["wh_export_containers_loading"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update container status");
    } finally {
      setUpdatingId(null);
      setPending(null);
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Container Loading"
        description="Manage and track container loading operations at the warehouse."
        breadcrumbs={[{ label: "Warehouse" }, { label: "Container Loading" }]}
        actions={
          can("shipments.manage") && (
            <Button size="sm" className="btn-gold" onClick={() => nav("/shipments/create")}>
              <Plus className="h-4 w-4 mr-1.5" /> Plan Loading
            </Button>
          )
        }
      />
      
      {isLoading ? (
        <div className="erp-card flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<ContainerIcon className="h-8 w-8" />}
          title="No containers found"
          description="There are currently no containers scheduled for loading."
          action={
            can("shipments.manage") && (
              <Button size="sm" onClick={() => nav("/shipments/create")}>
                <Plus className="h-4 w-4 mr-1.5" /> Plan Loading
              </Button>
            )
          }
        />
      ) : (
        <DataTable
          data={data}
          searchKeys={["container_number", "shipment"]}
          columns={[
            { key: "container_number", header: "Container Number", render: (r: any) => <span className="font-mono font-bold text-white">{r.container_number}</span> },
            { key: "shipment", header: "Shipment Ref", render: (r: any) => <span className="text-muted-foreground text-sm">{r.shipment}</span> },
            { key: "type", header: "Type", render: (r: any) => <span className="text-sm font-medium">{r.type}</span> },
            { key: "route", header: "Route", render: (r: any) => <span className="text-xs text-muted-foreground">{r.origin} → {r.destination}</span> },
            { key: "weight", header: "Weight", render: (r: any) => <span className="tabular-nums font-medium text-white">{Number(r.weight).toLocaleString()} kg</span> },
            { key: "status", header: "Status", render: (r: any) => <StatusBadge status={r.status} /> },
            { 
              key: "actions", 
              header: "", 
              render: (r: any) => (
                <div className="flex justify-end">
                  {can("shipments.manage") && r.status !== "Loaded" && r.status !== "Shipped" && r.status !== "Delivered" && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 border-green-500/20 text-green-500 hover:bg-green-500/10 hover:text-green-400"
                      onClick={() => markAsLoaded(r.id, r.container_number)}
                      disabled={updatingId === r.id}
                    >
                      {updatingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                      Mark Loaded
                    </Button>
                  )}
                </div>
              ) 
            },
          ]}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Confirm Mark Loaded</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm">Are you sure you want to mark container <span className="font-mono font-bold">{pending?.containerNumber}</span> as <span className="font-semibold">Loaded</span>?</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setPending(null); }} className="mr-2">Cancel</Button>
            <Button onClick={handleConfirmMark} disabled={!pending || !!updatingId}>{updatingId ? 'Updating...' : 'Confirm'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
