import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { format, differenceInDays, parseISO } from "date-fns";
import { Loader2, Plus, Search, Download, Edit2, Eye, MoreVertical, Trash2, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";

interface Batch {
  id: string;
  lot_number: string;
  product_id: string;
  warehouse_id: string;
  quantity_kg: number;
  quantity_remaining_kg: number;
  grade?: string;
  moisture_pct?: number;
  received_date: string;
  expiry_date?: string;
  status: string;
  cost_per_kg?: number;
  created_at: string;
  updated_at: string;
  products?: { name: string; grade?: string };
  warehouses?: { name: string };
}

interface Product {
  id: string;
  name: string;
  grade?: string;
}

interface Warehouse {
  id: string;
  name: string;
}

export default function InventoryBatches() {
  const { profile } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const ROWS_PER_PAGE = 10;

  const [formData, setFormData] = useState({
    lot_number: "",
    product_id: "",
    warehouse_id: "",
    quantity_kg: "",
    quantity_remaining_kg: "",
    grade: "",
    moisture_pct: "",
    received_date: new Date().toISOString().split("T")[0],
    expiry_date: "",
    notes: "",
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.company_id) return;
      try {
        setLoading(true);
        const [batchesRes, productsRes, warehousesRes] = await Promise.all([
          supabase
            .from("inventory_batches")
            .select("*, products(name, grade), warehouses(name)")
            .eq("company_id", profile.company_id)
            .neq("is_deleted", true)
            .order("received_date", { ascending: false }),
          (async () => {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(`/api/inventory/products`, {
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
          });
          return { data: res.ok ? await res.json() : null };
        })(),
          (async () => {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(`/api/warehouse/warehouses`, {
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
          });
          return { data: res.ok ? await res.json() : null };
        })(),
        ]);

        if (batchesRes.error) throw batchesRes.error;
        if (productsRes.error) throw productsRes.error;
        if (warehousesRes.error) throw warehousesRes.error;

        setBatches(batchesRes.data || []);
        setProducts(productsRes.data || []);
        setWarehouses(warehousesRes.data || []);
      } catch (err: any) {
        console.error("Fetch error:", err);
        toast.error("Failed to load inventory batches");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile?.company_id]);

  // Calculate batch status
  const calculateStatus = (batch: Batch): string => {
    const expiryDate = batch.expiry_date ? parseISO(batch.expiry_date) : null;
    const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, new Date()) : null;

    if (daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
      return "expiring";
    }
    if (daysUntilExpiry !== null && daysUntilExpiry <= 0) {
      return "expired";
    }
    if (batch.quantity_remaining_kg <= 0 && batch.cost_per_kg === 0) {
      return "damaged";
    }
    return batch.status || "available";
  };

  // Summary stats
  const summaryStats = useMemo(() => {
    const now = new Date();
    return {
      total_batches: batches.length,
      total_quantity: batches.reduce((sum, b) => sum + (b.quantity_kg || 0), 0),
      available_quantity: batches.reduce((sum, b) => sum + (b.quantity_remaining_kg || 0), 0),
      expiring_soon: batches.filter(b => {
        const expiry = b.expiry_date ? parseISO(b.expiry_date) : null;
        if (!expiry) return false;
        const days = differenceInDays(expiry, now);
        return days <= 30 && days > 0;
      }).length,
    };
  }, [batches]);

  const uniqueProducts = useMemo(() => {
    const seen = new Map<string, any>();
    for (const p of products) {
      const key = (p.name || '').toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.set(key, p);
      }
    }
    return Array.from(seen.values()).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [products]);

  // Filter batches
  const filteredBatches = useMemo(() => {
    let result = batches;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.lot_number.toLowerCase().includes(query) ||
          b.products?.name?.toLowerCase().includes(query) ||
          b.warehouses?.name?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      result = result.filter((b) => calculateStatus(b) === filterStatus);
    }

    return result;
  }, [batches, searchQuery, filterStatus]);

  // Pagination
  const paginatedBatches = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredBatches.slice(start, start + ROWS_PER_PAGE);
  }, [filteredBatches, currentPage]);

  const totalPages = Math.ceil(filteredBatches.length / ROWS_PER_PAGE);

  // Get status badge color
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      available: "bg-green-50 text-green-800 border-green-200",
      reserved: "bg-blue-50 text-blue-800 border-blue-200",
      export_ready: "bg-purple-50 text-purple-800 border-purple-200",
      damaged: "bg-red-50 text-red-800 border-red-200",
      expiring: "bg-amber-50 text-amber-800 border-amber-200",
      expired: "bg-red-100 text-red-900 border-red-300",
    };
    return colors[status] || "bg-gray-50 text-gray-800";
  };

  // Add/Edit handlers
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id || !formData.lot_number || !formData.product_id || !formData.warehouse_id) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingBatch) {
        // Update
        const { error } = await supabase
          .from("inventory_batches")
          .update({
            lot_number: formData.lot_number,
            product_id: formData.product_id,
            warehouse_id: formData.warehouse_id,
            quantity_kg: Number(formData.quantity_kg),
            quantity_remaining_kg: Number(formData.quantity_remaining_kg || formData.quantity_kg),
            grade: formData.grade,
            moisture_pct: formData.moisture_pct ? Number(formData.moisture_pct) : null,
            received_date: formData.received_date,
            expiry_date: formData.expiry_date || null,
          })
          .eq("id", editingBatch.id);

        if (error) throw error;
        toast.success("Batch updated successfully");
      } else {
        // Create
        const { error } = await supabase.from("inventory_batches").insert({
          company_id: profile.company_id,
          lot_number: formData.lot_number,
          product_id: formData.product_id,
          warehouse_id: formData.warehouse_id,
          quantity_kg: Number(formData.quantity_kg),
          quantity_remaining_kg: Number(formData.quantity_remaining_kg || formData.quantity_kg),
          grade: formData.grade,
          moisture_pct: formData.moisture_pct ? Number(formData.moisture_pct) : null,
          received_date: formData.received_date,
          expiry_date: formData.expiry_date || null,
          status: "available",
        });

        if (error) throw error;
        toast.success("Batch added successfully");
      }

      setIsAddDialogOpen(false);
      setIsEditDialogOpen(false);
      resetForm();
      // Refetch data
      const { data } = await supabase
        .from("inventory_batches")
        .select("*, products(name, grade), warehouses(name)")
        .eq("company_id", profile.company_id)
        .neq("is_deleted", true)
        .order("received_date", { ascending: false });
      setBatches(data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to save batch");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      lot_number: "",
      product_id: "",
      warehouse_id: "",
      quantity_kg: "",
      quantity_remaining_kg: "",
      grade: "",
      moisture_pct: "",
      received_date: new Date().toISOString().split("T")[0],
      expiry_date: "",
      notes: "",
    });
    setEditingBatch(null);
  };

  const handleEdit = (batch: Batch) => {
    setEditingBatch(batch);
    setFormData({
      lot_number: batch.lot_number,
      product_id: batch.product_id,
      warehouse_id: batch.warehouse_id,
      quantity_kg: String(batch.quantity_kg),
      quantity_remaining_kg: String(batch.quantity_remaining_kg || batch.quantity_kg),
      grade: batch.grade || "",
      moisture_pct: batch.moisture_pct ? String(batch.moisture_pct) : "",
      received_date: batch.received_date,
      expiry_date: batch.expiry_date || "",
      notes: "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("inventory_batches").update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: profile?.id || null,
      }).eq("id", deleteId);
      if (error) throw error;
      toast.success("Batch hidden successfully");
      setBatches(batches.filter((b) => b.id !== deleteId));
      setConfirmOpen(false);
    } catch (err: any) {
      toast.error("Failed to delete batch");
    } finally {
      setDeleteId(null);
    }
  };

  const exportToCSV = () => {
    if (filteredBatches.length === 0) {
      toast.error("No batches to export");
      return;
    }

    const headers = ["Batch No.", "Product", "Warehouse", "Quantity (kg)", "Grade", "Status", "Expiry Date"];
    const csvContent = [
      headers.join(","),
      ...filteredBatches.map((b) => [
        `"${b.lot_number}"`,
        `"${b.products?.name || ""}"`,
        `"${b.warehouses?.name || ""}"`,
        b.quantity_kg,
        `"${b.grade || ""}"`,
        calculateStatus(b),
        b.expiry_date ? format(parseISO(b.expiry_date), "yyyy-MM-dd") : "",
      ].join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_batches_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Inventory Batches"
        description="Lot-tracked stock with FIFO ordering"
        breadcrumbs={[{ label: "Inventory" }, { label: "Batches" }]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-white/5 rounded-lg p-4 space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Batches</p>
          <p className="text-3xl font-bold text-primary">{summaryStats.total_batches}</p>
        </div>
        <div className="bg-card border border-white/5 rounded-lg p-4 space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Stock (kg)</p>
          <p className="text-3xl font-bold text-emerald-400">{summaryStats.total_quantity.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-white/5 rounded-lg p-4 space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Available (kg)</p>
          <p className="text-3xl font-bold text-sky-400">{summaryStats.available_quantity.toFixed(2)}</p>
        </div>
        <div className="bg-card border border-white/5 rounded-lg p-4 space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Expiring Soon</p>
          <p className="text-3xl font-bold text-amber-400">{summaryStats.expiring_soon}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by batch, product, or warehouse..."
            className="pl-10 bg-white/5 border-white/10 focus:border-primary/50"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          {["all", "available", "expiring", "expired", "damaged"].map((status) => (
            <button
              key={status}
              onClick={() => {
                setFilterStatus(status);
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                filterStatus === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10"
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" onClick={exportToCSV} className="flex-1 md:flex-none border-white/10">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()} className="flex-1 md:flex-none btn-gold">
                <Plus className="h-4 w-4 mr-2" />
                Add Batch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Batch</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold">Batch Number *</Label>
                    <Input
                      value={formData.lot_number}
                      onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                      placeholder="e.g., LOT-2024-001"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold">Grade</Label>
                    <Input
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      placeholder="A, B, etc."
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold">Product *</Label>
                    <Select value={formData.product_id} onValueChange={(val) => setFormData({ ...formData, product_id: val })}>
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueProducts.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold">Warehouse *</Label>
                    <Select value={formData.warehouse_id} onValueChange={(val) => setFormData({ ...formData, warehouse_id: val })}>
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold">Quantity (kg) *</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={formData.quantity_kg}
                      onChange={(e) => setFormData({
                        ...formData,
                        quantity_kg: e.target.value,
                        // auto-fill remaining when user changes total
                        quantity_remaining_kg: formData.quantity_remaining_kg || e.target.value,
                      })}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold">Remaining Quantity *</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={formData.quantity_remaining_kg}
                      onChange={(e) => setFormData({ ...formData, quantity_remaining_kg: e.target.value })}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold">Received Date</Label>
                    <Input
                      type="date"
                      value={formData.received_date}
                      onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold">Expiry Date</Label>
                    <Input
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="btn-gold">
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Batch
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Data Table */}
      <div className="border rounded-xl bg-card overflow-hidden shadow-2xl border-white/5">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-white/5">
              <TableHead className="font-bold text-xs uppercase tracking-wider">Batch No.</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider">Product</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider">Warehouse</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Quantity (kg)</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider">Status</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider">Expiry</TableHead>
              <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary opacity-50" />
                  <p className="mt-4 text-sm text-muted-foreground">Loading batches...</p>
                </TableCell>
              </TableRow>
            ) : paginatedBatches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-20">
                  <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
                  <p className="mt-4 text-sm text-muted-foreground">No batches found</p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedBatches.map((batch) => {
                const status = calculateStatus(batch);
                const expiryDate = batch.expiry_date ? parseISO(batch.expiry_date) : null;
                const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, new Date()) : null;
                const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30;

                return (
                  <TableRow key={batch.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="font-mono font-semibold">{batch.lot_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{batch.products?.name}</p>
                        {batch.grade && <p className="text-xs text-muted-foreground">Grade: {batch.grade}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{batch.warehouses?.name}</TableCell>
                    <TableCell className="text-right font-semibold">{batch.quantity_kg.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={cn("border", getStatusColor(status))}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {expiryDate ? (
                        <span className={cn(isExpiringSoon ? "text-amber-400 font-semibold" : "text-muted-foreground")}>
                          {format(expiryDate, "MMM dd, yyyy")}
                          {isExpiringSoon && <AlertTriangle className="h-3 w-3 inline ml-1" />}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(batch)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDelete(batch.id)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Showing {Math.min((currentPage - 1) * ROWS_PER_PAGE + 1, filteredBatches.length)} to{" "}
            {Math.min(currentPage * ROWS_PER_PAGE, filteredBatches.length)} of {filteredBatches.length} batches
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Batch</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold">Batch Number *</Label>
                <Input
                  value={formData.lot_number}
                  onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold">Grade</Label>
                <Input
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold">Product *</Label>
                <Select value={formData.product_id} onValueChange={(val) => setFormData({ ...formData, product_id: val })}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold">Warehouse *</Label>
                <Select value={formData.warehouse_id} onValueChange={(val) => setFormData({ ...formData, warehouse_id: val })}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold">Quantity (kg) *</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={formData.quantity_kg}
                  onChange={(e) => setFormData({
                    ...formData,
                    quantity_kg: e.target.value,
                    quantity_remaining_kg: formData.quantity_remaining_kg || e.target.value,
                  })}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold">Remaining Quantity *</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={formData.quantity_remaining_kg}
                  onChange={(e) => setFormData({ ...formData, quantity_remaining_kg: e.target.value })}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold">Received Date</Label>
                <Input
                  type="date"
                  value={formData.received_date}
                  onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold">Expiry Date</Label>
                <Input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="btn-gold">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Batch
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Archive Batch"
        description="Are you sure? This batch will be hidden from the active list but preserved for audit."
        onConfirm={executeDelete}
        isLoading={isSubmitting}
      />
    </div>
  );
}
