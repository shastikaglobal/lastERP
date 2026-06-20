import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import Card from "@/components/Card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getStockSummaryData } from "@/lib/report-services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, Filter, Package, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function StockSummaryReport() {
  const { profile } = useAuth();
  const [filters, setFilters] = useState({
    warehouse_id: "",
    date_from: "",
    date_to: "",
  });
  const [isExporting, setIsExporting] = useState(false);

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

  const { data: report, isLoading } = useQuery({
    queryKey: ["stock-summary", filters, profile?.company_id],
    queryFn: async () => {
      return getStockSummaryData({
        ...filters,
        company_id: profile?.company_id,
      });
    },
    enabled: !!profile?.company_id,
  });

  const handleExport = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouse_inventory')
        .select('*');
      
      if (error) throw error;
      
      const csv = [
        ['Product', 'Warehouse', 'Available (kg)', 
         'Reserved (kg)', 'Export Ready (kg)', 
         'Min Level (kg)', 'Status'],
        ...data.map(row => [
          row.product_name,
          row.warehouse_name,
          row.available_quantity,
          row.reserved_quantity,
          row.export_ready_quantity,
          row.min_level,
          row.status
        ])
      ].map(r => r.join(',')).join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Stock_Summary_Report.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <PageHeader
        title="Stock Summary Report"
        description="Overview of warehouse inventory levels, stock status, and product distribution"
        breadcrumbs={[{ label: "Reports" }, { label: "Stock Summary" }]}
        actions={
          <Button onClick={handleExport} disabled={isLoading || isExporting} className="gap-2">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          <Input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters({...filters, date_from: e.target.value})}
            placeholder="From Date"
          />

          <Input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters({...filters, date_to: e.target.value})}
            placeholder="To Date"
          />
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Quantity</p>
                  <p className="text-2xl font-bold">{(report?.summary?.total_quantity || 0).toFixed(0)} kg</p>
                </div>
                <Package className="h-8 w-8 text-primary/50" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Remaining Stock</p>
                  <p className="text-2xl font-bold">{(report?.summary?.total_remaining || 0).toFixed(0)} kg</p>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-500/50" />
              </div>
            </Card>

            <Card className="p-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Consumed</p>
                <p className="text-2xl font-bold">{(report?.summary?.total_consumed || 0).toFixed(0)} kg</p>
              </div>
            </Card>

            <Card className="p-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Batches</p>
                <p className="text-2xl font-bold">{report?.summary?.batch_count || 0}</p>
              </div>
            </Card>
          </div>

          {/* Data Table */}
          <Card className="p-6 overflow-x-auto">
            <h3 className="font-semibold mb-4">Stock Details</h3>
            {report?.data && report.data.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Lot Number</th>
                    <th className="px-4 py-2 text-left font-semibold">Product</th>
                    <th className="px-4 py-2 text-left font-semibold">Received Date</th>
                    <th className="px-4 py-2 text-right font-semibold">Qty (kg)</th>
                    <th className="px-4 py-2 text-right font-semibold">Remaining</th>
                    <th className="px-4 py-2 text-left font-semibold">Status</th>
                    <th className="px-4 py-2 text-left font-semibold">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.data.map((row: any) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2 font-mono text-xs">{row.lot_number}</td>
                      <td className="px-4 py-2">{row.product?.name || "-"}</td>
                      <td className="px-4 py-2">{format(new Date(row.received_date), "MMM dd, yyyy")}</td>
                      <td className="px-4 py-2 text-right">{row.quantity_kg.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-semibold">{row.quantity_remaining_kg.toFixed(2)}</td>
                      <td className="px-4 py-2">
                        <span className="inline-block px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-600">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-2">{row.grade || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center py-8 text-muted-foreground">No data available</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
