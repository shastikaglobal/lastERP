import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2, Package, Trash2, Edit } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ExportShipment = {
  id: string;
  shipment_number: string;
  customer_name: string;
  carrier: string;
  origin_port: string;
  destination_port: string;
  eta: string;
  status: string;
  containerCount?: number;
};

export default function ShipmentsList() {
  const nav = useNavigate();
  const { profile } = useAuth();
  const [shipments, setShipments] = useState<ExportShipment[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Shipment State
  const [editingShipment, setEditingShipment] = useState<ExportShipment | null>(null);
  const [carrier, setCarrier] = useState("");
  const [originPort, setOriginPort] = useState("");
  const [destinationPort, setDestinationPort] = useState("");
  const [eta, setEta] = useState("");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenEdit = (e: React.MouseEvent, ship: ExportShipment) => {
    e.stopPropagation();
    setEditingShipment(ship);
    setCarrier(ship.carrier || "");
    setOriginPort(ship.origin_port || "");
    setDestinationPort(ship.destination_port || "");
    setEta(ship.eta ? ship.eta.split('T')[0] : "");
    setStatus(ship.status || "");
  };

  const handleSaveEdit = async () => {
    if (!editingShipment) return;
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(`/api/finance/export_shipments/${editingShipment.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          carrier,
          origin_port: originPort,
          destination_port: destinationPort,
          eta: eta ? new Date(eta).toISOString() : null,
          status
        })
      });

      if (!res.ok) throw new Error(await res.text() || "Failed to update shipment");

      toast.success("Shipment updated successfully!");
      setEditingShipment(null);
      fetchShipments();
    } catch (err: any) {
      toast.error(err.message || "Failed to update shipment");
    } finally {
      setIsSaving(false);
    }
  };

  const fetchShipments = async () => {
    try {
      if (!profile?.company_id) return;
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const [shipmentsRes, containersRes] = await Promise.all([
        fetch(`/api/finance/export_shipments?company_id=${profile.company_id}`, { headers }),
        fetch(`/api/finance/export_containers?company_id=${profile.company_id}`, { headers })
      ]);

      if (shipmentsRes.ok && containersRes.ok) {
        const shipmentsData = await shipmentsRes.json();
        const containersData = await containersRes.json();
        
        const activeShipments = shipmentsData.filter((s: any) => s.is_deleted !== true);
        const activeContainers = containersData.filter((c: any) => c.is_deleted !== true);

        const formatted = activeShipments.map((s: any) => {
          const count = activeContainers.filter((c: any) => c.shipment_id === s.id).length;
          return {
            ...s,
            containerCount: count
          };
        });

        const sorted = formatted.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setShipments(sorted as ExportShipment[]);
      } else {
        throw new Error("Failed to fetch shipments or containers data");
      }
    } catch (err) {
      console.error("Fetch shipments error:", err);
      toast.error("Failed to load shipments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [profile?.company_id]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this shipment? This will also remove linked tracking data.")) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(`/api/finance/export_shipments/${id}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error(await res.text() || "Failed to delete shipment");

      toast.success("Shipment hidden successfully");
      fetchShipments();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete shipment");
    }
  };

  return (
    <div>
      <PageHeader 
        title="Shipment Register" 
        description="All outbound shipments and their status" 
        breadcrumbs={[{ label: "Shipments" }]}
        actions={<Button size="sm" onClick={() => nav("/shipments/create")}><Plus className="h-4 w-4 mr-1.5" />New Shipment</Button>}
      />
      
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : shipments.length === 0 ? (
        <div className="border border-dashed rounded-lg p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
          <p className="text-muted-foreground mb-4">No shipments found.</p>
          <Button variant="outline" onClick={() => nav("/shipments/create")}>Create your first shipment</Button>
        </div>
      ) : (
        <DataTable
          data={shipments}
          searchKeys={["shipment_number", "customer_name", "destination_port"]}
          onRowClick={(r) => nav(`/shipments/${r.id}`)}
          columns={[
            { key: "shipment_number", header: "Shipment", render: (r) => <span className="font-mono text-xs text-primary">{r.shipment_number}</span> },
            { key: "customer_name", header: "Customer", render: (r) => <span className="font-medium">{r.customer_name || "Unknown"}</span> },
            { key: "route", header: "Route", render: (r) => <span className="text-xs">{r.origin_port} → {r.destination_port}</span> },
            { key: "carrier", header: "Carrier", render: (r) => r.carrier },
            { key: "containers", header: "Containers", render: (r) => <span className="tabular-nums">{r.containerCount}</span> },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "eta", header: "ETA", render: (r) => <span className="text-xs text-muted-foreground">{r.eta ? new Date(r.eta).toLocaleDateString() : 'TBD'}</span> },
            { 
              key: "actions", 
              header: "", 
              render: (r) => (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                    onClick={(e) => handleOpenEdit(e, r)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDelete(e, r.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) 
            },
          ]}
        />

      )}

      {editingShipment && (
        <Dialog open={!!editingShipment} onOpenChange={(open) => !open && setEditingShipment(null)}>
          <DialogContent className="max-w-md bg-card border-border text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-primary">Edit Shipment {editingShipment.shipment_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Shipping Line / Carrier</Label>
                <Input value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="e.g. MSC, Maersk" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Port of Loading</Label>
                <Input value={originPort} onChange={e => setOriginPort(e.target.value)} placeholder="e.g. Nhava Sheva" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Port of Discharge</Label>
                <Input value={destinationPort} onChange={e => setDestinationPort(e.target.value)} placeholder="e.g. Jebel Ali" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">ETA (Estimated Arrival)</Label>
                <Input type="date" value={eta} onChange={e => setEta(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-white/10 text-white">
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Shipped">Shipped</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingShipment(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
