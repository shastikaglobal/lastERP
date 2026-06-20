import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import Card from "@/components/Card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getExportReadyStockData } from "@/lib/report-services";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, Filter, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ExportReadyStockReport() {
  const { profile } = useAuth();
  const [filters, setFilters] = useState({
    warehouse_id: "",
    product_id: "",
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/inventory/warehouses', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch warehouses');
      const data = await res.json();
      return data || [];
    }
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, sku");
      return data || [];
    }
  });

  const { data: report, isLoading } = useQuery({
    queryKey: ["export-ready-stock", filters, profile?.company_id],
    queryFn: async () => {
      return getExportReadyStockData({
        ...filters,
        company_id: profile?.company_id,
      });
    },
    enabled: !!profile?.company_id,
  });

  const handleExport = () => {
    if (!report?.data || report.data.length === 0) {
      toast.info("No data available to export");
      return;
    }

    const csv = [
      ["Lot Number", "Product", "SKU", "Quantity (kg)", "Grade", "Warehouse", "Received Date"].join(","),
      ...report.data.map(item =>
        [
          item.lot_number,
          item.product?.name || "-",
          item.product?.sku || "-",
          item.quantity_remaining_kg,
          item.grade || "-",
          item.warehouse?.name || "-",
          item.received_date
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export-ready-stock-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("Report exported successfully!");
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <PageHeader
        title="Export Ready Stock Report"
        description="Monitor inventory that has passed QC and is ready for export"
        breadcrumbs={[{ label: "Reports" }, { label: "Export Ready Stock" }]}
        actions={
          <Button onClick={handleExport} disabled={isLoading} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        }
      />

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select value={filters.warehouse_id || "all"} onValueChange={(v) => setFilters({...filters, warehouse_id: v === "all" ? "" : v})}>
            <SelectTrigger>
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {warehouses?.map(w => (
                <SelectItem key={w.id} value={w.id}>{w.name} - {[w.location, w.city].filter(Boolean).join(", ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.product_id || "all"} onValueChange={(v) => setFilters({...filters, product_id: v === "all" ? "" : v})}>
            <SelectTrigger>
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {products?.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Export Ready Qty</p>
                  <p className="text-2xl font-bold text-emerald-600">{(report?.summary?.total_export_ready_quantity || 0).toFixed(0)} kg</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Batches Ready</p>
              <p className="text-2xl font-bold">{report?.summary?.export_ready_batches || 0}</p>
            </Card>

            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">By Grade</p>
              <div className="space-y-1 text-xs">
                {Object.entries(report?.summary?.by_grade || {}).map(([grade, qty]: [string, any]) => (
                  <div key={grade} className="flex justify-between">
                    <span className="text-muted-foreground">{grade}</span>
                    <span className="font-semibold">{qty.toFixed(0)} kg</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Data Table */}
          <Card className="p-6 overflow-x-auto">
            <h3 className="font-semibold mb-4">Export Ready Stock</h3>
            {report?.data && report.data.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Lot Number</th>
                    <th className="px-4 py-2 text-left font-semibold">Product</th>
                    <th className="px-4 py-2 text-left font-semibold">SKU</th>
                    <th className="px-4 py-2 text-right font-semibold">Qty (kg)</th>
                    <th className="px-4 py-2 text-left font-semibold">Grade</th>
                    <th className="px-4 py-2 text-left font-semibold">HS Code</th>
                    <th className="px-4 py-2 text-left font-semibold">Warehouse</th>
                    <th className="px-4 py-2 text-left font-semibold">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.data.map((row: any) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2 font-mono text-xs">{row.lot_number}</td>
                      <td className="px-4 py-2">{row.product?.name || "-"}</td>
                      <td className="px-4 py-2 font-mono text-xs">{row.product?.sku || "-"}</td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-600">{row.quantity_remaining_kg.toFixed(2)}</td>
                      <td className="px-4 py-2">
                        <span className="inline-block px-2 py-1 rounded text-xs bg-emerald-500/10 text-emerald-600 font-semibold">
                          {row.grade || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">{row.product?.hs_code || "-"}</td>
                      <td className="px-4 py-2">{row.warehouse?.name || "-"}</td>
                      <td className="px-4 py-2 text-sm">{format(new Date(row.received_date), "MMM dd, yyyy")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center py-8 text-muted-foreground">No export-ready stock found</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
