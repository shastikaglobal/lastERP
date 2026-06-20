import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Ship, Package, Globe, Printer, Barcode as BarcodeIcon, ShoppingCart } from "lucide-react";
import Barcode from "react-barcode";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section, FormGrid, FormRow } from "@/components/shared/FormShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type LogisticsTarget = {
  id: string;
  name: string;
  ref: string;
  type: "shipment" | "batch" | "order";
  detail?: string;
  sku?: string;
  product_name?: string;
  quantity?: number;
  packing_details?: string;
  total_cartons?: number;
  unit_net_weight?: number;
};

type LabelSize = {
  id: string;
  label: string;
  widthIn: number;
  heightIn: number;
  widthMm: number;
  heightMm: number;
  barcodeWidth: number;   // react-barcode bar thickness
  barcodeHeight: number;  // react-barcode bar height in px
  fontScale: number;      // multiplier for all text sizes
};

// ─── Physical size definitions ────────────────────────────────────────────────
// barcodeWidth / barcodeHeight tuned so barcode fits at actual print size.

const LABEL_SIZES: LabelSize[] = [
  {
    id: "2x1",
    label: '2 × 1 inch  (5.08 × 2.54 cm)',
    widthIn: 2,  heightIn: 1,
    widthMm: 50.8, heightMm: 25.4,
    barcodeWidth: 0.4, barcodeHeight: 25,
    fontScale: 0.52,
  },
  {
    id: "2x2",
    label: '2 × 2 inch  (5.08 × 5.08 cm)',
    widthIn: 2,  heightIn: 2,
    widthMm: 50.8, heightMm: 50.8,
    barcodeWidth: 0.5, barcodeHeight: 45,
    fontScale: 0.65,
  },
  {
    id: "3x1",
    label: '3 × 1 inch  (7.62 × 2.54 cm)',
    widthIn: 3,  heightIn: 1,
    widthMm: 76.2, heightMm: 25.4,
    barcodeWidth: 0.6, barcodeHeight: 30,
    fontScale: 0.58,
  },
  {
    id: "4x2",
    label: '4 × 2 inch  (10.16 × 5.08 cm)',
    widthIn: 4,  heightIn: 2,
    widthMm: 101.6, heightMm: 50.8,
    barcodeWidth: 0.8, barcodeHeight: 55,
    fontScale: 1,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseWeightFromDetails(details: string): number | null {
  const match = details.toLowerCase().match(/(\d+(\.\d+)?)\s*kg/);
  return match ? parseFloat(match[1]) : null;
}

function LabelContent({
  sizeId, code, idx, boxCount, productName, skuCode, selectedSku, netWeight, packingDate, labelSize
}: any) {
  const fs = labelSize.fontScale;
  const headerPx = Math.round(7 * fs);
  const labelPx = Math.round(6 * fs);
  const valuePx = Math.round(7 * fs);
  const footerPx = Math.round(5 * fs);
  const rowMinH = Math.max(6, Math.round(11 * fs));

  const pDate = packingDate ? packingDate.split('-').reverse().join('-') : "—";
  const pSku = skuCode || selectedSku || "—";
  const pProd = productName || "—";

  if (sizeId === "2x1") {
    return (
      <div className="barcode-label bg-white text-black overflow-hidden flex flex-col justify-between h-full w-full p-1 box-border" style={{ border: '1px solid black' }}>
        <div className="flex justify-between items-center w-full" style={{ fontSize: '8px' }}>
          <div className="font-bold truncate">SGI Pvt Ltd</div>
          <div className="truncate">SKU: {pSku}</div>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 w-full my-0.5">
          <Barcode value={code} width={1} height={30} format="CODE128" displayValue={false} margin={0} background="transparent" lineColor="#000000" />
          <div className="font-mono font-bold text-[9px] mt-0.5 tracking-tight">{code}</div>
        </div>
        <div className="flex justify-between items-center w-full" style={{ fontSize: '8px' }}>
          <div>{netWeight} KG</div>
          <div>{pDate}</div>
        </div>
      </div>
    );
  }

  if (sizeId === "2x2") {
    return (
      <div className="barcode-label bg-white text-black overflow-hidden flex flex-col items-center justify-between h-full w-full p-2 box-border" style={{ border: '1px solid black' }}>
        <div className="text-[11px] font-bold text-center w-full truncate shrink-0">
          Shastika Global Impex Pvt Ltd
        </div>
        <div className="flex flex-col items-center shrink-0 w-full mt-0.5" style={{ fontSize: '10px' }}>
          <div className="text-center font-semibold w-full truncate">{pProd}</div>
          <div className="text-center w-full truncate">SKU: {pSku}</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center w-full my-1">
          <Barcode value={code} width={1.5} height={40} format="CODE128" displayValue={false} margin={0} background="transparent" lineColor="#000000" />
          <div className="font-mono font-bold text-[10px] text-center w-full tracking-widest mt-1 shrink-0">{code}</div>
        </div>
        <div className="flex justify-between items-center w-full border-t border-gray-300 pt-1" style={{ fontSize: '9px' }}>
          <div>BOX {idx + 1} OF {boxCount}</div>
          <div>{netWeight} KG</div>
        </div>
      </div>
    );
  }

  if (sizeId === "3x1") {
    return (
      <div className="barcode-label bg-white text-black overflow-hidden flex items-center justify-between h-full w-full p-1.5 box-border" style={{ border: '1px solid black' }}>
        <div className="flex flex-col h-full justify-center w-[60%] pr-2" style={{ fontSize: '9px', lineHeight: 1.3 }}>
          <div className="font-black uppercase truncate text-[10px] mb-1">Shastika Global Impex Pvt Ltd</div>
          <div className="font-bold truncate">{pProd}</div>
          <div className="truncate">SKU: {pSku}</div>
          <div className="truncate">Weight: {netWeight} KG</div>
          <div className="truncate">Date: {pDate}</div>
        </div>
        <div className="flex flex-col items-center justify-center shrink-0 w-[40%] h-full">
          <Barcode value={code} width={1} height={50} format="CODE128" displayValue={false} margin={0} background="transparent" lineColor="#000000" />
          <div className="font-mono font-bold text-[7px] text-center tracking-tighter mt-1">{code}</div>
        </div>
      </div>
    );
  }

  // Fallback to 4x2
  return (
    <div className="barcode-label bg-white text-black overflow-hidden flex flex-col p-[2px] justify-between h-full w-full box-border border border-black">
      <div
        style={{ fontSize: `${headerPx}px`, letterSpacing: '0.1em' }}
        className="text-gray-500 text-center font-bold uppercase shrink-0 mb-[2px] pt-[2px]"
      >
        Export Cargo Identification
      </div>
      <div className="flex flex-col overflow-hidden" style={{ flex: "0 0 auto" }}>
        {([
          ["COMPANY",      "Shastika Global Impex Pvt Ltd"],
          ["PRODUCT",      pProd],
          ["SKU / CODE",   pSku],
          ["CARTON NO.",   `${idx + 1} OF ${boxCount}`],
          ["NET WEIGHT",   `${netWeight} KG`],
          ["PACKING DATE", pDate],
        ] as [string, string][]).map(([lbl, val]) => (
          <div key={lbl} style={{ minHeight: `${rowMinH}px` }} className="flex border-b border-gray-200 shrink-0">
            <div style={{ fontSize: `${labelPx}px`, lineHeight: 1.1, padding: "1px 2px" }} className="w-[35%] flex items-center text-gray-500 font-semibold">{lbl}</div>
            <div style={{ fontSize: `${valuePx}px`, lineHeight: 1.1, padding: "1px 2px" }} className="w-[65%] flex items-center font-bold truncate text-black">{val}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center justify-center overflow-hidden mt-[2px]" style={{ flex: "1 1 auto", padding: "1px" }}>
        <div style={{ fontSize: `${Math.max(8, headerPx + 1)}px`, letterSpacing: '0.1em', color: '#c1a153' }} className="font-black uppercase mb-[2px]">Logistics Tracking</div>
        <Barcode value={code} width={labelSize.barcodeWidth} height={labelSize.barcodeHeight} format="CODE128" displayValue={false} margin={0} background="transparent" lineColor="#000000" />
        <div style={{ fontSize: `${Math.max(6, valuePx)}px`, letterSpacing: '0.1em' }} className="font-mono font-black text-center mt-[2px]">{code}</div>
      </div>
      <div style={{ fontSize: `${footerPx}px` }} className="text-gray-400 text-center uppercase shrink-0 mt-[2px] pb-[2px]">Official Cargo Identification</div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GenerateBarcode() {
  const nav = useNavigate();
  const qc  = useQueryClient();

  const [targetId,       setTargetId]       = useState<string>("");
  const [totalCartons,   setTotalCartons]   = useState<number>(10);
  const [startCarton,    setStartCarton]    = useState<number>(1);
  const [endCarton,      setEndCarton]      = useState<number>(10);
  const [netWeight,      setNetWeight]      = useState<string>("13.50");
  const [packingDate,    setPackingDate]    = useState<string>(new Date().toISOString().split("T")[0]);
  const [skuCode,        setSkuCode]        = useState<string>("");
  const [productName,    setProductName]    = useState<string>("");
  const [labelSizeId,    setLabelSizeId]    = useState<string>("4x2");
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [showSuccess,    setShowSuccess]    = useState(false);

  const labelSize = useMemo(
    () => LABEL_SIZES.find((s) => s.id === labelSizeId) ?? LABEL_SIZES[3],
    [labelSizeId]
  );

  // ── Fetch targets ─────────────────────────────────────────────────────────
  const { data: targets = [], isLoading } = useQuery<LogisticsTarget[]>({
    queryKey: ["logistics_targets"],
    queryFn: async () => {
      const { data: prof } = await supabase.from("profiles").select("company_id").maybeSingle();
      let companyId: string | null = prof?.company_id ?? null;
      if (!companyId) {
        const { data: cos } = await supabase.from("companies").select("id").limit(1);
        companyId = cos?.[0]?.id ?? null;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { 'Authorization': `Bearer ${session?.access_token}` };

      const [shipResData, batchRes, orderResData, barcodeRes] = await Promise.all([
        fetch(`/api/finance/export_shipments?company_id=${companyId}`, { headers }).then(res => res.json()).catch(() => []),
        supabase
          .from("inventory_batches")
          .select("id, lot_number, quantity_kg, product:products(name, sku)")
          .order("created_at", { ascending: false }).limit(30),
        fetch(`/api/finance/export_orders?company_id=${companyId}`, { headers }).then(res => res.json()).catch(() => []),
        supabase.from("batch_barcodes").select("shipment_id, batch_id"), // ignore order_id to prevent errors if it doesn't exist
      ]);

      const list: LogisticsTarget[] = [];

      (Array.isArray(shipResData) ? shipResData : []).forEach((s: any) => {
        const orderArray = Array.isArray(orderResData) ? orderResData : [];
        const order = orderArray.find((o: any) => o.id === s.order_id);
        const existing = barcodeRes.data?.filter((b) => b.shipment_id === s.id)?.length ?? 0;
        list.push({
          id: s.id,
          name: `Shipment: ${s.shipment_number}`,
          ref: s.shipment_number,
          type: "shipment",
          detail: `Dest: ${s.destination_port ?? "—"} ${existing > 0 ? `(${existing} labels)` : "(Ready)"}`,
          sku: order?.product ?? undefined,
          product_name: order?.product ?? undefined,
          quantity: order?.quantity ?? undefined,
          packing_details: order?.packing_details ?? undefined,
          total_cartons: s.total_cartons ?? order?.total_cartons ?? undefined,
          unit_net_weight: s.unit_net_weight ?? order?.unit_net_weight ?? undefined,
        });
      });

      batchRes.data?.forEach((b) => {
        const existing = barcodeRes.data?.filter((bc) => bc.batch_id === b.id)?.length ?? 0;
        list.push({
          id: b.id,
          name: `Cargo Lot: ${b.lot_number}`,
          ref: b.lot_number,
          type: "batch",
          detail: `Product: ${(b.product as any)?.name ?? "—"} ${existing > 0 ? `(${existing} labels)` : "(Ready)"}`,
          sku: (b.product as any)?.sku ?? undefined,
          product_name: (b.product as any)?.name ?? undefined,
          quantity: b.quantity_kg ?? undefined,
        });
      });

      (Array.isArray(orderResData) ? orderResData : []).forEach((o: any) => {
        list.push({
          id: o.id,
          name: `Export Order: ${o.order_number}`,
          ref: o.order_number,
          type: "order",
          detail: `Dest: ${o.port_of_discharge ?? "—"} (Pending Shipment)`,
          product_name: o.product ?? undefined,
          quantity: o.quantity ?? undefined,
          packing_details: o.packing_details ?? undefined,
          total_cartons: o.total_cartons ?? undefined,
          unit_net_weight: o.unit_net_weight ?? undefined,
        });
      });

      return list;
    },
  });

  const selected = useMemo(
    () => targets.find((t) => t.id === targetId) ?? null,
    [targets, targetId]
  );

  // ── Auto-fill (no netWeight in deps — prevents infinite loop) ────────────
  const applyTargetDefaults = useCallback((t: LogisticsTarget) => {
    if (t.sku)          setSkuCode(t.sku);
    if (t.product_name) setProductName(t.product_name);

    let boxes = 10;
    if (t.type === "shipment" || t.type === "order") {
      if (t.unit_net_weight) {
        setNetWeight(String(t.unit_net_weight));
      } else {
        const parsed = t.packing_details ? parseWeightFromDetails(t.packing_details) : null;
        setNetWeight(String(parsed ?? 13.5));
      }
      if (t.total_cartons) {
        boxes = t.total_cartons;
      } else if (t.quantity) {
        const w = t.unit_net_weight ?? 13.5;
        boxes = Math.max(1, Math.ceil(t.quantity / w));
      }
    } else {
      setNetWeight("10.00");
      if (t.quantity) boxes = Math.max(1, Math.ceil(t.quantity / 10));
    }
    setTotalCartons(boxes);
    setStartCarton(1);
    setEndCarton(boxes);
  }, []);

  // Only apply defaults when the user explicitly changes the target, NOT on background refetch
  const prevTargetId = useRef<string | null>(null);
  useEffect(() => { 
    if (selected && prevTargetId.current !== targetId) {
      applyTargetDefaults(selected);
      prevTargetId.current = targetId;
    }
  }, [selected, targetId, applyTargetDefaults]);

  // ── Generate mutation ─────────────────────────────────────────────────────
  const generate = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select a shipment or cargo lot");

      const { data: prof } = await supabase.from("profiles").select("company_id").maybeSingle();
      let companyId: string | null = prof?.company_id ?? null;
      if (!companyId) {
        const { data: cos } = await supabase.from("companies").select("id").limit(1);
        companyId = cos?.[0]?.id ?? null;
      }
      if (!companyId) throw new Error("No company found. Contact your administrator.");

      const prefix       = selected.type === "shipment" ? "SHP" : "LOT";
      const parsedWeight = parseFloat(netWeight) || 0;

      const count = endCarton - startCarton + 1;
      let currentBatchId = selected.type === 'batch' ? selected.id : null;

      if (selected.type === 'shipment') {
        const shipmentNumber = selected.ref;
        // 1. Check if batch exists for this shipment
        const { data: existingBatch } = await supabase
          .from("shipment_batches")
          .select("id")
          .eq("shipment_id", shipmentNumber)
          .maybeSingle();
        
        if (existingBatch) {
          currentBatchId = existingBatch.id;
        } else {
          // 2. If batch NOT found -> automatically CREATE a new batch record
          console.log("Attempting to auto-create batch for shipment:", shipmentNumber, "UUID was:", selected.id);
          const { data: newBatch, error: batchError } = await supabase
            .from("shipment_batches")
            .insert({
              shipment_id: shipmentNumber,
              shipment_uuid: selected.id,
              status: 'active',
              carton_number_total: totalCartons
            })
            .select("id")
            .single();
            
          if (batchError) {
            console.error("Exact batch error:", batchError);
            throw new Error(`Batch creation failed: ${batchError.message}`);
          }
          currentBatchId = newBatch.id;
        }
      }

      const rows = Array.from({ length: count }, (_, i) => {
        const boxNumber = startCarton + i;
        return {
          company_id:  companyId,
          batch_id:    currentBatchId,
          shipment_id: selected.type === "shipment" ? selected.id : null,
          order_id:    selected.type === "order"    ? selected.id : null,
          code:        `${selected.ref} | ${productName || "Product"} | ${parsedWeight > 0 ? parsedWeight + "KG" : ""} | BOX ${boxNumber}/${totalCartons}`.replace(/ \s+/g, " "),
          level:       "box",
          box_number:  boxNumber,
          current_location: "packing",
          ...(parsedWeight > 0 && { net_weight: parsedWeight }),
          ...(packingDate      && { packing_date: packingDate }),
          ...(skuCode          && { sku_code: skuCode }),
          ...(productName      && { product_name: productName }),
          carton_number_total: totalCartons,
        };
      });

      const codes = rows.map((r) => r.code);
      const { error: barcodeError } = await supabase.from("batch_barcodes").insert(rows);
      if (barcodeError) {
        console.error('Full barcode insert error:', JSON.stringify(barcodeError));
        throw new Error(`Barcode insert failed: ${barcodeError.message}`);
      }
      setGeneratedCodes(codes);
      return rows.length;
    },
    onSuccess: (n) => {
      toast.success(`${n} tracking barcodes generated`);
      qc.invalidateQueries({ queryKey: ["batch_barcodes"] });
      setShowSuccess(true);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to generate"),
  });

  const previewCode = selected
    ? `${selected.ref} | ${productName || "Product"} | ${parseFloat(netWeight) || 0}KG | BOX ${startCarton}/${totalCartons}`.replace(/ \s+/g, " ")
    : "SHP-000 | Product | 10KG | BOX 1/10";

  // ─────────────────────────────────────────────────────────────────────────
  // SUCCESS / PRINT VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (showSuccess) {
    // Physical dimensions for inline styles (mm units honoured at print time)
    const labelStyle: React.CSSProperties = {
      width:           `${labelSize.widthMm}mm`,
      height:          `${labelSize.heightMm}mm`,
      boxSizing:       "border-box",
      pageBreakInside: "avoid",
      breakInside:     "avoid",
      pageBreakAfter:  "always",
      breakAfter:      "page",
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in zoom-in duration-500 print:p-0">

        {/* ── Screen controls (hidden on print) ── */}
        <div className="print:hidden flex flex-col items-center gap-6">
          <div className="p-5 rounded-full bg-primary/10 text-primary">
            <BarcodeIcon className="h-12 w-12" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">Barcodes Ready!</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {generatedCodes.length} labels for <strong>{selected?.ref}</strong> —{" "}
              <strong>{labelSize.label}</strong>
            </p>
          </div>
          <div className="flex gap-3">
            <Button className="btn-gold px-10 h-12" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print All Labels
            </Button>
            <Button variant="outline" className="h-12 px-8 border-white/10" onClick={() => nav("/barcodes")}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* ── Printable sheet ── */}
        <div id="print-sheet" className="hidden print:block">
          {generatedCodes.map((code, idx) => (
            <div key={code} style={labelStyle}>
              <LabelContent
                sizeId={labelSizeId}
                code={code}
                idx={startCarton - 1 + idx}
                boxCount={totalCartons}
                productName={productName}
                skuCode={skuCode}
                selectedSku={selected?.sku}
                netWeight={netWeight}
                packingDate={packingDate}
                labelSize={labelSize}
              />
            </div>
          ))}
        </div>

        {/*
          KEY FIX: @page sets the physical paper/label size the browser sends
          to the printer. margin:0 removes browser default whitespace.
          Each label div is exactly widthMm × heightMm with break-after:page
          so every label prints on its own page / label slot.
        */}
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            #print-sheet, #print-sheet * { visibility: visible !important; }
            #print-sheet {
              position: fixed;
              inset: 0;
              display: block;
              padding: 0;
              margin: 0;
            }
            .barcode-label {
              page-break-after: always;
            }
            @page {
              size: ${labelSize.widthMm}mm ${labelSize.heightMm}mm;
              margin: 0mm;
            }
          }
        `}</style>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN FORM
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cargo Labeling & Tracking"
        description="Generate tracking barcodes for shipments and cargo lots to monitor their logistics journey."
        breadcrumbs={[
          { label: "Logistics", to: "/barcodes" },
          { label: "Generate Labels" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ── Form ── */}
        <Section title="Labeling Options" className="erp-card p-8 pb-16">
          <FormGrid cols={2}>
            <FormRow label="Select Target (Shipment or Lot)" required>
              {isLoading ? (
                <div className="h-12 flex items-center text-xs text-muted-foreground bg-white/5 rounded-lg px-4">
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin text-primary" /> Loading…
                </div>
              ) : (
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger className="h-12 bg-white/5 border-white/10 hover:border-primary/50 transition-all">
                    <SelectValue placeholder="Select shipment or cargo lot…" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-white/10">
                    {targets.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-muted-foreground">No data found.</div>
                    ) : targets.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2 text-white">
                            {t.type === "shipment" && <Ship className="h-4 w-4 text-primary" />}
                            {t.type === "batch" && <Package className="h-4 w-4 text-amber-500" />}
                            {t.type === "order" && <ShoppingCart className="h-4 w-4 text-emerald-500" />}
                          <span className="font-medium">{t.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-2 px-1.5 py-0.5 bg-white/5 rounded">
                            ({t.detail})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormRow>

            <FormRow label="Total Cartons" required>
              <Input
                type="number" min={1} max={5000}
                value={totalCartons}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value || 1));
                  setTotalCartons(val);
                  setEndCarton(Math.min(endCarton, val));
                }}
                className="h-12 bg-white/5 border-white/10 text-lg font-bold text-primary"
              />
            </FormRow>

            <FormRow label="Start Carton No." required>
              <Input
                type="number" min={1} max={totalCartons}
                value={startCarton}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(totalCartons, Number(e.target.value || 1)));
                  setStartCarton(val);
                  if (endCarton < val) setEndCarton(val);
                }}
                className="h-12 bg-white/5 border-white/10 text-lg font-bold"
              />
            </FormRow>

            <FormRow label="End Carton No." required>
              <Input
                type="number" min={startCarton} max={totalCartons}
                value={endCarton}
                onChange={(e) => {
                  const val = Math.max(startCarton, Math.min(totalCartons, Number(e.target.value || startCarton)));
                  setEndCarton(val);
                }}
                className="h-12 bg-white/5 border-white/10 text-lg font-bold"
              />
            </FormRow>

            {/* Label size selector */}
            <FormRow label="Label / Sticker Size" required>
              <Select value={labelSizeId} onValueChange={setLabelSizeId}>
                <SelectTrigger className="h-12 bg-white/5 border-white/10">
                  <SelectValue placeholder="Select sticker size" />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10 text-white">
                  {LABEL_SIZES.map((sz) => (
                    <SelectItem key={sz.id} value={sz.id}>{sz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
          </FormGrid>

          <div className="mt-8 pt-8 border-t border-white/5">
            <h3 className="text-sm font-semibold text-primary mb-4 uppercase tracking-wider">Export Details</h3>
            <FormGrid cols={2}>
              <FormRow label="Product Name" required>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="E.g. Dehusked Coconut"
                  className="h-12 bg-white/5 border-white/10 text-sm"
                />
              </FormRow>
              <FormRow label="Product SKU / Code">
                <Input
                  value={skuCode}
                  onChange={(e) => setSkuCode(e.target.value)}
                  placeholder="Auto-filled from batch"
                  className="h-12 bg-white/5 border-white/10 font-mono text-sm"
                />
              </FormRow>
              <FormRow label="Net Weight (Kg)" required>
                <Input
                  type="number" step="0.01" min={0}
                  value={netWeight}
                  onChange={(e) => setNetWeight(e.target.value)}
                  className="h-12 bg-white/5 border-white/10"
                />
              </FormRow>
              <FormRow label="Packing Date" required>
                <Input
                  type="date"
                  value={packingDate}
                  onChange={(e) => setPackingDate(e.target.value)}
                  className="h-12 bg-white/5 border-white/10"
                />
              </FormRow>
            </FormGrid>
          </div>

          {selected && (
            <div className="mt-8 p-6 rounded-2xl border border-primary/20 bg-primary/5 flex items-start gap-6 animate-in slide-in-from-top-4 duration-500">
              <div className="p-4 rounded-full bg-primary/10 text-primary shadow-lg shadow-primary/20 shrink-0">
                {selected.type === "shipment" ? <Globe className="h-8 w-8" /> : <Package className="h-8 w-8" />}
              </div>
              <div>
                <h4 className="text-xl font-bold text-primary">System Ready</h4>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Will generate <strong>{endCarton - startCarton + 1} barcodes</strong> (Box {startCarton} to {endCarton}) for{" "}
                  <strong>{selected.ref}</strong> on <strong>{labelSize.label}</strong> stickers.
                </p>
              </div>
            </div>
          )}

          <div className="mt-12 flex items-center gap-6">
            <Button
              className="btn-gold px-12 h-14 text-lg shadow-2xl"
              disabled={!targetId || generate.isPending || endCarton < startCarton}
              onClick={() => generate.mutate()}
            >
              {generate.isPending ? (
                <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Processing…</>
              ) : (
                <><BarcodeIcon className="h-5 w-5 mr-2" /> Generate {endCarton - startCarton + 1} Tracking Barcodes</>
              )}
            </Button>
            <Button
              variant="ghost"
              className="h-14 px-8 text-muted-foreground hover:text-white"
              onClick={() => nav("/barcodes")}
            >
              Cancel
            </Button>
          </div>
        </Section>

        {/* ── Live Preview ── */}
        <Section title="Live Label Preview" className="erp-card p-0 overflow-hidden min-h-[500px] flex flex-col">
          {selected ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-black/40 animate-in fade-in duration-500 gap-4">
              {/* Size pill */}
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary uppercase tracking-widest">
                  {labelSize.widthIn}" × {labelSize.heightIn}"
                </span>
                <span className="text-muted-foreground">{labelSize.widthMm} × {labelSize.heightMm} mm</span>
              </div>

              {/* Preview card — aspect-ratio matches chosen physical size */}
              <div
                style={{ aspectRatio: `${labelSize.widthIn} / ${labelSize.heightIn}` }}
                className="w-full max-w-[300px] flex flex-col overflow-hidden shadow-2xl"
              >
                <LabelContent
                  sizeId={labelSizeId}
                  code={previewCode}
                  idx={0}
                  boxCount={totalCartons}
                  productName={productName}
                  skuCode={skuCode}
                  selectedSku={selected?.sku}
                  netWeight={netWeight}
                  packingDate={packingDate}
                  labelSize={labelSize}
                />
              </div>

              <p className="text-[10px] text-muted-foreground text-center max-w-[220px] leading-relaxed">
                Preview aspect ratio matches <strong>{labelSize.label}</strong>.
                Printed label will be exactly that physical size.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-muted-foreground gap-6">
              <div className="p-8 rounded-full bg-white/2 border border-white/5">
                <BarcodeIcon className="h-16 w-16 opacity-10" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-white/50">Preview Pending</p>
                <p className="text-xs max-w-[200px] mx-auto">
                  Select a shipment to see how your labels will look.
                </p>
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}