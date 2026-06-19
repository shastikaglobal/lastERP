import { useState } from "react";
import { Warehouse, MapPin, Plus, Loader2, Save, Trash2, Pencil, Phone, ShieldCheck, Thermometer, User, Package } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section } from "@/components/shared/FormShell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const WAREHOUSE_TYPES = [
  "Dry Storage",
  "Cold Storage",
  "Ripening Chamber",
  "Packing Shed",
  "Bonded Warehouse",
  "Distribution Center",
];

const TYPE_COLORS: Record<string, string> = {
  "Cold Storage": "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "Ripening Chamber": "text-orange-400 bg-orange-500/10 border-orange-500/20",
  "Packing Shed": "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  "Dry Storage": "text-green-400 bg-green-500/10 border-green-500/20",
  "Bonded Warehouse": "text-purple-400 bg-purple-500/10 border-purple-500/20",
  "Distribution Center": "text-primary bg-primary/10 border-primary/20",
};

const defaultForm = {
  name: "",
  warehouse_type: "Dry Storage",
  address: "",
  city: "",
  state: "",
  capacity_kg: "",
  manager_name: "",
  manager_phone: "",
  fssai_license: "",
  is_cold_chain: false,
  notes: "",
};

export default function Warehouses() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...defaultForm });

  const setField = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const { data: warehouses, isLoading } = useQuery({
    queryKey: ["warehouses_live", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/warehouse/with-stock', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch warehouses');
      const data = await res.json();

      return (data || []).map(w => {
        const batchData = w.inventory_batches || [];
        const totalStock = batchData.reduce((sum: number, b: any) => sum + (Number(b.quantity_remaining_kg) || 0), 0);
        const categories: Record<string, number> = {};
        batchData.forEach((b: any) => {
          const cat = b.product?.category || "Uncategorized";
          categories[cat] = (categories[cat] || 0) + (Number(b.quantity_remaining_kg) || 0);
        });
        const utilization = w.capacity_kg ? Math.min(100, Math.round((totalStock / Number(w.capacity_kg)) * 100)) : null;
        return { ...w, totalStock, categories, utilization };
      });
    },
    enabled: !!profile?.company_id
  });

  const resetAndClose = () => {
    setForm({ ...defaultForm });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const openEdit = (w: any) => {
    setEditingId(w.id);
    setForm({
      name: w.name || "",
      warehouse_type: w.warehouse_type || "Dry Storage",
      address: w.address || "",
      city: w.city || "",
      state: w.state || "",
      capacity_kg: w.capacity_kg?.toString() || "",
      manager_name: w.manager_name || "",
      manager_phone: w.manager_phone || "",
      fssai_license: w.fssai_license || "",
      is_cold_chain: w.is_cold_chain || false,
      notes: w.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.city) {
      toast.error("Warehouse name and city are required");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name,
        warehouse_type: form.warehouse_type,
        address: form.address,
        city: form.city,
        state: form.state,
        location: `${form.city}${form.state ? ', ' + form.state : ''}`,
        capacity_kg: form.capacity_kg ? Number(form.capacity_kg) : null,
        manager_name: form.manager_name,
        manager_phone: form.manager_phone,
        fssai_license: form.fssai_license,
        is_cold_chain: form.is_cold_chain,
        notes: form.notes,
      };

      const { data: { session } } = await supabase.auth.getSession();
      if (editingId) {
        const res = await fetch(`/api/warehouse/warehouses/${editingId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to update warehouse');
        toast.success("Warehouse updated");
      } else {
        const res = await fetch(`/api/warehouse/warehouses`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ...payload, company_id: profile?.company_id, is_active: true })
        });
        if (!res.ok) throw new Error('Failed to create warehouse');
        toast.success("Warehouse created");
      }
      resetAndClose();
      queryClient.invalidateQueries({ queryKey: ["warehouses_live"] });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save warehouse");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, warehouseName: string) => {
    if (!confirm(`Delete "${warehouseName}"? This will hide the warehouse from the app.`)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/warehouse/warehouses/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_deleted: true,
          is_active: false,
          deleted_at: new Date().toISOString(),
          deleted_by: profile?.id || null,
        })
      });
      if (!res.ok) throw new Error('Failed to delete warehouse');
      toast.success("Warehouse hidden from the app");
      queryClient.invalidateQueries({ queryKey: ["warehouses_live"] });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete warehouse");
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Warehouses"
        description="All distribution centers and storage facilities"
        breadcrumbs={[{ label: "Inventory" }, { label: "Warehouses" }]}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetAndClose(); setIsDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button className="btn-gold"><Plus className="mr-2 h-4 w-4" /> Add Warehouse</Button>
            </DialogTrigger>
            <DialogContent className="erp-card border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full" />
                  {editingId ? "Edit Warehouse" : "New Warehouse"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">

                {/* Basic Info */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Basic Information</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label>Warehouse Name *</Label>
                      <Input placeholder="e.g. Vellore Cold Store Unit 1" value={form.name} onChange={e => setField("name", e.target.value)} className="bg-white/5" />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={form.warehouse_type} onValueChange={v => setField("warehouse_type", v)}>
                        <SelectTrigger className="bg-white/5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {WAREHOUSE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Capacity (kg)</Label>
                      <Input type="number" placeholder="e.g. 50000" value={form.capacity_kg} onChange={e => setField("capacity_kg", e.target.value)} className="bg-white/5" />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Location</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label>Street Address</Label>
                      <Input placeholder="e.g. 12, Industrial Area, NH-46" value={form.address} onChange={e => setField("address", e.target.value)} className="bg-white/5" />
                    </div>
                    <div className="space-y-2">
                      <Label>City *</Label>
                      <Input placeholder="e.g. Vellore" value={form.city} onChange={e => setField("city", e.target.value)} className="bg-white/5" />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input placeholder="e.g. Tamil Nadu" value={form.state} onChange={e => setField("state", e.target.value)} className="bg-white/5" />
                    </div>
                  </div>
                </div>

                {/* Manager */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Manager & Contact</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Manager Name</Label>
                      <Input placeholder="e.g. Rajan Kumar" value={form.manager_name} onChange={e => setField("manager_name", e.target.value)} className="bg-white/5" />
                    </div>
                    <div className="space-y-2">
                      <Label>Manager Phone</Label>
                      <Input placeholder="e.g. +91 98765 43210" value={form.manager_phone} onChange={e => setField("manager_phone", e.target.value)} className="bg-white/5" />
                    </div>
                  </div>
                </div>

                {/* Compliance */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Compliance & Certifications</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>FSSAI License #</Label>
                      <Input placeholder="e.g. 10024999000145" value={form.fssai_license} onChange={e => setField("fssai_license", e.target.value)} className="bg-white/5" />
                    </div>
                    <div className="space-y-2">
                      <Label>Cold Chain Certified</Label>
                      <Select value={form.is_cold_chain ? "yes" : "no"} onValueChange={v => setField("is_cold_chain", v === "yes")}>
                        <SelectTrigger className="bg-white/5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea placeholder="Any additional notes about this warehouse..." value={form.notes} onChange={e => setField("notes", e.target.value)} className="bg-white/5 h-20" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
                <Button className="btn-gold" onClick={handleSave} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {editingId ? "Update Warehouse" : "Save Warehouse"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
        </div>
      ) : !warehouses || warehouses.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-white/10 rounded-xl">
          <Warehouse className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
          <h3 className="text-lg font-medium">No warehouses yet</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">Click "Add Warehouse" to register your first storage location.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map((w) => {
            const typeColor = TYPE_COLORS[w.warehouse_type] || TYPE_COLORS["Dry Storage"];
            return (
              <div key={w.id} className="erp-card group hover:border-primary/30 transition-all flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${typeColor}`}>
                    <Warehouse className="h-5 w-5" />
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full border font-semibold uppercase tracking-wider ${typeColor}`}>
                    {w.warehouse_type || "Dry Storage"}
                  </span>
                </div>

                {/* Name & Location */}
                <div className="mb-3">
                  <div className="font-bold text-base text-white group-hover:text-primary transition-colors">{w.name}</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3 text-primary/60 shrink-0" />
                    {[w.city, w.state].filter(Boolean).join(", ") || w.location || "Location not set"}
                  </div>
                </div>

                {/* Capacity Bar */}
                {w.capacity_kg ? (
                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Utilization</span>
                      <span className="font-bold text-white">{w.utilization}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${w.utilization! > 80 ? 'bg-red-500' : w.utilization! > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${w.utilization}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>{w.totalStock?.toLocaleString()} kg used</span>
                      <span>{Number(w.capacity_kg).toLocaleString()} kg total</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Stock</span>
                    <span className="text-base font-bold text-gradient-gold">{w.totalStock?.toLocaleString()} kg</span>
                  </div>
                )}

                {/* Stock by Category */}
                <div className="flex flex-wrap gap-1.5 pb-3 border-b border-white/5 min-h-[28px]">
                  {Object.keys(w.categories).length > 0 ? (
                    Object.entries(w.categories).map(([cat, qty]) => (
                      <div key={cat} className="bg-white/5 border border-white/10 rounded-full px-2 py-0.5 flex items-center gap-1.5">
                        <Package className="h-2.5 w-2.5 text-primary" />
                        <span className="text-[10px] text-white/70">{cat}:</span>
                        <span className="text-[10px] font-bold text-primary">{Number(qty).toLocaleString()} kg</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic">No stock in this warehouse</span>
                  )}
                </div>

                {/* Manager & Compliance */}
                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  {w.manager_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-primary/60 shrink-0" />
                      <span>{w.manager_name}</span>
                      {w.manager_phone && <span className="text-white/40">· {w.manager_phone}</span>}
                    </div>
                  )}
                  {w.fssai_license && (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-3 w-3 text-green-500/60 shrink-0" />
                      <span className="font-mono text-[10px]">FSSAI: {w.fssai_license}</span>
                    </div>
                  )}
                  {w.is_cold_chain && (
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-3 w-3 text-blue-400 shrink-0" />
                      <span className="text-blue-400 font-medium">Cold Chain Certified</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
                  <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${w.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {w.is_active ? 'Active' : 'Inactive'}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      title="Edit"
                      onClick={() => openEdit(w)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                      title="Delete"
                      onClick={() => handleDelete(w.id, w.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
