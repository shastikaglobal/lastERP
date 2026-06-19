import { Loader2, Boxes, Plus, Save } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { LowStockSwiper } from "@/components/inventory/LowStockSwiper";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

export default function StockDashboard() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [lotNumber, setLotNumber] = useState(`LOT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`);
  const [quantity, setQuantity] = useState("");
  const [grade, setGrade] = useState("A");
  const [moisture, setMoisture] = useState("12.5");
  const [expiryDate, setExpiryDate] = useState("");
  const [isExportReady, setIsExportReady] = useState(false);

  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data: { session: __session_sel } } = await supabase.auth.getSession();
        const __res_sel = await fetch(`/api/inventory/products`, {
          headers: { 'Authorization': `Bearer ${__session_sel?.access_token}` }
        });
        const data = __res_sel.ok ? await __res_sel.json() : null;
        const error = __res_sel.ok ? null : new Error('Select failed');
      if (error) console.error("Products load error:", error);
      return data || [];
    }
  });

  const { data: warehouses, isLoading: isLoadingWarehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data: { session: __session_sel } } = await supabase.auth.getSession();
        const __res_sel = await fetch(`/api/warehouse/warehouses`, {
          headers: { 'Authorization': `Bearer ${__session_sel?.access_token}` }
        });
        const data = __res_sel.ok ? await __res_sel.json() : null;
        const error = __res_sel.ok ? null : new Error('Select failed');
      if (error) console.error("Warehouses load error:", error);
      return data || [];
    }
  });

  const { data, isLoading, error } = useQuery<any[]>({
    queryKey: ["inventory_batches"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("inventory_batches")
          .select(`
            id, 
            lot_number, 
            quantity_kg, 
            quantity_remaining_kg, 
            grade, 
            moisture_pct, 
            received_date, 
            expiry_date,
            quantity_reserved_kg,
            is_export_ready,
            status,
            product:products(name, sku),
            warehouse:warehouses(name)
          `)
          .order("received_date", { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error("Inventory fetch error:", err);
        throw err;
      }
    },
    retry: 1
  });

  const handleAddBatch = async () => {
    if (!productId || !warehouseId || !quantity || !lotNumber) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      // Get company_id from profile
      const { data: profile } = await (async () => {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(`/api/inventory/profiles`, {
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
          });
          return { data: res.ok ? await res.json() : null };
        })().eq('id', userId).single();

      const { error } = await supabase.from("inventory_batches").insert({
        company_id: profile?.company_id,
        lot_number: lotNumber,
        product_id: productId,
        warehouse_id: warehouseId,
        quantity_kg: Number(quantity),
        quantity_remaining_kg: Number(quantity),
        grade,
        moisture_pct: Number(moisture),
        expiry_date: expiryDate || null,
        is_export_ready: isExportReady,
        status: 'pending_qc',
        received_date: new Date().toISOString().split('T')[0]
      });

      if (error) throw error;

      toast.success("Batch added to inventory");
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["inventory_batches"] });

      // Reset form
      setQuantity("");
      setLotNumber(`LOT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to add batch");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <PageHeader title="Inventory Batches" breadcrumbs={[{ label: "Inventory" }]} />
        <div className="mt-6 p-12 border border-red-200 bg-red-50 rounded-lg text-center">
          <p className="text-red-600 font-medium">Failed to load inventory data</p>
          <p className="text-red-500 text-sm mt-1">{(error as any)?.message || "Please check your database connection."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Inventory Batches"
        description="Lot-tracked stock with FIFO ordering"
        breadcrumbs={[{ label: "Inventory" }, { label: "Batches" }]}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-gold">
                <Plus className="mr-2 h-4 w-4" /> Add Batch
              </Button>
            </DialogTrigger>
            <DialogContent className="erp-card border-white/10 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full" />
                  Add New Stock Batch
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Lot Number *</Label>
                  <Input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} className="bg-white/5 border-white/10" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Product *</Label>
                    <Select value={productId} onValueChange={setProductId}>
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue placeholder={isLoadingProducts ? "Loading..." : "Select Product"} />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-white/10">
                        {products && products.length > 0 ? (
                          products.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-xs text-muted-foreground">No products found in database</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Warehouse *</Label>
                    <Select value={warehouseId} onValueChange={setWarehouseId}>
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue placeholder={isLoadingWarehouses ? "Loading..." : "Select Warehouse"} />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-white/10">
                        {warehouses && warehouses.length > 0 ? (
                          warehouses.map(w => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-xs text-muted-foreground">No warehouses found in database</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Quantity (kg) *</Label>
                    <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="bg-white/5 border-white/10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Grade</Label>
                    <Input value={grade} onChange={(e) => setGrade(e.target.value)} className="bg-white/5 border-white/10" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Moisture (%)</Label>
                    <Input type="number" step="0.1" value={moisture} onChange={(e) => setMoisture(e.target.value)} className="bg-white/5 border-white/10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Expiry Date</Label>
                    <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="bg-white/5 border-white/10" />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="is_export_ready"
                    checked={isExportReady}
                    onChange={(e) => setIsExportReady(e.target.checked)}
                    className="h-4 w-4 rounded border-white/10 bg-white/5 text-primary"
                  />
                  <Label htmlFor="is_export_ready" className="text-xs font-semibold cursor-pointer">Mark as Export Ready</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-white/10">Cancel</Button>
                <Button className="btn-gold" onClick={handleAddBatch} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Batch
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <LowStockSwiper />

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-12 w-12" />}
          title="No inventory batches yet"
          description="Batches are created automatically when purchase orders are received, or you can add them manually above."
        />
      ) : (
        <DataTable
          data={data}
          searchKeys={["lot_number", "product.name"]}
          columns={[
            {
              key: "lot",
              header: "Lot #",
              render: (r: any) => <span className="font-mono text-xs font-bold">{r.lot_number}</span>
            },
            {
              key: "product",
              header: "Product",
              render: (r: any) => <span className="font-semibold">{r.product?.name || "—"}</span>
            },
            {
              key: "wh",
              header: "Warehouse",
              render: (r: any) => <span className="text-sm text-muted-foreground">{r.warehouse?.name || "—"}</span>
            },
            {
              key: "qty",
              header: "Physical (kg)",
              render: (r: any) => (
                <div className="flex flex-col">
                  <span className="tabular-nums font-bold">{Number(r.quantity_remaining_kg).toLocaleString()}</span>
                  {r.quantity_reserved_kg > 0 && (
                    <span className="text-[10px] text-orange-400 font-medium">Reserved: {Number(r.quantity_reserved_kg).toLocaleString()}</span>
                  )}
                </div>
              )
            },
            {
              key: "available",
              header: "Available (kg)",
              render: (r: any) => <span className="tabular-nums font-bold text-emerald-500">{Number(r.quantity_remaining_kg - (r.quantity_reserved_kg || 0)).toLocaleString()}</span>
            },
            {
              key: "expiry",
              header: "Expiry",
              render: (r: any) => {
                const isExpired = r.expiry_date && new Date(r.expiry_date) < new Date();
                const isNearExpiry = r.expiry_date && new Date(r.expiry_date) < new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
                return (
                  <span className={`text-xs font-mono font-bold ${isExpired ? 'text-red-500' : isNearExpiry ? 'text-orange-500' : 'text-muted-foreground'}`}>
                    {r.expiry_date ? format(new Date(r.expiry_date), "MMM dd, yyyy") : "—"}
                  </span>
                );
              }
            },
            {
              key: "status",
              header: "Status",
              render: (r: any) => (
                <div className="flex flex-col gap-1">
                  <StatusBadge status={r.status} />
                  {r.is_export_ready && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold uppercase w-fit">Export Ready</span>}
                </div>
              )
            },
          ]}
        />
      )}
    </div>
  );
}
