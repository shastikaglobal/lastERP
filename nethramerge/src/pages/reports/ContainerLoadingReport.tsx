import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getContainerLoadingData } from "@/lib/report-services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Loader2, Filter } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ContainerLoadingReport() {
  const { profile } = useAuth();

  const { data: report, isLoading } = useQuery({
    queryKey: ["container-loading", profile?.company_id],
    queryFn: async () => {
      return getContainerLoadingData({
        company_id: profile?.company_id,
      });
    },
    enabled: !!profile?.company_id,
  });

  const handleExport = async () => {
    try {
      if (!report || report.length === 0) {
        toast.error('No data to export');
        return;
      }

      const csv = [
        ['Container ID', 'Container Number', 
         'Product', 'Loading Status', 
         'Seal Number', 'Utilization %',
         'Total Weight (kg)', 'Destination',
         'Loading Date'],
        ...report.map((row: any) => [
          row.id,
          row.container_number,
          row.product_name,
          row.loading_status,
          row.seal_number,
          row.utilization_percentage,
          row.total_weight_kg,
          row.destination,
          row.loading_date
        ])
      ].map(r => r.map((cell) => String(cell).replace(/"/g, '""')).join(',')).join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Container_Loading_Report.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report exported successfully');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export report');
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <PageHeader
        title="Container Loading Report"
        description="Monitor container utilization, loading status, and seal numbers"
        breadcrumbs={[{ label: "Reports" }, { label: "Container Loading" }]}
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
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Total Containers</p>
              <p className="text-2xl font-bold">{report?.length || 0}</p>
            </Card>

            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Total Weight</p>
              <p className="text-2xl font-bold">{(report?.reduce((sum: number, c: any) => sum + (c.total_quantity_kg || 0), 0) || 0).toFixed(0)} kg</p>
            </Card>

            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Avg Utilization</p>
              <p className="text-2xl font-bold">
                {report && report.length > 0 
                  ? (report.reduce((sum: number, c: any) => sum + parseFloat(c.utilization_percentage || 0), 0) / report.length).toFixed(1)
                  : 0}%
              </p>
            </Card>

            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Total Cartons</p>
              <p className="text-2xl font-bold">{report?.reduce((sum: number, c: any) => sum + (c.carton_count || 0), 0) || 0}</p>
            </Card>
          </div>

          {/* Data Table */}
          <Card className="p-6 overflow-x-auto">
            <h3 className="font-semibold mb-4">Container Details</h3>
            {report && report.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Container #</th>
                    <th className="px-4 py-2 text-left font-semibold">Type</th>
                    <th className="px-4 py-2 text-left font-semibold">Status</th>
                    <th className="px-4 py-2 text-right font-semibold">Qty (kg)</th>
                    <th className="px-4 py-2 text-center font-semibold">Cartons</th>
                    <th className="px-4 py-2 text-right font-semibold">Utilization %</th>
                    <th className="px-4 py-2 text-left font-semibold">Seal #</th>
                    <th className="px-4 py-2 text-left font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.map((row: any) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2 font-mono text-xs">{row.container_number}</td>
                      <td className="px-4 py-2">{row.container_type || "-"}</td>
                      <td className="px-4 py-2">
                        <span className="inline-block px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-600">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">{(row.total_quantity_kg || 0).toFixed(2)}</td>
                      <td className="px-4 py-2 text-center">{row.carton_count || "-"}</td>
                      <td className="px-4 py-2 text-right font-semibold">
                        <span className={parseFloat(row.utilization_percentage || 0) > 80 ? "text-emerald-600" : "text-amber-600"}>
                          {row.utilization_percentage}%
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">{row.seal_number || "-"}</td>
                      <td className="px-4 py-2">{format(new Date(row.created_at), "MMM dd, yyyy")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center py-8 text-muted-foreground">No containers found</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
