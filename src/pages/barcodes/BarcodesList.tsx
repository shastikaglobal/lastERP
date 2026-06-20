import { useNavigate } from "react-router-dom";
import { Loader2, QrCode, Plus, ScanLine, Printer, Ship, Package, Globe } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export default function BarcodesList() {
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState("all");

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["batch_barcodes"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("batch_barcodes")
          .select(`
            id, code, level, box_number, current_location, status, scan_count, last_scanned_at, created_at, 
            batch:inventory_batches(lot_number, grade, product:products(name), farmer:farmers(full_name)), 
            shipment:export_shipments(id, shipment_number, destination_port, status),
            order:export_orders(id, order_number, destination, status)
          `)
          .order("created_at", { ascending: false });
        
        if (error) {
          console.error("Database query failed:", error);
          return [];
        }
        return data as any[];
      } catch (err) {
        console.error("Unexpected error:", err);
        return [];
      }
    },
  });

  if (error) {
    return (
      <div className="p-8 text-center bg-destructive/10 text-destructive rounded-2xl border border-destructive/20">
        <p className="font-bold">Database Error</p>
        <p className="text-sm">Please refresh the page or check your connection.</p>
      </div>
    );
  }

  const inTransit = data.filter(r => r.shipment && r.shipment.status !== 'Delivered');
  const readyForDispatch = data.filter(r => !r.shipment);
  const filteredData = activeTab === "transit" ? inTransit : activeTab === "ready" ? readyForDispatch : data;

  const columns = [
    {
      key: "code",
      header: "Tracking ID",
      render: (r: any) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs text-primary-glow">{r.code}</span>
          <span className="text-[10px] text-muted-foreground capitalize">{r.level}{r.box_number != null ? ` · Box #${r.box_number}` : ""}</span>
        </div>
      ),
    },
    {
      key: "product",
      header: "Product / Lot",
      render: (r: any) => (
        <div className="flex flex-col">
          <span className="font-medium text-xs">{r.batch?.product?.name || "—"}</span>
          <span className="text-[10px] font-mono text-muted-foreground">{r.batch?.lot_number || "—"}</span>
        </div>
      ),
    },
    {
      key: "shipment",
      header: "Shipment / Order",
      render: (r: any) => r.shipment ? (
        <div className="flex flex-col gap-1">
          <Button
            variant="link"
            className="h-auto p-0 text-xs font-mono text-primary justify-start"
            onClick={() => nav(`/shipments/${r.shipment.id}`)}
          >
            <Ship className="h-3 w-3 mr-1" />
            {r.shipment.shipment_number}
          </Button>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Globe className="h-2.5 w-2.5" /> {r.shipment.destination_port || "—"}
          </span>
        </div>
      ) : r.order ? (
        <div className="flex flex-col gap-1">
          <Button
            variant="link"
            className="h-auto p-0 text-xs font-mono text-emerald-500 justify-start"
            onClick={() => nav(`/orders/${r.order.id}`)}
          >
            <Package className="h-3 w-3 mr-1" />
            {r.order.order_number}
          </Button>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Globe className="h-2.5 w-2.5" /> {r.order.destination || "—"}
          </span>
        </div>
      ) : (
        <span className="text-[10px] font-medium text-amber-500/80 uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/5 border border-amber-500/20">
          Unassigned
        </span>
      ),
    },
    {
      key: "loc",
      header: "Current Location",
      render: (r: any) => <StatusBadge status={r.current_location} />,
    },
    {
      key: "last_scan",
      header: "Last Scan",
      render: (r: any) => (
        <div className="flex flex-col">
          <span className="text-xs tabular-nums">{r.scan_count} scans</span>
          {r.last_scanned_at && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(r.last_scanned_at).toLocaleDateString()}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (r: any) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => nav(`/barcodes/${r.id}`)}
          className="h-7 px-2"
        >
          <Printer className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
          Label
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cargo & Shipment Tracking"
        description="Real-time monitoring of all cargo items from production to delivery."
        breadcrumbs={[{ label: "Logistics" }, { label: "Tracking" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => nav("/barcodes/scan")}>
              <ScanLine className="h-4 w-4 mr-1.5" /> Scan QR
            </Button>
            <Button size="sm" className="btn-gold" onClick={() => nav("/barcodes/generate")}>
              <Plus className="h-4 w-4 mr-1.5" /> New QR
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-card border">
            <TabsTrigger value="all" className="text-xs">
              <Globe className="h-3.5 w-3.5 mr-1.5" /> All Cargo
            </TabsTrigger>
            <TabsTrigger value="transit" className="text-xs">
              <Ship className="h-3.5 w-3.5 mr-1.5" /> In Transit
              {inTransit.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px]">
                  {inTransit.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="ready" className="text-xs">
              <Package className="h-3.5 w-3.5 mr-1.5" /> Ready for Dispatch
            </TabsTrigger>
          </TabsList>
        </div>

        {isLoading ? (
          <div className="erp-card flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={<QrCode className="h-5 w-5" />}
            title="No cargo found"
            description="Start by generating tracking labels for your recent shipments or cargo lots."
            action={
              <Button size="sm" className="btn-gold" onClick={() => nav("/barcodes/generate")}>
                <Plus className="h-4 w-4 mr-1.5" /> Generate Labels
              </Button>
            }
          />
        ) : (
          <TabsContent value={activeTab} className="mt-0">
            <DataTable
              data={filteredData}
              searchKeys={["code", "shipment.shipment_number"] as any}
              columns={columns}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
