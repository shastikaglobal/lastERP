import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import Card from "@/components/Card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getInventoryAgingData } from "@/lib/report-services";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function InventoryAgingReport() {
  const { profile } = useAuth();

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
    queryKey: ["inventory-aging", profile?.company_id],
    queryFn: async () => {
      return getInventoryAgingData({
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
      ["Lot Number", "Product", "Days Old", "Aging Bucket", "Quantity (kg)", "Warehouse", "Received Date"].join(","),
      ...report.data.map(item =>
        [
          item.lot_number,
          item.product?.name || "-",
          item.daysOld,
          item.agingBucket,
          item.quantity_remaining_kg,
          item.warehouse?.name || "-",
          item.received_date
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-aging-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("Report exported successfully!");
  };

  const chartData = [
    { bucket: "0-30 days", quantity: report?.summary?.["0-30 days"] || 0 },
    { bucket: "30-90 days", quantity: report?.summary?.["30-90 days"] || 0 },
    { bucket: "90-180 days", quantity: report?.summary?.["90-180 days"] || 0 },
    { bucket: "180+ days", quantity: report?.summary?.["180+ days"] || 0 },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <PageHeader
        title="Inventory Aging Report"
        description="Monitor how long inventory items have been in storage"
        breadcrumbs={[{ label: "Reports" }, { label: "Inventory Aging" }]}
        actions={
          <Button onClick={handleExport} disabled={isLoading} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Aging Chart */}
          {report?.summary && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Aging Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">0-30 Days</p>
              <p className="text-2xl font-bold text-emerald-600">{(report?.summary?.["0-30 days"] || 0).toFixed(0)} kg</p>
            </Card>

            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">30-90 Days</p>
              <p className="text-2xl font-bold text-blue-600">{(report?.summary?.["30-90 days"] || 0).toFixed(0)} kg</p>
            </Card>

            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">90-180 Days</p>
              <p className="text-2xl font-bold text-amber-600">{(report?.summary?.["90-180 days"] || 0).toFixed(0)} kg</p>
            </Card>

            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">180+ Days</p>
              <p className="text-2xl font-bold text-red-600">{(report?.summary?.["180+ days"] || 0).toFixed(0)} kg</p>
            </Card>
          </div>

          {/* Data Table */}
          <Card className="p-6 overflow-x-auto">
            <h3 className="font-semibold mb-4">Aging Details</h3>
            {report?.data && report.data.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Lot Number</th>
                    <th className="px-4 py-2 text-left font-semibold">Product</th>
                    <th className="px-4 py-2 text-center font-semibold">Days Old</th>
                    <th className="px-4 py-2 text-left font-semibold">Aging Bucket</th>
                    <th className="px-4 py-2 text-right font-semibold">Qty (kg)</th>
                    <th className="px-4 py-2 text-left font-semibold">Warehouse</th>
                    <th className="px-4 py-2 text-left font-semibold">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.data.map((row: any) => {
                    const color = row.daysOld > 180 ? "bg-red-500/10 text-red-600" :
                                  row.daysOld > 90 ? "bg-amber-500/10 text-amber-600" :
                                  row.daysOld > 30 ? "bg-blue-500/10 text-blue-600" :
                                  "bg-emerald-500/10 text-emerald-600";
                    return (
                      <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2 font-mono text-xs">{row.lot_number}</td>
                        <td className="px-4 py-2">{row.product?.name || "-"}</td>
                        <td className="px-4 py-2 text-center font-semibold">{row.daysOld}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${color}`}>
                            {row.agingBucket}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">{row.quantity_remaining_kg.toFixed(2)}</td>
                        <td className="px-4 py-2">{row.warehouse?.name || "-"}</td>
                        <td className="px-4 py-2 text-sm">{format(new Date(row.received_date), "MMM dd, yyyy")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-center py-8 text-muted-foreground">No inventory items found</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
