import React, { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Loader2, Download, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const initialForm = {
  invoiceNo: "SGI/CI/2026/001",
  date: new Date().toISOString().slice(0, 10),
  currency: "AUD",
  importerName: "Byve Australia Pty Ltd",
  importerAddress: "12 Twickenham Close, Normanhurst,\nNSW 2076, Australia",
  importerCountry: "Australia",
  countryOfOrigin: "India",
  modeOfTransport: "Sea Freight",
  incoterms: "FOB – Chennai Port, India",
  portOfLoading: "Chennai Port, India",
  portOfDischarge: "Sydney Port, Australia",
  containerType: "20 or 40 Feet FCL Container",
  loadingType: "1 cubic meter",
  paymentTerms: "90% Advance + 10% on Loading",
  bankName: "State Bank of India",
  branch: "Erode, Tamil Nadu",
  accountNo: "43841179923",
  ifscCode: "SBIN02278",
  swiftCode: "SBININBB",
  items: [
    {
      id: 1,
      description: "Fresh Coconuts",
      hsCode: "0801.19.00",
      noOfPkgs: "17 Cartons",
      qty: "850 Nos",
      unit: "Per Coconut",
      unitPrice: "0.716",
    },
  ],
  packingType: "Carton Box",
  noOfCartons: "17",
  unitsPerCarton: "50 Nos",
  containerTypePacking: "20 or 40 Feet FCL",
  netWtPerUnit: "500 g",
  netWtPerCarton: "25 Kg (50 x 500g)",
  grossWtPerCarton: "26.40 Kg (incl. packing)",
  totalNetWeight: "425 Kg",
  totalGrossWeight: "448.8 Kg",
};

const EXPORTER = {
  name: "Shastika Global Impex Private Limited",
  address: "41/1, ST-5, Sathy Athani Main Road,\nThuckanayakanpalayam, Erode – 638506,\nTamil Nadu, India",
  phone: "+91 7397612015",
  gstin: "33ABPCS0605LIZ8",
};

const CURRENCIES = ["AUD", "USD", "EUR", "GBP", "SGD", "JPY"];
const UNITS = ["Per Coconut", "Per Kg", "Per Piece", "Per Box", "Per Carton"];
const INCOTERMS_OPTIONS = [
  "FOB – Chennai Port, India",
  "CIF",
  "EXW",
  "CFR",
  "DAP",
];

export default function InvoicePreview() {
  const { id } = useParams();
  const [view, setView] = useState("print");
  const [form, setForm] = useState(initialForm);
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  // Helper to determine direct API target when running locally
  const getApiUrl = (path: string) => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocalhost ? `http://localhost:8082${path}` : path;
  };

  useEffect(() => {
    async function fetchSignature() {
      const { data } = await supabase.from('companies').select('signature_url').limit(1).maybeSingle();
      if (data?.signature_url) {
        setSignatureUrl(data.signature_url);
      }
    }
    fetchSignature();
  }, []);

  useEffect(() => {
    if (!id) return;
    
    async function fetchInvoice() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const res = await fetch(getApiUrl(`/api/orders/${id}`), { headers });
        if (!res.ok) throw new Error("Failed to fetch invoice details");
        const order = await res.json();

        setForm({
          invoiceNo: order.invoice_number || order.order_number?.replace('EXP', 'PI') || "SGI/CI/2026/001",
          date: order.order_date ? new Date(order.order_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          currency: order.currency || "USD",
          importerName: order.customer_name || "",
          importerAddress: order.shipping_address || "",
          importerCountry: order.customer_country || "",
          countryOfOrigin: order.country_of_origin || "India",
          modeOfTransport: order.mode_of_transport || "Sea Freight",
          incoterms: order.incoterms || "FOB – Chennai Port, India",
          portOfLoading: order.port_of_loading || "Chennai Port, India",
          portOfDischarge: order.port_of_discharge || "",
          containerType: order.container_type || "20 or 40 Feet FCL Container",
          loadingType: order.loading_type || "1 cubic meter",
          paymentTerms: order.payment_terms || "90% Advance + 10% on Loading",
          bankName: order.bank_name || "State Bank of India",
          branch: order.bank_branch || "Erode, Tamil Nadu",
          accountNo: order.account_no || "43841179923",
          ifscCode: order.ifsc_code || "SBIN02278",
          swiftCode: order.swift_code || "SBININBB",
          items: [
            {
              id: 1,
              description: order.product || "",
              hsCode: order.hsn_code || "",
              noOfPkgs: order.total_cartons ? `${order.total_cartons} Cartons` : "",
              qty: order.quantity ? String(order.quantity) : "",
              unit: order.unit || "Per Coconut",
              unitPrice: order.unit_price ? String(order.unit_price) : "",
            }
          ],
          packingType: order.packing_details || "Carton Box",
          noOfCartons: order.total_cartons ? String(order.total_cartons) : "",
          unitsPerCarton: order.qty_per_carton ? String(order.qty_per_carton) : "",
          containerTypePacking: order.container_type || "20 or 40 Feet FCL",
          netWtPerUnit: order.unit_net_weight ? String(order.unit_net_weight) : "",
          netWtPerCarton: order.net_weight ? String(order.net_weight) : "",
          grossWtPerCarton: order.gross_weight_per_carton ? String(order.gross_weight_per_carton) : "",
          totalNetWeight: order.total_net_weight ? `${order.total_net_weight} Kg` : `${(parseFloat(order.total_cartons || 0) * parseFloat(order.net_weight || 0)).toFixed(2)} Kg`,
          totalGrossWeight: order.total_gross_weight ? `${order.total_gross_weight} Kg` : `${(parseFloat(order.total_cartons || 0) * parseFloat(order.gross_weight_per_carton || 0)).toFixed(2)} Kg`,
        });
      } catch (err: any) {
        console.error("Error loading invoice:", err.message);
      }
    }
    fetchInvoice();
  }, [id]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("download") === "true" && form.invoiceNo !== "SGI/CI/2026/001") {
      // Small timeout to allow DOM/render to complete before capturing PDF canvas
      const timer = setTimeout(() => {
        handleDownloadPDF();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [form.invoiceNo]);

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  const setItem = (idx: number, key: string, val: any) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [key]: val };
    setForm((f) => ({ ...f, items }));
  };

  const addItem = () =>
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          id: f.items.length + 1,
          description: "",
          hsCode: "",
          noOfPkgs: "",
          qty: "",
          unit: "Per Coconut",
          unitPrice: "",
        },
      ],
    }));

  const removeItem = (idx: number) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const subTotal = form.items.reduce((acc, it) => {
    const q = parseFloat(it.qty) || 0;
    const p = parseFloat(it.unitPrice) || 0;
    return acc + (q * p);
  }, 0);

  const amountInWords = (amount: number, curr: string) => {
    if (!amount) return "";
    const ones = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
      "Seventeen", "Eighteen", "Nineteen",
    ];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const toWords = (n: number): string => {
      if (n === 0) return "";
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
      return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + toWords(n % 100) : "");
    };
    const int = Math.floor(amount);
    const dec = Math.round((amount - int) * 100);
    const currNames: any = { AUD: "Australian Dollars", USD: "US Dollars", EUR: "Euros", GBP: "Pounds Sterling", SGD: "Singapore Dollars", JPY: "Japanese Yen" };
    let words = toWords(int) || "Zero";
    if (dec > 0) words += ` and ${toWords(dec)} Cents`;
    return `${currNames[curr] || curr} ${words} Only`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice-${form.invoiceNo}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setDownloading(false);
    }
  };

  const borderColor = "#8FAADC";
  const headerBgColor = "#D9E2F3";
  const primaryBlue = "#1F497D";

  const SectionTitle = ({ title }: { title: string }) => (
    <div style={{ 
      background: headerBgColor, 
      color: "#000", 
      padding: "6px 10px", 
      fontSize: 11, 
      display: "flex", 
      alignItems: "center", 
      borderBottom: `1px solid ${borderColor}`,
      fontWeight: "normal"
    }}>
      <div style={{ width: 4, height: 14, background: primaryBlue, marginRight: 8 }}></div>
      <span style={{ letterSpacing: "0.2px" }}>{title}</span>
    </div>
  );

  return (
    <div style={{ fontFamily: "Calibri, Arial, sans-serif", maxWidth: 960, margin: "0 auto", padding: "2rem" }}>
      <div className="print:hidden" style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setView("form")}
          style={{
            padding: "8px 20px", borderRadius: 6, border: "none", cursor: "pointer",
            background: view === "form" ? "#1a3a5c" : "#e2e8f0",
            color: view === "form" ? "#fff" : "#333", fontWeight: 600, fontSize: 13,
          }}
        >
          ✏️ Create Invoice
        </button>
        <button
          onClick={() => setView("print")}
          style={{
            padding: "8px 20px", borderRadius: 6, border: "none", cursor: "pointer",
            background: view === "print" ? "#1a3a5c" : "#e2e8f0",
            color: view === "print" ? "#fff" : "#333", fontWeight: 600, fontSize: 13,
          }}
        >
          🖨️ View / Print
        </button>
      </div>

      {view === "form" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Invoice Header */}
          <Section title="📄 Invoice Header">
            <Row>
              <Field label="Invoice Number" required>
                <input className="border p-2 rounded" value={form.invoiceNo} onChange={(e) => set("invoiceNo", e.target.value)} />
              </Field>
              <Field label="Date" required>
                <input className="border p-2 rounded" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
              </Field>
              <Field label="Currency">
                <select className="border p-2 rounded" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </Row>
          </Section>

          {/* Importer */}
          <Section title="🏢 Importer / Consignee">
            <Row>
              <Field label="Company Name" required>
                <input className="border p-2 rounded" value={form.importerName} onChange={(e) => set("importerName", e.target.value)} placeholder="Byve Australia Pty Ltd" />
              </Field>
              <Field label="Country" required>
                <input className="border p-2 rounded" value={form.importerCountry} onChange={(e) => set("importerCountry", e.target.value)} placeholder="Australia" />
              </Field>
            </Row>
            <Field label="Full Address" required>
              <textarea className="border p-2 rounded" rows={3} value={form.importerAddress} onChange={(e) => set("importerAddress", e.target.value)} placeholder="12 Twickenham Close, Normanhurst, NSW 2076, Australia" style={{ width: "100%", resize: "vertical" }} />
            </Field>
          </Section>

          {/* Shipment Details */}
          <Section title="🚢 Shipment & Trade Details">
            <Row>
              <Field label="Country of Origin">
                <input className="border p-2 rounded" value={form.countryOfOrigin} onChange={(e) => set("countryOfOrigin", e.target.value)} />
              </Field>
              <Field label="Mode of Transport">
                <input className="border p-2 rounded" value={form.modeOfTransport} onChange={(e) => set("modeOfTransport", e.target.value)} />
              </Field>
            </Row>
            <Row>
              <Field label="Incoterms">
                <input className="border p-2 rounded" value={form.incoterms} onChange={(e) => set("incoterms", e.target.value)} />
              </Field>
              <Field label="Port of Loading">
                <input className="border p-2 rounded" value={form.portOfLoading} onChange={(e) => set("portOfLoading", e.target.value)} />
              </Field>
              <Field label="Port of Discharge" required>
                <input className="border p-2 rounded" value={form.portOfDischarge} onChange={(e) => set("portOfDischarge", e.target.value)} placeholder="Sydney Port, Australia" />
              </Field>
            </Row>
            <Row>
              <Field label="Container Type">
                <input className="border p-2 rounded" value={form.containerType} onChange={(e) => set("containerType", e.target.value)} />
              </Field>
              <Field label="Loading Type">
                <input className="border p-2 rounded" value={form.loadingType} onChange={(e) => set("loadingType", e.target.value)} />
              </Field>
            </Row>
          </Section>

          {/* Payment */}
          <Section title="🏦 Payment & Banking Details">
            <Row>
              <Field label="Payment Terms">
                <input className="border p-2 rounded" value={form.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} />
              </Field>
              <Field label="Bank Name">
                <input className="border p-2 rounded" value={form.bankName} onChange={(e) => set("bankName", e.target.value)} />
              </Field>
            </Row>
            <Row>
              <Field label="Branch">
                <input className="border p-2 rounded" value={form.branch} onChange={(e) => set("branch", e.target.value)} />
              </Field>
              <Field label="Account Number">
                <input className="border p-2 rounded" value={form.accountNo} onChange={(e) => set("accountNo", e.target.value)} />
              </Field>
              <Field label="IFSC Code">
                <input className="border p-2 rounded" value={form.ifscCode} onChange={(e) => set("ifscCode", e.target.value)} />
              </Field>
              <Field label="Swift Code">
                <input className="border p-2 rounded" value={form.swiftCode} onChange={(e) => set("swiftCode", e.target.value)} />
              </Field>
            </Row>
          </Section>

          {/* Goods */}
          <Section title="📦 Goods Description">
            {form.items.map((item, idx) => (
              <div key={item.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 14, marginBottom: 12, background: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <strong style={{ color: "#1a3a5c" }}>Item {idx + 1}</strong>
                  {form.items.length > 1 && (
                    <button onClick={() => removeItem(idx)} style={{ color: "#c00", border: "none", background: "none", cursor: "pointer", fontWeight: 700 }}>✕ Remove</button>
                  )}
                </div>
                <Row>
                  <Field label="Description" required>
                    <input className="border p-2 rounded" value={item.description} onChange={(e) => setItem(idx, "description", e.target.value)} placeholder="Fresh Coconuts" />
                  </Field>
                  <Field label="HS Code">
                    <input className="border p-2 rounded" value={item.hsCode} onChange={(e) => setItem(idx, "hsCode", e.target.value)} placeholder="0801.19.00" />
                  </Field>
                  <Field label="No. of Packages">
                    <input className="border p-2 rounded" value={item.noOfPkgs} onChange={(e) => setItem(idx, "noOfPkgs", e.target.value)} placeholder="17 Cartons" />
                  </Field>
                </Row>
                <Row>
                  <Field label="Quantity (Nos)" required>
                    <input className="border p-2 rounded" value={item.qty} onChange={(e) => setItem(idx, "qty", e.target.value)} placeholder="850 Nos" />
                  </Field>
                  <Field label="Unit">
                    <input className="border p-2 rounded" value={item.unit} onChange={(e) => setItem(idx, "unit", e.target.value)} />
                  </Field>
                  <Field label={`Unit Price (${form.currency})`} required>
                    <input className="border p-2 rounded" type="number" step="0.001" value={item.unitPrice} onChange={(e) => setItem(idx, "unitPrice", e.target.value)} placeholder="0.716" />
                  </Field>
                  <Field label={`Total (${form.currency})`}>
                    <input className="border p-2 rounded" readOnly value={
                      parseFloat(item.qty) && item.unitPrice
                        ? (parseFloat(item.qty) * parseFloat(item.unitPrice)).toFixed(2)
                        : ""
                    } style={{ background: "#f0f4f8" }} />
                  </Field>
                </Row>
              </div>
            ))}
            <button onClick={addItem} style={{ padding: "7px 16px", borderRadius: 6, border: "1.5px dashed #1a3a5c", background: "none", color: "#1a3a5c", cursor: "pointer", fontWeight: 600 }}>
              + Add Another Item
            </button>
          </Section>

          {/* Packing */}
          <Section title="📋 Packing Details">
            <Row>
              <Field label="Packing Type">
                <input className="border p-2 rounded" value={form.packingType} onChange={(e) => set("packingType", e.target.value)} placeholder="Carton Box" />
              </Field>
              <Field label="No. of Cartons">
                <input className="border p-2 rounded" value={form.noOfCartons} onChange={(e) => set("noOfCartons", e.target.value)} placeholder="17" />
              </Field>
              <Field label="Units per Carton">
                <input className="border p-2 rounded" value={form.unitsPerCarton} onChange={(e) => set("unitsPerCarton", e.target.value)} placeholder="50 Nos" />
              </Field>
            </Row>
            <Row>
              <Field label="Net Wt per Unit">
                <input className="border p-2 rounded" value={form.netWtPerUnit} onChange={(e) => set("netWtPerUnit", e.target.value)} placeholder="500 g" />
              </Field>
              <Field label="Net Wt per Carton">
                <input className="border p-2 rounded" value={form.netWtPerCarton} onChange={(e) => set("netWtPerCarton", e.target.value)} placeholder="25 Kg (50 x 500g)" />
              </Field>
              <Field label="Gross Wt per Carton">
                <input className="border p-2 rounded" value={form.grossWtPerCarton} onChange={(e) => set("grossWtPerCarton", e.target.value)} placeholder="26.40 Kg (incl. packing)" />
              </Field>
            </Row>
            <Row>
              <Field label="Total Net Weight">
                <input className="border p-2 rounded" value={form.totalNetWeight} onChange={(e) => set("totalNetWeight", e.target.value)} placeholder="425 Kg" />
              </Field>
              <Field label="Total Gross Weight">
                <input className="border p-2 rounded" value={form.totalGrossWeight} onChange={(e) => set("totalGrossWeight", e.target.value)} placeholder="448.8 Kg" />
              </Field>
            </Row>
          </Section>

          <div style={{ textAlign: "right" }}>
            <button
              onClick={() => setView("print")}
              style={{ padding: "10px 28px", background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              Preview Invoice →
            </button>
          </div>
        </div>
      )}

      {view === "print" && (
        <div className="flex flex-col items-center">
          <div className="print:hidden w-full max-w-[860px] flex justify-between gap-10 mb-6">
            <button onClick={() => setView("form")} style={{ padding: "8px 20px", background: "#e2e8f0", color: "#333", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
              ← Edit Invoice
            </button>
            <div className="flex gap-2">
              <button onClick={handlePrint} className="flex items-center" style={{ padding: "8px 20px", background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                <Printer className="w-4 h-4 mr-2" /> Print
              </button>
              <button disabled={downloading} onClick={handleDownloadPDF} className="flex items-center" style={{ padding: "8px 20px", background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />} Download PDF
              </button>
            </div>
          </div>

          {/* EXACT WORD DOCUMENT STYLING */}
          <div ref={printRef} style={{ background: "#fff", padding: "40px", fontFamily: "Calibri, Arial, sans-serif", fontSize: 11.5, color: "#000", width: "100%", maxWidth: 860 }}>
            
            {/* Header */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
              <tbody>
                <tr>
                  <td style={{ width: "60%", verticalAlign: "top", border: "none", paddingRight: 20 }}>
                    <div style={{ display: "flex", gap: 16 }}>
                      <div style={{ paddingTop: 6 }}>
                        <img src="/logo.webp" alt="Logo" style={{ width: 80, height: "auto", objectFit: "contain" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 19, color: primaryBlue, marginBottom: 8 }}>{EXPORTER.name}</div>
                        <div style={{ fontSize: 11, color: "#444", lineHeight: 1.5 }}>
                          41/1, ST-5, Sathy Athani Main Road, Thuckanayakanpalayam,<br />
                          Erode – 638506, Tamil Nadu, India<br />
                          <span style={{ color: "#666" }}>Phone:</span> 7397612015 &nbsp;|&nbsp; <span style={{ color: "#666" }}>GSTIN:</span> {EXPORTER.gstin}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ verticalAlign: "top", border: `1px solid ${borderColor}`, background: headerBgColor, padding: "14px", width: "40%" }}>
                    <div style={{ fontSize: 16, color: "#000", textAlign: "center", marginBottom: 4 }}>COMMERCIAL INVOICE</div>
                    <div style={{ fontSize: 11, color: "#000", fontStyle: "italic", textAlign: "center", marginBottom: 16 }}>For Customs Clearance</div>
                    
                    <table style={{ width: "100%", fontSize: 11 }}>
                      <tbody>
                        <tr><td style={{ width: 80, padding: "2px 0" }}>Invoice No</td><td style={{ padding: "2px 0" }}>: {form.invoiceNo}</td></tr>
                        <tr><td style={{ padding: "2px 0" }}>Date</td><td style={{ padding: "2px 0" }}>: {form.date ? new Date(form.date).toLocaleDateString("en-GB").replace(/\//g, " / ") : ""}</td></tr>
                        <tr><td style={{ padding: "2px 0" }}>Currency</td><td style={{ padding: "2px 0" }}>: {form.currency}</td></tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ borderTop: `2px solid ${primaryBlue}`, marginBottom: 20 }} />

            {/* Exporter / Importer */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, border: `1px solid ${borderColor}` }}>
              <tbody>
                <tr>
                  <td style={{ width: "50%", verticalAlign: "top", border: `1px solid ${borderColor}`, padding: 0 }}>
                    <SectionTitle title="EXPORTER / SELLER" />
                    <div style={{ padding: "12px 14px", lineHeight: 1.6 }}>
                      <div style={{ color: primaryBlue, marginBottom: 10 }}>{EXPORTER.name}</div>
                      <div style={{ whiteSpace: "pre-line" }}>{EXPORTER.address}</div>
                      <div style={{ marginTop: 8 }}>Phone : {EXPORTER.phone}</div>
                      <div>GSTIN : {EXPORTER.gstin}</div>
                    </div>
                  </td>
                  <td style={{ width: "50%", verticalAlign: "top", border: `1px solid ${borderColor}`, padding: 0 }}>
                    <SectionTitle title="IMPORTER / CONSIGNEE" />
                    <div style={{ padding: "12px 14px", lineHeight: 1.6 }}>
                      <div style={{ color: primaryBlue, marginBottom: 10 }}>{form.importerName || "—"}</div>
                      <div style={{ whiteSpace: "pre-line" }}>{form.importerAddress}</div>
                      <div>Country : {form.importerCountry}</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Shipment / Payment */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, border: `1px solid ${borderColor}` }}>
              <tbody>
                <tr>
                  <td style={{ width: "50%", verticalAlign: "top", border: `1px solid ${borderColor}`, padding: 0 }}>
                    <SectionTitle title="SHIPMENT & TRADE DETAILS" />
                    <div style={{ padding: "12px 14px", lineHeight: 1.8 }}>
                      {[
                        ["Country of Origin", form.countryOfOrigin],
                        ["Mode of Transport", form.modeOfTransport],
                        ["Incoterms", form.incoterms],
                        ["Port of Loading", form.portOfLoading],
                        ["Port of Discharge", form.portOfDischarge],
                        ["Container Type", form.containerType],
                        ["Loading Type", form.loadingType],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: "flex" }}><div style={{ width: 140, color: "#333" }}>{k}</div><div>: {v}</div></div>
                      ))}
                    </div>
                  </td>
                  <td style={{ width: "50%", verticalAlign: "top", border: `1px solid ${borderColor}`, padding: 0 }}>
                    <SectionTitle title="PAYMENT & BANKING DETAILS" />
                    <div style={{ padding: "12px 14px", lineHeight: 1.8 }}>
                      {[
                        ["Payment Terms", form.paymentTerms],
                        ["Invoice Currency", `${form.currency} (${form.currency === "AUD" ? "Australian Dollar" : form.currency === "USD" ? "US Dollar" : form.currency})`],
                        ["Bank Name", form.bankName],
                        ["Branch", form.branch],
                        ["Account No.", form.accountNo],
                        ["IFSC Code", form.ifscCode],
                        ["Swift Code", form.swiftCode],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: "flex" }}><div style={{ width: 140, color: "#333" }}>{k}</div><div>: {v}</div></div>
                      ))}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Goods Table */}
            <div style={{ border: `1px solid ${borderColor}`, marginBottom: 20 }}>
              <SectionTitle title="GOODS DESCRIPTION" />
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                <thead>
                  <tr style={{ background: headerBgColor }}>
                    {["S.No", "Description", "HS Code", "No. of Pkgs", "Qty (Nos)", "Unit", `Unit Price (${form.currency})`, `Total Value (${form.currency})`].map((h) => (
                      <th key={h} style={{ border: `1px solid ${borderColor}`, padding: "8px", textAlign: "center", fontWeight: "normal" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, idx) => {
                    const q = parseFloat(item.qty) || 0;
                    const p = parseFloat(item.unitPrice) || 0;
                    const total = q * p;
                    return (
                      <tr key={item.id}>
                        <td style={{ border: `1px solid ${borderColor}`, padding: "12px 8px", textAlign: "center" }}>{idx + 1}</td>
                        <td style={{ border: `1px solid ${borderColor}`, padding: "12px 8px" }}>{item.description}</td>
                        <td style={{ border: `1px solid ${borderColor}`, padding: "12px 8px", textAlign: "center" }}>{item.hsCode}</td>
                        <td style={{ border: `1px solid ${borderColor}`, padding: "12px 8px", textAlign: "center" }}>{item.noOfPkgs}</td>
                        <td style={{ border: `1px solid ${borderColor}`, padding: "12px 8px", textAlign: "center" }}>{item.qty}</td>
                        <td style={{ border: `1px solid ${borderColor}`, padding: "12px 8px", textAlign: "center" }}>{item.unit}</td>
                        <td style={{ border: `1px solid ${borderColor}`, padding: "12px 8px", textAlign: "right" }}>{form.currency} {p.toFixed(3)}</td>
                        <td style={{ border: `1px solid ${borderColor}`, padding: "12px 8px", textAlign: "right" }}>{form.currency} {total.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {/* Empty rows to match design */}
                  {[...Array(2)].map((_, i) => (
                    <tr key={i}>
                      <td style={{ border: `1px solid ${borderColor}`, padding: "12px 8px" }}>&nbsp;</td>
                      <td style={{ border: `1px solid ${borderColor}`, padding: "12px 8px" }}></td>
                      <td style={{ border: `1px solid ${borderColor}`, padding: "12px 8px" }}></td>
                      <td style={{ border: `1px solid ${borderColor}`, padding: "12px 8px" }}></td>
                      <td style={{ border: `1px solid ${borderColor}`, padding: "12px 8px" }}></td>
                      <td style={{ border: `1px solid ${borderColor}`, padding: "12px 8px" }}></td>
                      <td style={{ border: `1px solid ${borderColor}`, padding: "12px 8px" }}></td>
                      <td style={{ border: `1px solid ${borderColor}`, padding: "12px 8px" }}></td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={6} style={{ border: `1px solid ${borderColor}`, padding: "8px" }}></td>
                    <td style={{ border: `1px solid ${borderColor}`, padding: "8px", textAlign: "right", color: "#333" }}>Sub Total</td>
                    <td style={{ border: `1px solid ${borderColor}`, padding: "8px", textAlign: "right" }}>{form.currency} {subTotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={6} style={{ border: `1px solid ${borderColor}`, padding: "8px" }}></td>
                    <td style={{ border: `1px solid ${borderColor}`, padding: "8px", textAlign: "right", color: "#333" }}>Tax / GST (Export – Zero Rated 0%)</td>
                    <td style={{ border: `1px solid ${borderColor}`, padding: "8px", textAlign: "right" }}>{form.currency} 0.00</td>
                  </tr>
                  <tr style={{ background: headerBgColor }}>
                    <td colSpan={6} style={{ border: `1px solid ${borderColor}` }}></td>
                    <td style={{ border: `1px solid ${borderColor}`, padding: "10px 8px", textAlign: "right", color: "#333", letterSpacing: "0.2px" }}>TOTAL FOB VALUE</td>
                    <td style={{ border: `1px solid ${borderColor}`, padding: "10px 8px", textAlign: "right" }}>{form.currency} {subTotal.toFixed(2)}</td>
                  </tr>
                  <tr style={{ background: headerBgColor }}>
                    <td colSpan={8} style={{ border: `1px solid ${borderColor}`, padding: "8px 12px" }}>
                      Amount in Words : <span style={{ fontStyle: "italic" }}>{amountInWords(subTotal, form.currency)}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Packing / Weight */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, border: `1px solid ${borderColor}` }}>
              <tbody>
                <tr>
                  <td style={{ width: "50%", verticalAlign: "top", border: `1px solid ${borderColor}`, padding: 0 }}>
                    <SectionTitle title="PACKING DETAILS" />
                    <div style={{ padding: "12px 14px", lineHeight: 1.8 }}>
                      {[
                        ["Packing Type", form.packingType],
                        ["No. of Cartons", form.noOfCartons],
                        [form.items[0]?.unit?.includes("Coconut") ? "Coconuts per Carton" : "Units per Carton", form.unitsPerCarton],
                        [form.items[0]?.unit?.includes("Coconut") ? "Total Coconuts" : "Total Units", form.items[0]?.qty],
                        ["Container Type", form.containerTypePacking],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: "flex" }}><div style={{ width: 140, color: "#333" }}>{k}</div><div>: {v}</div></div>
                      ))}
                    </div>
                  </td>
                  <td style={{ width: "50%", verticalAlign: "top", border: `1px solid ${borderColor}`, padding: 0 }}>
                    <SectionTitle title="WEIGHT DETAILS" />
                    <div style={{ padding: "12px 14px", lineHeight: 1.8 }}>
                      {[
                        [`Net Wt / ${form.items[0]?.unit?.includes("Coconut") ? "Coconut" : "Unit"}`, form.netWtPerUnit],
                        ["Net Wt / Carton", form.netWtPerCarton],
                        ["Gross Wt / Carton", form.grossWtPerCarton],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: "flex" }}><div style={{ width: 140, color: "#333" }}>{k}</div><div>: {v}</div></div>
                      ))}
                      <div style={{ marginTop: 12, display: "flex" }}><div style={{ width: 140 }}>Total Net Weight</div><div>: {form.totalNetWeight}</div></div>
                      <div style={{ display: "flex" }}><div style={{ width: 140 }}>Total Gross Weight</div><div>: {form.totalGrossWeight}</div></div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Declaration / Signatory */}
            <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${borderColor}` }}>
              <tbody>
                <tr>
                  <td style={{ width: "50%", verticalAlign: "top", border: `1px solid ${borderColor}`, padding: 0 }}>
                    <SectionTitle title="DECLARATION" />
                    <div style={{ padding: "12px 14px" }}>
                      <div style={{ color: primaryBlue, marginBottom: 12 }}>We hereby declare and certify that:</div>
                      {[
                        "The goods described in this invoice are of Indian origin.",
                        "The prices stated herein are true, correct and are the actual transaction\nvalues.",
                        "This invoice is issued solely for customs clearance and export purposes.",
                        "All details comply with the laws and regulations of India and the destination\ncountry.",
                      ].map((d, i) => (
                        <div key={i} style={{ marginBottom: 6, display: "flex", alignItems: "flex-start" }}>
                          <span style={{ marginRight: 6 }}>{i + 1}.</span> 
                          <span style={{ whiteSpace: "pre-line", lineHeight: 1.4 }}>{d}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ width: "50%", verticalAlign: "top", border: `1px solid ${borderColor}`, padding: 0 }}>
                    <SectionTitle title="AUTHORISED SIGNATORY" />
                    <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", height: "100%" }}>
                      <div style={{ color: primaryBlue, marginBottom: 20 }}>For SHASTIKA GLOBAL IMPEX PVT LTD</div>
                      
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: 60 }}>
                        {signatureUrl ? (
                          <img src={signatureUrl} alt="Authorised Signatory" style={{ maxHeight: 60, maxWidth: "100%", objectFit: "contain", mixBlendMode: "multiply" }} />
                        ) : (
                          <div style={{ height: 60 }}></div>
                        )}
                      </div>

                      <div style={{ borderTop: "1px solid #ccc", paddingTop: 8, marginTop: "auto" }}>
                        Authorised Signatory :
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
        }
      `}} />
    </div>
  );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #dde3ea", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ background: "#1a3a5c", color: "#fff", padding: "9px 16px", fontWeight: 700, fontSize: 13 }}>{title}</div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
      {children}
    </div>
  );
}

function Field({ label, children, required }: { label: string, children: React.ReactNode, required?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160, flex: 1 }}>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: "#374151" }}>
        {label}{required && <span style={{ color: "#c00" }}> *</span>}
      </label>
      {children}
    </div>
  );
}