import React, { useRef, useState } from "react";
import { Download, X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Loader2 } from "lucide-react";

interface QuotationDocumentProps {
  quotation: any;
  onClose: () => void;
}

export function QuotationDocument({ quotation, onClose }: QuotationDocumentProps) {
  if (!quotation) return null;
  const docRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!docRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(docRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Quotation-${quotation.quotation_number || "download"}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setDownloading(false);
    }
  };

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const validityDate = quotation.valid_until
    ? new Date(quotation.valid_until).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    : "TBD";

  const totalAmount = Number(quotation.amount || 0);
  const currencySym =
    quotation.currency === "USD"
      ? "USD"
      : quotation.currency === "EUR"
        ? "Euro"
        : quotation.currency || "INR";
  const items = quotation.quotation_items || quotation.items || [];

  const subtotal = Number(quotation.subtotal || 0);
  const taxRate = Number(quotation.tax_rate || 0);
  const taxAmount = Number(quotation.tax_amount || 0);

  const getAlphaIndex = (index: number) => String.fromCharCode(65 + index);

  // Packing info lines
  const packingLines = [
    quotation.packaging_type ? `Packing Type : ${quotation.packaging_type}` : null,
    quotation.net_weight ? `Net Weight : ${quotation.net_weight}` : null,
    quotation.packing_per_bag ? `1 Bag – ${quotation.packing_per_bag} Pieces` : null,
    quotation.bag_weight ? `1 Bag – ${quotation.bag_weight} Kg` : null,
  ].filter(Boolean);

  return (
    <div
      style={{
        background: "#f0f2f5",
        color: "black",
        minHeight: "100vh",
        padding: "40px 20px",
        fontFamily: "'Calibri', 'Segoe UI', sans-serif",
      }}
      className="flex flex-col items-center print:bg-white print:p-0"
    >
      {/* Top Controls */}
      <div className="mb-6 w-full max-w-[210mm] flex justify-between items-center px-4 print:hidden">
        <Button
          variant="outline"
          onClick={onClose}
          className="rounded-full border-[#1A5276] text-[#1A5276] hover:bg-[#1A5276]/5"
        >
          <X className="h-4 w-4 mr-2" /> Close
        </Button>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="rounded-full border-[#1A5276] text-[#1A5276] hover:bg-[#1A5276]/5"
          >
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="bg-[#1A5276] text-white hover:bg-[#154360] shadow-lg rounded-full px-6 min-w-[160px]"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {downloading ? "Generating PDF..." : "Save as PDF"}
          </Button>
        </div>
      </div>

      {/* Document */}
      <div
        ref={docRef}
        className="relative bg-white w-full max-w-[210mm] shadow-2xl print:shadow-none text-black"
        style={{ border: "1.5px solid #000" }}
      >
        {/* ── HEADER ROW ── */}
        <div className="grid" style={{ gridTemplateColumns: "55% 45%", borderBottom: "1.5px solid #000" }}>
          {/* Left: Company name + address */}
          <div className="p-4" style={{ borderRight: "1.5px solid #000", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h1
              style={{
                color: "#1F618D",
                fontSize: "14px",
                fontWeight: 800,
                letterSpacing: "0.03em",
                marginBottom: "10px",
                textTransform: "uppercase",
                textAlign: "center"
              }}
            >
              SHASTIKA GLOBAL IMPEX PRIVATE LIMITED
            </h1>
            <div className="flex items-center gap-4">
              <div style={{ width: "72px", flexShrink: 0 }}>
                <img src="/logo.webp" alt="Logo" style={{ width: "100%", height: "auto", objectFit: "contain" }} />
              </div>
              <div style={{ fontSize: "9px", lineHeight: "1.7", color: "#000" }}>
                <div>Address: 41/1,ST-5, Sathy Athani Main Road,</div>
                <div style={{ paddingLeft: "35px" }}>Thuckanayakanpalayam</div>
                <div style={{ paddingLeft: "35px" }}>Erode - 638506, Tamil Nadu, India.</div>
                <div>Phone no : <strong>+91 7397612015</strong></div>
                <div>GSTIN : <strong>33ABPCS0605LIZ8</strong></div>
              </div>
            </div>
          </div>

          {/* Right: quotation title + details */}
          <div className="p-4 flex flex-col items-center justify-start">
            <h2
              style={{
                color: "#1F618D",
                fontSize: "16px",
                fontWeight: 700,
                marginBottom: "14px",
                textAlign: "center",
              }}
            >
              QUOTATION
            </h2>
            <div style={{ fontSize: "9.5px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", marginBottom: "8px" }}>
                <span>Quotation No :</span>
                <span style={{ fontWeight: 700 }}>{quotation.quotation_number || "—"}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", marginBottom: "8px" }}>
                <span>DATE :</span>
                <span style={{ fontWeight: 700 }}>{today}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", marginBottom: "4px" }}>
                <span>VALID UNTIL :</span>
                <span style={{ fontWeight: 700 }}>{validityDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION HEADERS ROW ── */}
        <div
          className="grid"
          style={{ gridTemplateColumns: "33% 34% 33%", borderBottom: "1.5px solid #000" }}
        >
          {["BILL TO :", "SHIPMENT & TRADE TERMS", "Packing Type"].map((label, i) => (
            <div
              key={i}
              style={{
                padding: "5px 8px",
                fontSize: "9.5px",
                fontWeight: 700,
                color: i < 2 ? "#1F618D" : "#000",
                textAlign: "center",
                borderRight: i < 2 ? "1.5px solid #000" : "none",
                background: "transparent",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* ── BILL TO / SHIPMENT / PACKING ROW ── */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: "33% 34% 33%",
            borderBottom: "1.5px solid #000",
            minHeight: "150px",
          }}
        >
          {/* Bill To */}
          <div style={{ padding: "10px", color: "#000" }}>
            <div style={{ marginBottom: "16px", whiteSpace: "pre-wrap" }}>
              {quotation.customer?.address || quotation.customer_address || ""}
            </div>
            {(quotation.customer_phone || quotation.customer?.phone) && (
              <div>Phone no : <strong>{quotation.customer_phone || quotation.customer?.phone}</strong></div>
            )}
          </div>

          {/* Shipment & Trade Terms */}
          <div style={{ padding: "10px", borderRight: "1px solid #000", fontSize: "9.5px", lineHeight: "1.9" }}>
            <div style={{ marginBottom: "12px" }}>Country of Origin : <span style={{ color: "#000" }}>{quotation.country_of_origin || "India"}</span></div>
            <div style={{ marginBottom: "12px" }}>Mode of Transport : <span style={{ color: "#000" }}>{quotation.mode_of_transport || quotation.shipment_type || "—"}</span></div>
            <div style={{ marginBottom: "12px" }}>
              <span style={{ color: "#000" }}>
                Incoterms : {quotation.incoterms || quotation.incoterm || ""}
              </span>
            </div>
            <div style={{ marginBottom: "4px" }}>Port of Loading : <span style={{ color: "#000" }}>{quotation.port_of_loading || "—"}</span></div>
            <div style={{ marginBottom: "4px" }}>Port of Discharge : <span style={{ color: "#000" }}>{quotation.port_of_discharge || "—"}</span></div>
            {quotation.estimated_shipment_date && (
              <div style={{ marginBottom: "4px" }}>Estimated shipment date : <span style={{ color: "#000" }}>{quotation.estimated_shipment_date}</span></div>
            )}
          </div>

          {/* Packing Type */}
          <div style={{ padding: "10px", fontSize: "9.5px", lineHeight: "1.9", textAlign: "center" }}>
            {packingLines.length > 0
              ? packingLines.map((line, i) => <div key={i} style={{ marginBottom: "2px" }}>{line}</div>)
              : (
                <>
                  <div style={{ marginBottom: "2px" }}>Packing Type : {quotation.packaging_type || "—"}</div>
                  <div style={{ marginBottom: "2px" }}>Net Weight : {quotation.net_weight || "—"}</div>
                </>
              )}
          </div>
        </div>

        {/* ── ITEMS TABLE ── */}
        <div style={{ borderBottom: "1.5px solid #000" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <thead>
              <tr style={{ background: "transparent", borderBottom: "1.5px solid #000" }}>
                {[
                  { label: "A", w: "5%" },
                  { label: "B", w: "33%", align: "left" },
                  { label: "C", w: "12%" },
                  { label: "D", w: "15%" },
                  { label: "E", w: "10%" },
                  { label: "F", w: "12%" },
                  { label: "G", w: "13%" },
                ].map((col, i, arr) => (
                  <th
                    key={i}
                    style={{
                      padding: "6px 4px",
                      fontSize: "8.5px",
                      fontWeight: 700,
                      color: "#1F618D",
                      textTransform: "uppercase",
                      textAlign: (col.align as any) || "center",
                      borderRight: i < arr.length - 1 ? "1px solid #000" : "none",
                      width: col.w,
                      paddingLeft: col.align === "left" ? "8px" : "4px",
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, i: number) => (
                <tr key={i} style={{ borderBottom: "1px solid #000", minHeight: "36px" }}>
                  <td style={{ textAlign: "center", padding: "6px 2px", fontSize: "9px", borderRight: "1px solid #000" }}>{getAlphaIndex(i)}</td>
                  <td style={{ padding: "6px 8px", fontSize: "9px", borderRight: "1px solid #000", wordBreak: "break-word" }}>
                    {item.description || item.product?.name || item.products?.name || item.product_name || "Product"}
                  </td>
                  <td style={{ textAlign: "center", padding: "6px 2px", fontSize: "9px", fontFamily: "monospace", borderRight: "1px solid #000" }}>
                    {item.hsn_code || item.product?.hs_code || item.products?.hs_code || "—"}
                  </td>
                  <td style={{ textAlign: "center", padding: "6px 2px", fontSize: "9px", fontWeight: 700, borderRight: "1px solid #000" }}>
                    {item.quantity} {item.unit || ""}
                  </td>
                  <td style={{ textAlign: "center", padding: "6px 2px", fontSize: "9px", borderRight: "1px solid #000" }}>
                    {item.unit_label || item.unit_type || "1 bag"}
                  </td>
                  <td style={{ textAlign: "right", padding: "6px 6px", fontSize: "9px", fontWeight: 700, borderRight: "1px solid #000" }}>
                    {Number(item.unit_price).toFixed(2)} {currencySym}
                  </td>
                  <td style={{ textAlign: "right", padding: "6px 6px", fontSize: "9px", fontWeight: 700 }}>
                    {Number(item.total_price || item.quantity * item.unit_price).toFixed(2)} {currencySym}
                  </td>
                </tr>
              ))}
              {/* Empty filler rows */}
              {[...Array(Math.max(0, 9 - items.length))].map((_, i) => (
                <tr key={`e-${i}`} style={{ borderBottom: "1px solid #000", height: "28px" }}>
                  {[...Array(7)].map((__, j) => (
                    <td key={j} style={{ borderRight: j < 6 ? "1px solid #000" : "none" }} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── FOOTER ROW ── */}
        <div className="grid" style={{ gridTemplateColumns: "55% 45%" }}>
          {/* Left: Terms of Payment + Declaration */}
          <div style={{ borderRight: "1px solid #000" }}>
            <div
              style={{
                padding: "6px 10px 2px",
                fontSize: "9.5px",
                fontWeight: 700,
                color: "#1F618D",
                borderBottom: "1px solid #000",
              }}
            >
              Terms of Payment
            </div>
            <div style={{ padding: "6px 10px 10px", fontSize: "9px", lineHeight: "1.7", color: "#000", borderBottom: "1px solid #000", minHeight: "50px" }}>
              {quotation.payment_terms || "Standard payment terms apply."}
            </div>
            {quotation.notes && (
              <div style={{ padding: "4px 10px 6px", fontSize: "9px", color: "#000", borderBottom: "1px solid #000" }}>
                Note : {quotation.notes}
              </div>
            )}
            <div style={{ padding: "6px 10px 10px", fontSize: "9px", color: "#000", lineHeight: "1.6" }}>
              <strong>Declaration :</strong> We hereby certify that the goods mentioned above are of Indian origin and the price and details stated in this  quotation are true and correct.
            </div>
          </div>

          {/* Right: Totals */}
          <div>
            {/* SUB TOTAL */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "5px 10px", fontSize: "9.5px", borderBottom: "1px solid #000" }}>
              <span style={{ fontWeight: 600 }}>SUB TOTAL</span>
              <span style={{ textAlign: "right", fontWeight: 600 }}>{subtotal > 0 ? `${subtotal.toLocaleString()} ${currencySym}` : ""}</span>
            </div>
            {/* Tax Rate */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "5px 10px", fontSize: "9.5px", borderBottom: "1px solid #000" }}>
              <span style={{ fontWeight: 600 }}>Tax Rate</span>
              <span style={{ textAlign: "right", fontWeight: 600 }}>{taxRate.toFixed(2)}%</span>
            </div>
            {/* Tax */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "5px 10px", fontSize: "9.5px", borderBottom: "1px solid #000" }}>
              <span style={{ fontWeight: 600 }}>Tax</span>
              <span style={{ textAlign: "right", fontWeight: 600 }}>{taxAmount.toFixed(2)}%</span>
            </div>
            {/* Total */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                padding: "6px 10px",
                fontSize: "10px",
                fontWeight: 800,
                background: "#BDD7EE",
                color: "#000",
                borderBottom: "1px solid #000",
              }}
            >
              <span>Total</span>
              <span style={{ textAlign: "right" }}>{totalAmount.toLocaleString()} {currencySym}</span>
            </div>

            {/* Signature block */}
            <div style={{ padding: "10px", fontSize: "9px" }}>
              <div style={{ fontWeight: 700, textTransform: "uppercase", marginBottom: "25px" }}>
                FOR SHASTIKA GLOBAL IMPEX PRIVATE LIMITED
              </div>
              <div style={{ marginBottom: "10px" }}>
                <span style={{ fontWeight: 600 }}>Authorized Signatory :</span>
              </div>
              <div>
                <span style={{ fontWeight: 600 }}>Seal &amp; Sign :</span>
              </div>
            </div>
          </div>
        </div>

        {/* Watermark */}
        <div
          style={{
            position: "absolute",
            top: "35%",
            left: "20%",
            right: "20%",
            zIndex: 0,
            opacity: 0.07,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <img src="/logo.webp" alt="Watermark" style={{ width: "100%", height: "auto", objectFit: "contain" }} />
        </div>
      </div>
    </div>
  );
}
