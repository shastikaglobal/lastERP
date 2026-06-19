import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import Card from "@/components/Card";
import { useAuth } from "@/hooks/useAuth";
import { getDamageWastageData } from "@/lib/report-services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Loader2, Filter, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function DamageWastageReport() {
  const { profile } = useAuth();

  const { data: report, isLoading } = useQuery({
    queryKey: ["damage-wastage", profile?.company_id],
    queryFn: async () => {
      return getDamageWastageData({
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
      ["Lot Number", "Product", "Status", "Quantity (kg)", "Grade", "Warehouse", "Received Date"].join(","),
      ...report.data.map(item =>
        [
          item.lot_number,
          item.product?.name || "-",
          item.status,
          item.quantity_kg,
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
    a.download = `damage-wastage-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("Report exported successfully!");
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <PageHeader
        title="Damage/Wastage Report"
        description="Monitor damaged, rejected, and quarantined inventory items"
        breadcrumbs={[{ label: "Reports" }, { label: "Damage/Wastage" }]}
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
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Damaged Qty</p>
                  <p className="text-2xl font-bold text-red-600">{(report?.summary?.total_damaged_quantity || 0).toFixed(0)} kg</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Damage Incidents</p>
              <p className="text-2xl font-bold">{report?.summary?.total_damage_incidents || 0}</p>
            </Card>

            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Status Breakdown</p>
              <div className="space-y-1 text-xs">
                {Object.entries(report?.summary?.status_distribution || {}).map(([status, qty]: [string, any]) => (
                  <div key={status} className="flex justify-between">
                    <span>{status}</span>
                    <span className="font-semibold">{qty.toFixed(0)} kg</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Data Table */}
          <Card className="p-6 overflow-x-auto">
            <h3 className="font-semibold mb-4">Damaged/Wastage Items</h3>
            {report?.data && report.data.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Lot Number</th>
                    <th className="px-4 py-2 text-left font-semibold">Product</th>
                    <th className="px-4 py-2 text-left font-semibold">Status</th>
                    <th className="px-4 py-2 text-right font-semibold">Quantity (kg)</th>
                    <th className="px-4 py-2 text-left font-semibold">Grade</th>
                    <th className="px-4 py-2 text-left font-semibold">Warehouse</th>
                    <th className="px-4 py-2 text-left font-semibold">Received Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.data.map((row: any) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2 font-mono text-xs">{row.lot_number}</td>
                      <td className="px-4 py-2">{row.product?.name || "-"}</td>
                      <td className="px-4 py-2">
                        <span className="inline-block px-2 py-1 rounded text-xs bg-red-500/10 text-red-600 font-semibold">
                          {row.status.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-red-600">{row.quantity_kg.toFixed(2)}</td>
                      <td className="px-4 py-2">{row.grade || "-"}</td>
                      <td className="px-4 py-2">{row.warehouse?.name || "-"}</td>
                      <td className="px-4 py-2">{format(new Date(row.received_date), "MMM dd, yyyy")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center py-8 text-muted-foreground">No damage/wastage items found</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
