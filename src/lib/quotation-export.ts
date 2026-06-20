import jsPDF from "jspdf";
import { format } from "date-fns";

export const exportSingleQuotationToPDF = (quotation: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);

  // Colors & Styles
  const primaryColor = [26, 82, 118]; // #1A5276
  const totalBgColor = [189, 215, 238]; // #BDD7EE
  const lightGray = [248, 250, 252]; // #f8fafc

  const drawFields = (fields: { label: string, value: string }[], startX: number, startY: number, labelWidth: number) => {
    let currentY = startY;
    fields.forEach(f => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100);
      doc.text(`${f.label}`, startX, currentY);
      doc.text(":", startX + labelWidth - 3, currentY);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text(String(f.value || "---"), startX + labelWidth, currentY);
      currentY += 6;
    });
  };

  // Main Border
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.rect(margin, margin, contentWidth, pageHeight - (margin * 2));

  // --- HEADER SECTION (80 height) ---
  const headerHeight = 80;
  const leftColWidth = contentWidth * 0.55;
  const rightColWidth = contentWidth * 0.45;

  // Header Split Line
  doc.line(margin + leftColWidth, margin, margin + leftColWidth, margin + headerHeight);
  doc.line(margin, margin + headerHeight, pageWidth - margin, margin + headerHeight);

  // Left Header - Company Title & Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("SHASTIKA GLOBAL IMPEX PRIVATE LIMITED", margin + leftColWidth / 2, margin + 7, { align: "center" });

  try {
    // Logo on the left side
    doc.addImage("/logo.webp", "WEBP", margin + 8, margin + 12, 22, 22);
  } catch (e) {
    doc.setFontSize(9);
    doc.text("LOGO", margin + 19, margin + 22, { align: "center" });
  }

  // Address and Contact on the right side of the logo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(50);
  const addrX = margin + 35; 
  let addrY = margin + 15; 
  doc.text("Address:", addrX, addrY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("41/1, ST-5, Sathy Athani Main Road,", addrX + 11, addrY);
  addrY += 4.5;
  doc.text("Thuckanayakanpalayam", addrX + 11, addrY);
  addrY += 4.5;
  doc.text("Erode - 638506, Tamil Nadu, India.", addrX + 11, addrY);
  
  addrY += 6.5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50);
  doc.text("Phone  :", addrX, addrY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("+91 7397612015", addrX + 25, addrY);

  addrY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50);
  doc.text("GSTIN  :", addrX, addrY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("33ABPCS0605LIZ8", addrX + 25, addrY);

  addrY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50);
  doc.text("whatsapp number :", addrX, addrY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("+91 9566266241", addrX + 25, addrY);

  // Right Header - Quotation Title & Info
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text("QUOTATION", margin + leftColWidth + rightColWidth / 2, margin + 10, { align: "center" });

  const quoteInfo = [
    { label: "Quotation No", value: String(quotation.quotation_number || "---") },
    { label: "Date", value: new Date(quotation.created_at).toLocaleDateString('en-GB') },
    { label: "Valid Until", value: quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('en-GB') : "TBD" },
    { label: "Currency", value: quotation.currency || "USD" },
    { label: "Incoterm", value: quotation.incoterms || quotation.incoterm || "CIF" },
    { label: "Packing Method", value: quotation.packaging_type || "---" },
    { label: "Packing Charge", value: `${quotation.currency || "USD"} ${Number(quotation.packaging_cost || 0).toFixed(2)}` },
    { label: "Net Weight", value: quotation.net_weight || "---" }
  ];
  drawFields(quoteInfo, margin + leftColWidth + 8, margin + 18, 28);

  // --- GRID ROW 1 (2 cols, 35 height) ---
  let currentY = margin + headerHeight;
  const row1Height = 35;
  const r1Col1W = contentWidth * 0.55;
  const r1Col2W = contentWidth * 0.45;

  // Row 1 background for headers
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.setDrawColor(0);
  doc.line(margin, currentY + 7, pageWidth - margin, currentY + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("BILL TO :", margin + r1Col1W / 2, currentY + 5, { align: "center" });
  doc.text("TERMS OF PAYMENT", margin + r1Col1W + r1Col2W / 2, currentY + 5, { align: "center" });

  // Row 1 divider lines
  doc.line(margin + r1Col1W, currentY, margin + r1Col1W, currentY + row1Height);
  doc.line(margin, currentY + row1Height, pageWidth - margin, currentY + row1Height);

  doc.setTextColor(0);
  // Col 1: Bill To
  const custName = quotation.customer_name || quotation.customer?.name || "Unknown";
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(custName.toUpperCase(), margin + 4, currentY + 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const custAddress = quotation.customer?.address || quotation.customer_address || "";
  const splitAddress = doc.splitTextToSize(custAddress, r1Col1W - 8);
  doc.text(splitAddress, margin + 4, currentY + 18);
  const custPhone = quotation.customer_phone || quotation.customer?.phone;
  if (custPhone) {
    doc.setFont("helvetica", "bold");
    doc.text(`Phone no : ${custPhone}`, margin + 4, currentY + 18 + splitAddress.length * 4 + 4);
  }

  // Col 2: Terms of Payment
  const termsText = quotation.payment_terms || "Standard payment terms apply.";
  const splitTermsText = doc.splitTextToSize(termsText, r1Col2W - 8);
  doc.text(splitTermsText, margin + r1Col1W + 4, currentY + 13);

  // --- GRID ROW 2 (2 cols, 40 height) ---
  currentY += row1Height;
  const row2Height = 40;
  const r2Col1W = contentWidth * 0.55;
  const r2Col2W = contentWidth * 0.45;

  // Row 2 background for headers
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.line(margin, currentY + 7, pageWidth - margin, currentY + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("SHIPMENT & TRADE TERMS", margin + r2Col1W / 2, currentY + 5, { align: "center" });
  doc.text("TRANSPORT DETAILS", margin + r2Col1W + r2Col2W / 2, currentY + 5, { align: "center" });

  // Row 2 divider lines
  doc.line(margin + r2Col1W, currentY, margin + r2Col1W, currentY + row2Height);
  doc.line(margin, currentY + row2Height, pageWidth - margin, currentY + row2Height);

  // Col 1: Shipment & Trade
  const tradeFields = [
    { label: "Country of Origin", value: quotation.country_of_origin || "India" },
    { label: "Mode of Transport", value: quotation.mode_of_transport || quotation.shipment_type || "Truck" },
    { label: "Incoterms", value: quotation.incoterms || quotation.incoterm || "EXW" },
    { label: "Port of Loading", value: quotation.port_of_loading || "Nhava Sheva Port, India" },
    { label: "Port of Discharge", value: quotation.port_of_discharge || "---" }
  ];
  drawFields(tradeFields, margin + 4, currentY + 13, 30);

  // Col 2: Transport Details
  const transFields = [
    { label: "Transport", value: quotation.shipment_type || "Truck" },
    { label: "Transport Charges", value: `${quotation.currency || "INR"} ${Number(quotation.shipping_cost || 0).toLocaleString()}` }
  ];
  drawFields(transFields, margin + r2Col1W + 4, currentY + 13, 30);

  // --- ITEMS TABLE ---
  const tableTop = currentY + row2Height;
  const tableHeight = 65; // Even more compact


  const colWidths = [10, 65, 25, 25, 15, 25, 25]; // Adds up to 190
  const curr = quotation.currency || "USD";
  const colLabels = ["ID", "DESCRIPTION", "HSN", "QUANTITY", "UNIT", `UNIT PRICE (${curr})`, `AMOUNT (${curr})` ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(margin, tableTop, contentWidth, 8, 'F');
  doc.line(margin, tableTop + 8, pageWidth - margin, tableTop + 8);

  let colX = margin;
  colLabels.forEach((label, i) => {
    const align = (i >= 3) ? "center" : (i === 1 ? "left" : "center");
    const xPos = align === "center" ? colX + colWidths[i]/2 : colX + 4;
    doc.setFontSize(i > 4 ? 6 : 7); // Smaller font for price/amount headers
    doc.text(label, xPos, tableTop + 5.5, { align });
    colX += colWidths[i];
    if (i < colLabels.length - 1) doc.line(colX, tableTop, colX, tableTop + tableHeight);
  });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.setFontSize(7.5);
  let itemY = tableTop + 14;
  const items = quotation.quotation_items || quotation.items || [];
  items.forEach((item: any, idx: number) => {
    colX = margin;
    doc.text(String(idx + 1), colX + colWidths[0]/2, itemY, { align: "center" }); colX += colWidths[0];
    
    const itemName = item.description || item.products?.name || item.product?.name || item.product_name || "Product";
    const splitName = doc.splitTextToSize(itemName, colWidths[1] - 8);
    doc.text(splitName, colX + 4, itemY); colX += colWidths[1];
    
    doc.text(item.hsn_code || item.products?.hs_code || item.product?.hs_code || item.hs_code || "---", colX + colWidths[2]/2, itemY, { align: "center" }); colX += colWidths[2];
    doc.text(String(item.quantity), colX + colWidths[3]/2, itemY, { align: "center" }); colX += colWidths[3];
    doc.text(String(item.unit || item.products?.unit || item.product?.unit || "PCS").toUpperCase(), colX + colWidths[4]/2, itemY, { align: "center" }); colX += colWidths[4];
    doc.text(Number(item.unit_price).toFixed(2), colX + colWidths[5] - 4, itemY, { align: "right" }); colX += colWidths[5];
    doc.text(Number(item.total_price || (item.quantity * item.unit_price)).toFixed(2), colX + colWidths[6] - 4, itemY, { align: "right" });
    itemY += Math.max(8, splitName.length * 4);
  });

  doc.line(margin, tableTop + tableHeight, pageWidth - margin, tableTop + tableHeight);

  // --- FOOTER SECTION (Summary & Terms) ---
  const footerTop = tableTop + tableHeight;
  const footerHeight = 40;
  const footerLeftW = contentWidth * 0.55;
  const footerRightW = contentWidth * 0.45;

  doc.line(margin + footerLeftW, footerTop, margin + footerLeftW, footerTop + footerHeight);

  // Footer Left: Note & Declaration
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("NOTE", margin + 4, footerTop + 5);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(50);
  const notes = quotation.notes || "Including packing, loading and Transport.";
  const splitNotes = doc.splitTextToSize(notes, footerLeftW - 8);
  doc.text(splitNotes, margin + 4, footerTop + 10);

  doc.line(margin, footerTop + 24, margin + footerLeftW, footerTop + 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(0);
  doc.text("DECLARATION", margin + 4, footerTop + 29);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6);
  doc.text("We hereby certify that the goods mentioned above are of Indian origin and the price and details stated in this quotation are true and correct.", margin + 4, footerTop + 34, { maxWidth: footerLeftW - 8 });

  // Footer Right: Summary
  const total = Number(quotation.amount || quotation.total_amount || 0);
  const taxRate = Number(quotation.tax_rate || 0);
  const pkgCost = Number(quotation.packaging_cost || 0);
  const shipCost = Number(quotation.shipping_cost || 0);
  
  const subtotal = Number(quotation.subtotal || (total / (1 + taxRate/100) - pkgCost - shipCost));
  const taxableAmount = subtotal + pkgCost + shipCost;
  const taxAmount = Number(quotation.tax_amount || (taxableAmount * taxRate / 100));

  let sumY = footerTop + 6;
  const drawSumRow = (label: string, value: string, isTotal = false) => {
    if (isTotal) {
      doc.setFillColor(totalBgColor[0], totalBgColor[1], totalBgColor[2]);
      doc.rect(margin + footerLeftW + 0.2, sumY - 4.5, footerRightW - 0.4, 8, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(50);
    }
    doc.text(label, margin + footerLeftW + 4, sumY);
    doc.text(value, pageWidth - margin - 4, sumY, { align: "right" });
    sumY += 6.5;
  };

  drawSumRow("SUB TOTAL", `${curr} ${subtotal.toLocaleString()}`);
  drawSumRow("PACKING CHARGE", `${curr} ${pkgCost.toLocaleString()}`);
  drawSumRow("TRANSPORT CHARGES", `${curr} ${shipCost.toLocaleString()}`);
  drawSumRow("TAX", `${curr} ${taxAmount.toLocaleString()}`);
  drawSumRow("TOTAL AMOUNT", `${curr} ${total.toLocaleString()}`, true);

  // --- SIGNATURE SECTION ---
  const sigSectionTop = footerTop + footerHeight;
  doc.line(margin, sigSectionTop, pageWidth - margin, sigSectionTop);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(0);
  doc.text("FOR SHASTIKA GLOBAL IMPEX PRIVATE LIMITED", pageWidth - margin - 5, sigSectionTop + 6, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.text("Authorized Signatory :", margin + footerLeftW + 4, sigSectionTop + 18);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150);
  doc.text("____________________________", margin + footerLeftW + 35, sigSectionTop + 18);

  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Seal & Sign :", margin + footerLeftW + 4, sigSectionTop + 30);
  doc.rect(pageWidth - margin - 40, sigSectionTop + 24, 35, 12); // Stamp box shifted down and sized correctly


  // Watermark
  try {
    doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
    doc.addImage("/logo.webp", "WEBP", pageWidth / 2 - 35, pageHeight / 2 - 35, 70, 70);
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
  } catch (e) {}

  doc.save(`Quotation_${quotation.quotation_number || 'Report'}.pdf`);
};



export const exportQuotationsToPDF = (quotations: any[], forceList = false) => {
  // If it's a single quotation and not forced to list, use the professional format
  if (quotations.length === 1 && !forceList) {
    exportSingleQuotationToPDF(quotations[0]);
    return;
  }

  // Otherwise, keep the list format for multiple quotations
  const doc = new jsPDF();
  const now = new Date();
  const dateStr = format(now, "yyyy-MM-dd_HH-mm");

  doc.setFontSize(20);
  doc.text("Quotations Report", 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${format(now, "PPP p")}`, 14, 30);

  const startY = 40;
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("ID", 14, startY);
  doc.text("Customer", 45, startY);
  doc.text("Items", 110, startY);
  doc.text("Amount", 130, startY);
  doc.text("Status", 170, startY);

  doc.setLineWidth(0.5);
  doc.line(14, startY + 2, 196, startY + 2);

  doc.setFont("helvetica", "normal");
  let currentY = startY + 10;

  quotations.forEach((q) => {
    if (currentY > 280) {
      doc.addPage();
      currentY = 20;
    }
    const qId = (q.quotation_number || q.id.substring(0, 8));
    doc.text(qId, 14, currentY);
    doc.text(String(q.customer_name || q.customers?.name || "Unknown"), 45, currentY);
    const count = q.items_count !== undefined ? q.items_count : (q.quotation_items?.length || 0);
    doc.text(String(count), 110, currentY);
    doc.text(`${q.currency || "USD"} ${Number(q.amount || q.total_amount || 0).toLocaleString()}`, 130, currentY);
    doc.text(q.status || "Draft", 170, currentY);
    currentY += 10;
  });

  doc.save(`Quotations_List_${dateStr}.pdf`);
};
