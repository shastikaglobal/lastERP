import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import Card from "@/components/Card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getDispatchReportData } from "@/lib/report-services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, Filter, Truck } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const statusOptions = ["dispatched", "in_transit", "delivered", "pending"];

export default function DispatchReport() {
  const { profile } = useAuth();
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    status: "",
  });

  const { data: report, isLoading } = useQuery({
    queryKey: ["dispatch-report", filters, profile?.company_id],
    queryFn: async () => {
      return getDispatchReportData({
        ...filters,
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
        ['Shipment #', 'Customer', 'Status', 'Qty (kg)', 'Cartons', 'Container', 'Dispatch Date', 'Destination'],
        ...report.map((row: any) => [
          row.shipment_number || '-',
          row.customer?.name || '-',
          row.status || '-',
          row.total_quantity_kg ?? '-',
          row.carton_count ?? '-',
          row.container_number || '-',
          row.dispatch_date || '-',
          row.destination_port || '-',
        ])
      ].map(r => r.map((cell) => String(cell).replace(/"/g, '""')).join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Dispatch_Report.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export dispatch report');
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <PageHeader
        title="Dispatch Report"
        description="Track shipments, delivery status, and customer orders"
        breadcrumbs={[{ label: "Reports" }, { label: "Dispatch" }]}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          <Select value={filters.status || "all"} onValueChange={(v) => setFilters({...filters, status: v === "all" ? "" : v})}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map(s => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ").toUpperCase()}</SelectItem>
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
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Total Shipments</p>
              <p className="text-2xl font-bold">{report?.length || 0}</p>
            </Card>

            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Pending Dispatch</p>
              <p className="text-2xl font-bold">{report?.filter(r => r.status === "pending").length || 0}</p>
            </Card>

            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-1">In Transit</p>
              <p className="text-2xl font-bold">{report?.filter(r => r.status === "in_transit").length || 0}</p>
            </Card>
          </div>

          {/* Data Table */}
          <Card className="p-6 overflow-x-auto">
            <h3 className="font-semibold mb-4">Dispatch Details</h3>
            {report && report.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Shipment #</th>
                    <th className="px-4 py-2 text-left font-semibold">Customer</th>
                    <th className="px-4 py-2 text-left font-semibold">Status</th>
                    <th className="px-4 py-2 text-right font-semibold">Qty (kg)</th>
                    <th className="px-4 py-2 text-center font-semibold">Cartons</th>
                    <th className="px-4 py-2 text-left font-semibold">Container</th>
                    <th className="px-4 py-2 text-left font-semibold">Dispatch Date</th>
                    <th className="px-4 py-2 text-left font-semibold">Destination</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.map((row: any) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2 font-mono text-xs">{row.shipment_number}</td>
                      <td className="px-4 py-2">{row.customer?.name || "-"}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block px-2 py-1 rounded text-xs ${
                          row.status === "delivered" ? "bg-emerald-500/10 text-emerald-600" :
                          row.status === "in_transit" ? "bg-blue-500/10 text-blue-600" :
                          "bg-amber-500/10 text-amber-600"
                        }`}>
                          {row.status.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">{(row.total_quantity_kg || 0).toFixed(2)}</td>
                      <td className="px-4 py-2 text-center">{row.carton_count || "-"}</td>
                      <td className="px-4 py-2 font-mono text-xs">{row.container_number || "-"}</td>
                      <td className="px-4 py-2">{row.dispatch_date ? format(new Date(row.dispatch_date), "MMM dd, yyyy") : "-"}</td>
                      <td className="px-4 py-2">{row.destination_port || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center py-8 text-muted-foreground">No shipments found</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
