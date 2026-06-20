import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera, CameraOff, Loader2, ScanLine, ShieldCheck, X,
  Ship, Container as ContainerIcon, Link2, Link2Off, Globe,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section } from "@/components/shared/FormShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";

/* ─── Types ─────────────────────────────────────────────────── */
type ActiveShipment = { id: string; shipment_number: string; destination_port: string; status: string };
type ShipmentContainer = { id: string; container_number: string; container_type: string };

/* ─── Constants ──────────────────────────────────────────────── */
const LOCATIONS = [
  { value: "storage",    label: "Storage" },
  { value: "picking",    label: "Picking" },
  { value: "packing",    label: "Packing" },
  { value: "dispatch",   label: "Dispatch" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivered",  label: "Delivered" },
];

/* ═══════════════════════════════════════════════════════════════ */
export default function ScanBarcode() {
  const nav = useNavigate();

  // scanner state
  const [code, setCode]           = useState("");
  const [updateLoc, setUpdateLoc] = useState<string>("none");
  const [result, setResult]       = useState<any | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning]   = useState(false);
  const [busy, setBusy]           = useState(false);
  const scannerRef                = useRef<Html5Qrcode | null>(null);

  // shipment linking state
  const [shipmentId, setShipmentId]   = useState<string>("none");
  const [containerId, setContainerId] = useState<string>("none");

  /* ── Active shipments (not yet delivered) ── */
  const { data: activeShipments = [], isLoading: shipsLoading } = useQuery<ActiveShipment[]>({
    queryKey: ["active_shipments_scan"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("export_shipments")
        .select("id, shipment_number, destination_port, status")
        .neq("status", "Delivered")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as ActiveShipment[];
    },
  });

  /* ── Containers for selected shipment ── */
  const { data: shipContainers = [] } = useQuery<ShipmentContainer[]>({
    queryKey: ["scan_containers", shipmentId],
    enabled: shipmentId !== "none",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("export_containers")
        .select("id, container_number, container_type")
        .eq("shipment_id", shipmentId);
      if (error) throw error;
      return (data ?? []) as ShipmentContainer[];
    },
  });

  // Reset container when shipment changes
  useEffect(() => { setContainerId("none"); }, [shipmentId]);

  /* ── Submit scan ── */
  const submit = async (raw: string) => {
    if (!raw) return;
    setBusy(true);
    setScanError(null);
    setResult(null);
    try {
      const { data, error } = await supabase
        .from('batch_barcodes')
        .select('*')
        .eq('code', raw)
        .single();
        
      if (error || !data) {
        setScanError("Barcode not found in system");
        return;
      }
      
      setResult(data);
      
      // Optional: Update location/shipment if selected
      if (updateLoc !== "none" || shipmentId !== "none") {
         const updates: any = {};
         if (updateLoc !== "none") updates.current_location = updateLoc;
         if (shipmentId !== "none") updates.shipment_id = shipmentId;
         await supabase.from('batch_barcodes').update(updates).eq('id', data.id);
      }
    } catch (e: any) {
      setScanError("Barcode not found in system");
    } finally {
      setBusy(false);
    }
  };

  /* ── Camera ── */
  const startCamera = async () => {
    setScanning(true);
    try {
      const el = document.getElementById("qr-reader");
      if (!el) return;
      const inst = new Html5Qrcode("qr-reader");
      scannerRef.current = inst;
      await inst.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decoded) => { await stopCamera(); setCode(decoded); submit(decoded); },
        () => { /* ignore partial decode */ }
      );
    } catch (e: any) {
      toast.error("Camera unavailable", { description: e?.message ?? "Permission denied" });
      setScanning(false);
    }
  };

  const stopCamera = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch { /* noop */ }
    setScanning(false);
  };

  useEffect(() => () => { stopCamera(); }, []);

  const isLinked = shipmentId !== "none";

  return (
    <div>
      <PageHeader
        title="Scan QR"
        description="Scan a barcode and optionally link it to a shipment & container."
        breadcrumbs={[{ label: "Barcode & Tracking", to: "/barcodes" }, { label: "Scan" }]}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        {/* ── Left: scanner + options ── */}
        <div className="space-y-4">
          <Section title="Scanner">
            <div className="space-y-4">
              {/* Camera button */}
              {!scanning ? (
                <Button size="lg" className="btn-gold w-full h-16 text-base" onClick={startCamera}>
                  <Camera className="h-6 w-6 mr-2" /> Start camera scan
                </Button>
              ) : (
                <Button size="lg" variant="outline" className="w-full h-16 text-base" onClick={stopCamera}>
                  <CameraOff className="h-6 w-6 mr-2" /> Stop camera
                </Button>
              )}

              {/* Camera viewfinder */}
              <div
                id="qr-reader"
                className="w-full rounded-md overflow-hidden bg-black [&_video]:w-full [&_video]:h-auto"
                style={{ minHeight: scanning ? 240 : 0 }}
              />

              {/* Manual input */}
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">Or enter code manually</div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="SGI|B|LOT-001|A|…"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="font-mono text-xs"
                    onKeyDown={(e) => e.key === "Enter" && submit(code.trim())}
                  />
                  <Button
                    onClick={() => submit(code.trim())}
                    disabled={busy || !code.trim()}
                    className="btn-gold"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Location update */}
              <div className="space-y-1.5">
                <div className="text-xs font-medium">Update location on scan</div>
                <Select value={updateLoc} onValueChange={setUpdateLoc}>
                  <SelectTrigger><SelectValue placeholder="Keep current" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keep current</SelectItem>
                    {LOCATIONS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>

          {/* ── Shipment linking panel ── */}
          <Section title={
            <span className="flex items-center gap-2">
              {isLinked
                ? <Link2 className="h-4 w-4 text-primary" />
                : <Link2Off className="h-4 w-4 text-muted-foreground" />}
              Link to Shipment
              {isLinked && (
                <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 text-[10px]">
                  Active
                </Badge>
              )}
            </span>
          }>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                When set, each scan will auto-link this barcode to the chosen shipment and log a tracking event.
              </p>

              {/* Shipment select */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium flex items-center gap-1.5">
                  <Ship className="h-3.5 w-3.5" /> Shipment (optional)
                </label>
                <Select value={shipmentId} onValueChange={setShipmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder={shipsLoading ? "Loading…" : "None — scan without linking"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None — scan without linking</SelectItem>
                    {activeShipments.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.shipment_number} · {s.destination_port}
                        <span className="ml-2 text-muted-foreground text-[10px]">({s.status})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Container select — only when shipment chosen */}
              {shipmentId !== "none" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium flex items-center gap-1.5">
                    <ContainerIcon className="h-3.5 w-3.5" /> Container (optional)
                  </label>
                  <Select value={containerId} onValueChange={setContainerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="No specific container" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific container</SelectItem>
                      {shipContainers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.container_number} · {c.container_type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* ── Right: result ── */}
        <Section title="Result">
          {scanError ? (
            <div className="h-80 flex flex-col items-center justify-center text-center text-red-500 font-bold gap-3">
              <ScanLine className="h-10 w-10 opacity-40" />
              {scanError}
            </div>
          ) : !result ? (
            <div className="h-80 flex flex-col items-center justify-center text-center text-xs text-muted-foreground gap-3">
              <ScanLine className="h-10 w-10 opacity-40" />
              Scan or enter a code to see batch details
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-emerald-500 font-bold text-lg mb-4">
                <ShieldCheck className="h-6 w-6" /> ✓ Cargo Identified
              </div>

              <div className="bg-white rounded-2xl overflow-hidden shadow-2xl p-6 text-black border border-gray-200">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="py-3 font-semibold text-gray-500 uppercase text-[10px] tracking-wider w-1/3">Company Name</td>
                      <td className="py-3 font-bold text-gray-900">Shastika Global Impex Pvt Ltd</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-semibold text-gray-500 uppercase text-[10px] tracking-wider">Product Name</td>
                      <td className="py-3 font-bold text-gray-900">{result.product_name || "—"}</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-semibold text-gray-500 uppercase text-[10px] tracking-wider">SKU / Product Code</td>
                      <td className="py-3 font-mono text-gray-700">{result.sku_code || "—"}</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-semibold text-gray-500 uppercase text-[10px] tracking-wider">Carton Number</td>
                      <td className="py-3 font-bold text-gray-900">
                        {result.box_number} / {result.carton_number_total || "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 font-semibold text-gray-500 uppercase text-[10px] tracking-wider">Net Weight</td>
                      <td className="py-3 font-bold text-gray-900">{result.net_weight ? `${result.net_weight} KG` : "—"}</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-semibold text-gray-500 uppercase text-[10px] tracking-wider">Packing Date</td>
                      <td className="py-3 font-bold text-gray-900">
                        {result.packing_date 
                          ? new Date(result.packing_date).toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') 
                          : "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 font-semibold text-gray-500 uppercase text-[10px] tracking-wider">Barcode Number</td>
                      <td className="py-3 font-mono font-bold tracking-widest text-gray-900">{result.code}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button size="sm" className="btn-gold" onClick={() => nav(`/barcodes/${result.id}`)}>
                  Open barcode
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setResult(null); setCode(""); setScanError(null); }}>
                  <X className="h-4 w-4 mr-1" /> Clear
                </Button>
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
