import { useState, useRef } from "react";

const initialForm = {
  invoiceNo: "SGI/CI/2026/001",
  date: new Date().toISOString().slice(0, 10),
  currency: "AUD",
  importerName: "",
  importerAddress: "",
  importerCountry: "",
  countryOfOrigin: "India",
  modeOfTransport: "Sea Freight",
  incoterms: "FOB – Chennai Port, India",
  portOfLoading: "Chennai Port, India",
  portOfDischarge: "",
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
      description: "",
      hsCode: "",
      noOfPkgs: "",
      qty: "",
      unit: "Per Coconut",
      unitPrice: "",
    },
  ],
  packingType: "Carton Box",
  noOfCartons: "",
  unitsPerCarton: "",
  containerTypePacking: "20 or 40 Feet FCL",
  netWtPerUnit: "",
  netWtPerCarton: "",
  grossWtPerCarton: "",
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

export default function CommercialInvoice() {
  const [view, setView] = useState("form");
  const [form, setForm] = useState(initialForm);
  const printRef = useRef<HTMLDivElement>(null);

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
    const total = parseFloat(it.qty) * parseFloat(it.unitPrice);
    return acc + (isNaN(total) ? 0 : total);
  }, 0);

  const totalNetWt =
    parseFloat(form.noOfCartons) * parseFloat(form.netWtPerCarton) || 0;
  const totalGrossWt =
    parseFloat(form.noOfCartons) * parseFloat(form.grossWtPerCarton) || 0;
  const totalCoconuts =
    parseFloat(form.noOfCartons) * parseFloat(form.unitsPerCarton) || 0;

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
    const currNames: Record<string, string> = { AUD: "Australian Dollars", USD: "US Dollars", EUR: "Euros", GBP: "Pounds Sterling", SGD: "Singapore Dollars", JPY: "Japanese Yen" };
    let words = toWords(int) || "Zero";
    if (dec > 0) words += ` and ${toWords(dec)} Cents`;
    return `${currNames[curr] || curr} ${words} Only`;
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Commercial Invoice</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 20px; }
        table { width: 100%; border-collapse: collapse; }
        td, th { border: 1px solid #aaa; padding: 5px 8px; }
        .no-border td { border: none; }
        h2 { margin: 0; font-size: 18px; }
        .section-header { background: #1a3a5c; color: #fff; padding: 4px 8px; font-weight: bold; font-size: 11px; margin-bottom: 6px; }
        @media print { body { margin: 10px; } }
      </style></head><body>${content}</body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 960, margin: "0 auto", padding: "0 0 2rem" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
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
                <input value={form.invoiceNo} onChange={(e) => set("invoiceNo", e.target.value)} />
              </Field>
              <Field label="Date" required>
                <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
              </Field>
              <Field label="Currency">
                <select value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </Row>
          </Section>

          {/* Importer */}
          <Section title="🏢 Importer / Consignee">
            <Row>
              <Field label="Company Name" required>
                <input value={form.importerName} onChange={(e) => set("importerName", e.target.value)} placeholder="Byve Australia Pty Ltd" />
              </Field>
              <Field label="Country" required>
                <input value={form.importerCountry} onChange={(e) => set("importerCountry", e.target.value)} placeholder="Australia" />
              </Field>
            </Row>
            <Field label="Full Address" required>
              <textarea rows={3} value={form.importerAddress} onChange={(e) => set("importerAddress", e.target.value)} placeholder="12 Twickenham Close, Normanhurst, NSW 2076, Australia" style={{ width: "100%", resize: "vertical" }} />
            </Field>
          </Section>

          {/* Shipment Details */}
          <Section title="🚢 Shipment & Trade Details">
            <Row>
              <Field label="Country of Origin">
                <input value={form.countryOfOrigin} onChange={(e) => set("countryOfOrigin", e.target.value)} />
              </Field>
              <Field label="Mode of Transport">
                <input value={form.modeOfTransport} onChange={(e) => set("modeOfTransport", e.target.value)} />
              </Field>
            </Row>
            <Row>
              <Field label="Incoterms">
                <select value={form.incoterms} onChange={(e) => set("incoterms", e.target.value)}>
                  {INCOTERMS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Port of Loading">
                <input value={form.portOfLoading} onChange={(e) => set("portOfLoading", e.target.value)} />
              </Field>
              <Field label="Port of Discharge" required>
                <input value={form.portOfDischarge} onChange={(e) => set("portOfDischarge", e.target.value)} placeholder="Sydney Port, Australia" />
              </Field>
            </Row>
            <Row>
              <Field label="Container Type">
                <input value={form.containerType} onChange={(e) => set("containerType", e.target.value)} />
              </Field>
              <Field label="Loading Type">
                <input value={form.loadingType} onChange={(e) => set("loadingType", e.target.value)} />
              </Field>
            </Row>
          </Section>

          {/* Payment */}
          <Section title="🏦 Payment & Banking Details">
            <Row>
              <Field label="Payment Terms">
                <input value={form.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} />
              </Field>
              <Field label="Bank Name">
                <input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} />
              </Field>
            </Row>
            <Row>
              <Field label="Branch">
                <input value={form.branch} onChange={(e) => set("branch", e.target.value)} />
              </Field>
              <Field label="Account Number">
                <input value={form.accountNo} onChange={(e) => set("accountNo", e.target.value)} />
              </Field>
              <Field label="IFSC Code">
                <input value={form.ifscCode} onChange={(e) => set("ifscCode", e.target.value)} />
              </Field>
              <Field label="Swift Code">
                <input value={form.swiftCode} onChange={(e) => set("swiftCode", e.target.value)} />
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
                    <input value={item.description} onChange={(e) => setItem(idx, "description", e.target.value)} placeholder="Fresh Coconuts" />
                  </Field>
                  <Field label="HS Code">
                    <input value={item.hsCode} onChange={(e) => setItem(idx, "hsCode", e.target.value)} placeholder="0801.19.00" />
                  </Field>
                  <Field label="No. of Packages">
                    <input type="number" value={item.noOfPkgs} onChange={(e) => setItem(idx, "noOfPkgs", e.target.value)} placeholder="17 Cartons" />
                  </Field>
                </Row>
                <Row>
                  <Field label="Quantity (Nos)" required>
                    <input type="number" value={item.qty} onChange={(e) => setItem(idx, "qty", e.target.value)} placeholder="850" />
                  </Field>
                  <Field label="Unit">
                    <select value={item.unit} onChange={(e) => setItem(idx, "unit", e.target.value)}>
                      {UNITS.map((u) => <option key={u}>{u}</option>)}
                    </select>
                  </Field>
                  <Field label={`Unit Price (${form.currency})`} required>
                    <input type="number" step="0.001" value={item.unitPrice} onChange={(e) => setItem(idx, "unitPrice", e.target.value)} placeholder="0.716" />
                  </Field>
                  <Field label={`Total (${form.currency})`}>
                    <input readOnly value={
                      item.qty && item.unitPrice
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
            <div style={{ marginTop: 12, textAlign: "right", fontSize: 14 }}>
              <strong>Sub Total: {form.currency} {subTotal.toFixed(2)}</strong>
            </div>
          </Section>

          {/* Packing */}
          <Section title="📋 Packing Details">
            <Row>
              <Field label="Packing Type">
                <input value={form.packingType} onChange={(e) => set("packingType", e.target.value)} placeholder="Carton Box" />
              </Field>
              <Field label="No. of Cartons">
                <input type="number" value={form.noOfCartons} onChange={(e) => set("noOfCartons", e.target.value)} placeholder="17" />
              </Field>
              <Field label="Units per Carton">
                <input type="number" value={form.unitsPerCarton} onChange={(e) => set("unitsPerCarton", e.target.value)} placeholder="50" />
              </Field>
            </Row>
            <Row>
              <Field label="Net Wt per Unit (g)">
                <input type="number" value={form.netWtPerUnit} onChange={(e) => set("netWtPerUnit", e.target.value)} placeholder="500" />
              </Field>
              <Field label="Net Wt per Carton (kg)">
                <input type="number" value={form.netWtPerCarton} onChange={(e) => set("netWtPerCarton", e.target.value)} placeholder="25" />
              </Field>
              <Field label="Gross Wt per Carton (kg)">
                <input type="number" value={form.grossWtPerCarton} onChange={(e) => set("grossWtPerCarton", e.target.value)} placeholder="26.40" />
              </Field>
            </Row>
            {totalNetWt > 0 && (
              <div style={{ marginTop: 10, padding: "10px 14px", background: "#e8f0fe", borderRadius: 8, fontSize: 13 }}>
                <strong>Total Net Wt: {totalNetWt} Kg &nbsp;|&nbsp; Total Gross Wt: {totalGrossWt} Kg &nbsp;|&nbsp; Total Units: {totalCoconuts}</strong>
              </div>
            )}
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
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <button onClick={handlePrint} style={{ padding: "8px 20px", background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
              🖨️ Print / Download PDF
            </button>
            <button onClick={() => setView("form")} style={{ padding: "8px 20px", background: "#e2e8f0", color: "#333", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
              ← Edit Invoice
            </button>
          </div>

          <div ref={printRef} style={{ background: "#fff", border: "1px solid #ccc", borderRadius: 8, padding: 28, fontFamily: "Arial, sans-serif", fontSize: 11, color: "#000", maxWidth: 860 }}>
            {/* Header */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
              <tbody>
                <tr>
                  <td style={{ width: "60%", verticalAlign: "top", border: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 52, height: 52, background: "#1a3a5c", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18 }}>SG</div>
                      <div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: "#1a3a5c" }}>{EXPORTER.name.toUpperCase()}</div>
                        <div style={{ fontSize: 10, color: "#444", marginTop: 3, lineHeight: 1.5 }}>
                          41/1, ST-5, Sathy Athani Main Road, Thuckanayakanpalayam,<br />
                          Erode – 638506, Tamil Nadu, India<br />
                          Phone: 7397612015 &nbsp;|&nbsp; GSTIN: {EXPORTER.gstin}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ verticalAlign: "top", border: "1.5px solid #1a3a5c", padding: "10px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1a3a5c" }}>COMMERCIAL INVOICE</div>
                    <div style={{ fontSize: 10, color: "#666", marginBottom: 8 }}>For Customs Clearance</div>
                    <table style={{ width: "100%", fontSize: 10 }}>
                      <tbody>
                        <tr><td style={{ border: "none", textAlign: "left", color: "#555" }}>Invoice No :</td><td style={{ border: "none", textAlign: "left", fontWeight: 600 }}>{form.invoiceNo}</td></tr>
                        <tr><td style={{ border: "none", textAlign: "left", color: "#555" }}>Date :</td><td style={{ border: "none", textAlign: "left", fontWeight: 600 }}>{form.date ? new Date(form.date).toLocaleDateString("en-GB").replace(/\//g, " / ") : ""}</td></tr>
                        <tr><td style={{ border: "none", textAlign: "left", color: "#555" }}>Currency :</td><td style={{ border: "none", textAlign: "left", fontWeight: 600 }}>{form.currency}</td></tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ borderTop: "2px solid #1a3a5c", marginBottom: 14 }} />

            {/* Exporter / Importer */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, border: "1px solid #aaa" }}>
              <tbody>
                <tr>
                  <td style={{ width: "50%", verticalAlign: "top", border: "1px solid #aaa", padding: 0 }}>
                    <div style={{ background: "#1a3a5c", color: "#fff", padding: "4px 10px", fontWeight: 700, fontSize: 10.5 }}>■ EXPORTER / SELLER</div>
                    <div style={{ padding: "8px 12px" }}>
                      <div style={{ color: "#1a5c8a", fontWeight: 700, marginBottom: 6 }}>{EXPORTER.name}</div>
                      <div style={{ lineHeight: 1.7 }}>
                        41/1, ST-5, Sathy Athani Main Road,<br />
                        Thuckanayakanpalayam, Erode – 638506,<br />
                        Tamil Nadu, India<br />
                        Phone : {EXPORTER.phone}<br />
                        GSTIN : {EXPORTER.gstin}
                      </div>
                    </div>
                  </td>
                  <td style={{ width: "50%", verticalAlign: "top", border: "1px solid #aaa", padding: 0 }}>
                    <div style={{ background: "#1a3a5c", color: "#fff", padding: "4px 10px", fontWeight: 700, fontSize: 10.5 }}>■ IMPORTER / CONSIGNEE</div>
                    <div style={{ padding: "8px 12px" }}>
                      <div style={{ color: "#1a5c8a", fontWeight: 700, marginBottom: 6 }}>{form.importerName || "—"}</div>
                      <div style={{ lineHeight: 1.7, whiteSpace: "pre-line" }}>
                        {form.importerAddress}<br />
                        Country : {form.importerCountry}
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Shipment / Payment */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, border: "1px solid #aaa" }}>
              <tbody>
                <tr>
                  <td style={{ width: "50%", verticalAlign: "top", border: "1px solid #aaa", padding: 0 }}>
                    <div style={{ background: "#1a3a5c", color: "#fff", padding: "4px 10px", fontWeight: 700, fontSize: 10.5 }}>■ SHIPMENT & TRADE DETAILS</div>
                    <div style={{ padding: "8px 12px", lineHeight: 1.9 }}>
                      {[
                        ["Country of Origin", form.countryOfOrigin],
                        ["Mode of Transport", form.modeOfTransport],
                        ["Incoterms", form.incoterms],
                        ["Port of Loading", form.portOfLoading],
                        ["Port of Discharge", form.portOfDischarge],
                        ["Container Type", form.containerType],
                        ["Loading Type", form.loadingType],
                      ].map(([k, v]) => (
                        <div key={k}><span style={{ display: "inline-block", width: 130, color: "#555" }}>{k}</span> : <span>{v}</span></div>
                      ))}
                    </div>
                  </td>
                  <td style={{ width: "50%", verticalAlign: "top", border: "1px solid #aaa", padding: 0 }}>
                    <div style={{ background: "#1a3a5c", color: "#fff", padding: "4px 10px", fontWeight: 700, fontSize: 10.5 }}>■ PAYMENT & BANKING DETAILS</div>
                    <div style={{ padding: "8px 12px", lineHeight: 1.9 }}>
                      {[
                        ["Payment Terms", form.paymentTerms],
                        ["Invoice Currency", `${form.currency} (${form.currency === "AUD" ? "Australian Dollar" : form.currency === "USD" ? "US Dollar" : form.currency})`],
                        ["Bank Name", form.bankName],
                        ["Branch", form.branch],
                        ["Account No.", form.accountNo],
                        ["IFSC Code", form.ifscCode],
                        ["Swift Code", form.swiftCode],
                      ].map(([k, v]) => (
                        <div key={k}><span style={{ display: "inline-block", width: 130, color: "#555" }}>{k}</span> : <span>{v}</span></div>
                      ))}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Goods Table */}
            <div style={{ border: "1px solid #aaa", marginBottom: 14 }}>
              <div style={{ background: "#1a3a5c", color: "#fff", padding: "4px 10px", fontWeight: 700, fontSize: 10.5 }}>■ GOODS DESCRIPTION</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
                <thead>
                  <tr style={{ background: "#e8edf3" }}>
                    {["S.No", "Description", "HS Code", "No. of Pkgs", "Qty (Nos)", "Unit", `Unit Price (${form.currency})`, `Total Value (${form.currency})`].map((h) => (
                      <th key={h} style={{ border: "1px solid #aaa", padding: "5px 7px", textAlign: "center", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, idx) => {
                    const total = parseFloat(item.qty) * parseFloat(item.unitPrice);
                    return (
                      <tr key={item.id}>
                        <td style={{ border: "1px solid #aaa", padding: "5px 7px", textAlign: "center" }}>{idx + 1}</td>
                        <td style={{ border: "1px solid #aaa", padding: "5px 7px" }}>{item.description}</td>
                        <td style={{ border: "1px solid #aaa", padding: "5px 7px", textAlign: "center" }}>{item.hsCode}</td>
                        <td style={{ border: "1px solid #aaa", padding: "5px 7px", textAlign: "center" }}>{item.noOfPkgs} Cartons</td>
                        <td style={{ border: "1px solid #aaa", padding: "5px 7px", textAlign: "center" }}>{item.qty} Nos</td>
                        <td style={{ border: "1px solid #aaa", padding: "5px 7px", textAlign: "center" }}>{item.unit}</td>
                        <td style={{ border: "1px solid #aaa", padding: "5px 7px", textAlign: "right" }}>{form.currency} {parseFloat(item.unitPrice || "0").toFixed(3)}</td>
                        <td style={{ border: "1px solid #aaa", padding: "5px 7px", textAlign: "right" }}>{form.currency} {isNaN(total) ? "—" : total.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  <tr><td colSpan={7} style={{ border: "1px solid #aaa", padding: "5px 7px", textAlign: "right", fontWeight: 600 }}>Sub Total</td><td style={{ border: "1px solid #aaa", padding: "5px 7px", textAlign: "right", fontWeight: 600 }}>{form.currency} {subTotal.toFixed(2)}</td></tr>
                  <tr><td colSpan={7} style={{ border: "1px solid #aaa", padding: "5px 7px", textAlign: "right" }}>Tax / GST (Export – Zero Rated 0%)</td><td style={{ border: "1px solid #aaa", padding: "5px 7px", textAlign: "right" }}>{form.currency} 0.00</td></tr>
                  <tr style={{ background: "#1a3a5c" }}>
                    <td colSpan={7} style={{ border: "1px solid #aaa", padding: "7px 10px", textAlign: "right", fontWeight: 700, color: "#fff", fontSize: 12 }}>TOTAL FOB VALUE</td>
                    <td style={{ border: "1px solid #aaa", padding: "7px 10px", textAlign: "right", fontWeight: 700, color: "#fff", fontSize: 12 }}>{form.currency} {subTotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              <div style={{ padding: "6px 10px", fontSize: 10.5, fontStyle: "italic" }}>
                Amount in Words : <strong>{amountInWords(subTotal, form.currency)}</strong>
              </div>
            </div>

            {/* Packing / Weight */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, border: "1px solid #aaa" }}>
              <tbody>
                <tr>
                  <td style={{ width: "50%", verticalAlign: "top", border: "1px solid #aaa", padding: 0 }}>
                    <div style={{ background: "#1a3a5c", color: "#fff", padding: "4px 10px", fontWeight: 700, fontSize: 10.5 }}>■ PACKING DETAILS</div>
                    <div style={{ padding: "8px 12px", lineHeight: 2 }}>
                      {[
                        ["Packing Type", form.packingType],
                        ["No. of Cartons", form.noOfCartons],
                        [form.items[0]?.unit?.includes("Coconut") ? "Coconuts per Carton" : "Units per Carton", form.unitsPerCarton + " Nos"],
                        [form.items[0]?.unit?.includes("Coconut") ? "Total Coconuts" : "Total Units", totalCoconuts + " Nos"],
                        ["Container Type", form.containerTypePacking],
                      ].map(([k, v]) => (
                        <div key={k}><span style={{ display: "inline-block", width: 140, color: "#555" }}>{k}</span> : <span>{v}</span></div>
                      ))}
                    </div>
                  </td>
                  <td style={{ width: "50%", verticalAlign: "top", border: "1px solid #aaa", padding: 0 }}>
                    <div style={{ background: "#1a3a5c", color: "#fff", padding: "4px 10px", fontWeight: 700, fontSize: 10.5 }}>■ WEIGHT DETAILS</div>
                    <div style={{ padding: "8px 12px", lineHeight: 2 }}>
                      {[
                        [`Net Wt / ${form.items[0]?.unit?.includes("Coconut") ? "Coconut" : "Unit"}`, form.netWtPerUnit ? form.netWtPerUnit + " g" : ""],
                        ["Net Wt / Carton", form.netWtPerCarton ? `${form.netWtPerCarton} Kg  (${form.unitsPerCarton} × ${form.netWtPerUnit}g)` : ""],
                        ["Gross Wt / Carton", form.grossWtPerCarton ? `${form.grossWtPerCarton} Kg  (incl. packing)` : ""],
                      ].map(([k, v]) => (
                        <div key={k}><span style={{ display: "inline-block", width: 140, color: "#555" }}>{k}</span> : <span>{v}</span></div>
                      ))}
                      <div style={{ marginTop: 8, fontWeight: 600 }}>Total Net Weight &nbsp;: {totalNetWt} Kg</div>
                      <div style={{ fontWeight: 600 }}>Total Gross Weight : {totalGrossWt} Kg</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Declaration / Signatory */}
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #aaa" }}>
              <tbody>
                <tr>
                  <td style={{ width: "50%", verticalAlign: "top", border: "1px solid #aaa", padding: 0 }}>
                    <div style={{ background: "#1a3a5c", color: "#fff", padding: "4px 10px", fontWeight: 700, fontSize: 10.5 }}>■ DECLARATION</div>
                    <div style={{ padding: "10px 14px" }}>
                      <div style={{ color: "#1a5c8a", fontWeight: 600, marginBottom: 8 }}>We hereby declare and certify that:</div>
                      {[
                        "The goods described in this invoice are of Indian origin.",
                        "The prices stated herein are true, correct and are the actual transaction values.",
                        "This invoice is issued solely for customs clearance and export purposes.",
                        "All details comply with the laws and regulations of India and the destination country.",
                      ].map((d, i) => (
                        <div key={i} style={{ marginBottom: 5 }}>{i + 1}.&nbsp; {d}</div>
                      ))}
                    </div>
                  </td>
                  <td style={{ width: "50%", verticalAlign: "top", border: "1px solid #aaa", padding: 0 }}>
                    <div style={{ background: "#1a3a5c", color: "#fff", padding: "4px 10px", fontWeight: 700, fontSize: 10.5 }}>■ AUTHORISED SIGNATORY</div>
                    <div style={{ padding: "10px 14px" }}>
                      <div style={{ color: "#1a5c8a", fontWeight: 600, marginBottom: 12 }}>For  SHASTIKA GLOBAL IMPEX PVT LTD</div>
                      <div style={{ height: 60, borderBottom: "1px solid #aaa", marginBottom: 8, display: "flex", alignItems: "flex-end", paddingBottom: 4 }}>
                        <span style={{ fontFamily: "cursive", fontSize: 22, color: "#1a3a5c" }}>Ram Raj...</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#444" }}>Director</div>
                      <div style={{ marginTop: 14, borderTop: "1px solid #aaa", paddingTop: 8, fontSize: 10.5 }}>Authorised Signatory :</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div style={{ border: "1px solid #dde3ea", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ background: "#1a3a5c", color: "#fff", padding: "9px 16px", fontWeight: 700, fontSize: 13 }}>{title}</div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function Row({ children }: any) {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
      {children}
    </div>
  );
}

function Field({ label, children, required }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160, flex: 1 }}>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: "#374151" }}>
        {label}{required && <span style={{ color: "#c00" }}> *</span>}
      </label>
      {children}
    </div>
  );
}
