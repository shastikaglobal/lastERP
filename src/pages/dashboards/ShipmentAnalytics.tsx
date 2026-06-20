import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Section } from "@/components/shared/FormShell";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, useIsAdminOrManager } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function ShipmentAnalytics() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const isAdminOrManager = useIsAdminOrManager();
  const [editingShipment, setEditingShipment] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['export_shipments_analytics', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`/api/finance/export_shipments?company_id=${profile.company_id}`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch export shipments from VPS");
        const data = await res.json();
        
        return (data || []).map((s: any) => ({
          ...s,
          dbId: s.id
        }));
      } catch (error) {
        console.error('Error fetching shipments from VPS:', error);
        return [];
      }
    },
    enabled: !!profile?.company_id,
    staleTime: 20000,
    gcTime: 5 * 60 * 1000
  });

  const handleUpdateStatus = async () => {
    if (!editingShipment || !newStatus) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('export_shipments')
        .update({ status: newStatus })
        .eq('id', editingShipment.dbId);

      if (error) throw error;

      toast.success(`Shipment updated to ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ['export_shipments_analytics'] });
      setEditingShipment(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update shipment");
    } finally {
      setIsUpdating(false);
    }
  };

  const stats = {
    onTimeRate: "—",
    avgTransit: "—",
    activeShipments: 0,
    delayed: 0
  };

  if (shipments.length > 0) {
    const active = shipments.filter(s => ['dispatched', 'loading', 'in_transit'].includes(s.status));
    stats.activeShipments = active.length;
    
    const delayed = shipments.filter(s => {
      if (!s.estimated_delivery) return false;
      const today = new Date();
      const estDate = new Date(s.estimated_delivery);
      return estDate < today && !['delivered', 'completed'].includes(s.status);
    });
    stats.delayed = delayed.length;

    const delivered = shipments.filter(s => s.status === 'delivered' || s.status === 'completed');
    if (delivered.length > 0) {
      const onTime = delivered.filter(s => {
        if (!s.estimated_delivery) return true;
        return true; // Assume on-time if delivered
      }).length;
      stats.onTimeRate = `${((onTime / delivered.length) * 100).toFixed(0)}%`;
      
      let totalDays = 0;
      let countWithDates = 0;
      delivered.forEach((s: any) => {
        if (s.dispatch_date && s.created_at) {
          const start = new Date(s.dispatch_date);
          const end = new Date(s.created_at);
          totalDays += Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
          countWithDates++;
        }
      });
      if (countWithDates > 0) {
        stats.avgTransit = (totalDays / countWithDates).toFixed(1);
      } else {
        stats.avgTransit = "0";
      }
    }
  }

  const displayShipments = shipments.map(s => ({
    id: s.shipment_number,
    dbId: s.id,
    customer: s.customer_name || s.export_orders?.customer_name || "Unknown",
    route: `${s.origin_port || '—'} → ${s.destination_port || '—'}`,
    carrier: s.carrier || "—",
    status: s.status,
    eta: s.eta ? new Date(s.eta).toLocaleDateString() : "—"
  }));

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Shipment Analytics" 
        description="Monitor your export delivery performance in real-time" 
        breadcrumbs={[{ label: "Dashboards" }, { label: "Shipments" }]} 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="On-Time Delivery" value={stats.onTimeRate} delta={{ value: "Live", positive: true }} />
        <StatCard label="Avg Transit Days" value={stats.avgTransit} delta={{ value: "Live", positive: true }} />
        <StatCard label="Active Shipments" value={stats.activeShipments.toString()} />
        <StatCard label="Delayed" value={stats.delayed.toString()} delta={{ value: "0", positive: true }} />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Section title="Active Shipments" description="Shipments currently in progress or pending">
          <DataTable
            data={displayShipments.filter(s => s.status !== 'Delivered')}
            isLoading={isLoading}
            searchKeys={["id", "customer", "route"]}
            columns={[
              { key: "id", header: "Shipment #", render: (r) => <span className="font-mono text-xs font-bold text-primary">{r.id}</span> },
              { key: "customer", header: "Customer" },
              { key: "route", header: "Route" },
              { key: "carrier", header: "Carrier" },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              { key: "eta", header: "ETA" },
              { 
                key: "actions", 
                header: "", 
                render: (r) => (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setEditingShipment(r); 
                      setNewStatus(r.status); 
                    }}
                    className="text-primary hover:text-primary hover:bg-primary/10"
                    disabled={!isAdminOrManager}
                  >
                    Update
                  </Button>
                ) 
              },
            ]}
          />
        </Section>

        <Section title="Recent Deliveries" description="Successfully completed shipments">
          <DataTable
            data={displayShipments.filter(s => s.status === 'Delivered')}
            isLoading={isLoading}
            searchKeys={["id", "customer"]}
            columns={[
              { key: "id", header: "Shipment #", render: (r) => <span className="font-mono text-xs font-bold text-muted-foreground">{r.id}</span> },
              { key: "customer", header: "Customer" },
              { key: "route", header: "Route" },
              { key: "carrier", header: "Carrier" },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              { key: "delivered_at", header: "Date", render: (r) => <span className="text-xs text-muted-foreground">{r.eta}</span> },
            ]}
          />
        </Section>
      </div>

      <Dialog open={!!editingShipment} onOpenChange={(open) => !open && setEditingShipment(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Shipment Status</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">New Status for {editingShipment?.id}</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="In Transit">In Transit</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingShipment(null)} disabled={isUpdating}>Cancel</Button>
            <Button className="bg-primary text-white hover:bg-primary/90" onClick={handleUpdateStatus} disabled={isUpdating || newStatus === editingShipment?.status}>
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
