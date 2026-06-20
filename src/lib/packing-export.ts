import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface PackingPDFData {
    packing: any;
    receiving: any;
    company: any;
}

// Generate Packing List PDF
export async function generatePackingListPDF(data: PackingPDFData) {
    const { packing, receiving, company } = data;

    // Coerce numeric types that might come as strings from DB
    packing.net_weight = Number(packing.net_weight || 0);
    packing.gross_weight = Number(packing.gross_weight || 0);
    packing.carton_count = Number(packing.carton_count || 0);

    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 8.5in; margin: 0 auto; color: #000000;">
            <!-- Header -->
            <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 24px;">${company.name}</h1>
                <p style="margin: 5px 0 0 0; color: #666;">PACKING LIST</p>
            </div>

            <!-- Document Info -->
            <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
                <tr>
                    <td style="padding: 5px;">
                        <strong>Receiving #:</strong> ${receiving.receiving_number}
                    </td>
                    <td style="padding: 5px; text-align: right;">
                        <strong>Date:</strong> ${new Date(packing.created_at).toLocaleDateString()}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 5px;">
                        <strong>Status:</strong> ${packing.status.toUpperCase()}
                    </td>
                    <td style="padding: 5px; text-align: right;">
                        <strong>Packing ID:</strong> ${packing.id.substring(0, 8)}
                    </td>
                </tr>
            </table>

            <!-- Packing Details -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #ddd;">
                <thead>
                    <tr style="background-color: #f5f5f5; border-bottom: 1px solid #ddd;">
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Item</th>
                        <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Cartons</th>
                        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Net Weight (kg)</th>
                        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Gross Weight (kg)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 10px; border: 1px solid #ddd;">Received Items</td>
                        <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${packing.carton_count}</td>
                        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${packing.net_weight.toFixed(2)}</td>
                        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${packing.gross_weight.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <!-- Summary -->
            <div style="background-color: #f9f9f9; padding: 15px; border: 1px solid #ddd; margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 5px;"><strong>Pallet Configuration:</strong></td>
                        <td style="padding: 5px; text-align: right;">${packing.pallet_config}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px;"><strong>Packaging Weight:</strong></td>
                        <td style="padding: 5px; text-align: right;">${(packing.gross_weight - packing.net_weight).toFixed(2)} kg</td>
                    </tr>
                </table>
            </div>

            <!-- Export Marks -->
            <div style="margin-top: 20px;">
                <strong>Export Marks:</strong>
                <p style="white-space: pre-wrap; border: 1px dashed #999; padding: 10px; margin-top: 5px;">${packing.export_marks || "N/A"}</p>
            </div>

            <!-- Footer -->
            <div style="margin-top: 30px; text-align: center; color: #999; font-size: 12px;">
                <p>This is a system-generated packing list. No signature required.</p>
            </div>
        </div>
    `;

    return generatePDF(html, "Packing_List");
}

// Generate Packing Slip PDF
export async function generatePackingSlipPDF(data: PackingPDFData) {
    const { packing, receiving, company } = data;

    // Coerce numeric types that might come as strings from DB
    packing.net_weight = Number(packing.net_weight || 0);
    packing.gross_weight = Number(packing.gross_weight || 0);
    packing.carton_count = Number(packing.carton_count || 0);

    const html = `
        <div style="font-family: Arial, sans-serif; padding: 15px; max-width: 8.5in; color: #000000;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px;">
                <div>
                    <h2 style="margin: 0;">${company.name}</h2>
                    <p style="margin: 5px 0; font-size: 12px;">PACKING SLIP</p>
                </div>
                <div style="text-align: right; font-size: 12px;">
                    <p style="margin: 0;"><strong>Date:</strong> ${new Date(packing.created_at).toLocaleDateString()}</p>
                    <p style="margin: 5px 0 0 0;"><strong>Ref:</strong> ${packing.id.substring(0, 8)}</p>
                </div>
            </div>

            <!-- Quick Info -->
            <table style="width: 100%; margin-bottom: 15px; font-size: 12px;">
                <tr>
                    <td><strong>Receiving #:</strong> ${receiving.receiving_number}</td>
                    <td><strong>Cartons:</strong> ${packing.carton_count}</td>
                </tr>
                <tr>
                    <td><strong>Status:</strong> ${packing.status}</td>
                    <td><strong>Net Weight:</strong> ${packing.net_weight.toFixed(2)} kg</td>
                </tr>
            </table>

            <!-- Weight Summary -->
            <div style="background-color: #e8f4f8; padding: 10px; border-left: 4px solid #0066cc; margin: 15px 0; font-size: 12px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td><strong>Net Weight:</strong></td>
                        <td style="text-align: right;">${packing.net_weight.toFixed(2)} kg</td>
                    </tr>
                    <tr>
                        <td><strong>Gross Weight:</strong></td>
                        <td style="text-align: right;">${packing.gross_weight.toFixed(2)} kg</td>
                    </tr>
                    <tr style="border-top: 1px solid #999;">
                        <td><strong>Packaging:</strong></td>
                        <td style="text-align: right; font-weight: bold;">${(packing.gross_weight - packing.net_weight).toFixed(2)} kg</td>
                    </tr>
                </table>
            </div>

            <!-- Pallet & Marks -->
            <div style="font-size: 12px; margin: 15px 0;">
                <p><strong>Pallet Config:</strong> ${packing.pallet_config}</p>
                <p><strong>Export Marks:</strong></p>
                <p style="white-space: pre-wrap; margin: 5px 0; border: 1px solid #ddd; padding: 8px; background-color: #fafafa;">${packing.export_marks || "N/A"}</p>
            </div>

            <!-- Signature -->
            <div style="margin-top: 30px; display: flex; justify-content: space-around; font-size: 11px;">
                <div>
                    <p style="border-top: 1px solid #000; width: 100px; padding-top: 5px;">Packed By</p>
                </div>
                <div>
                    <p style="border-top: 1px solid #000; width: 100px; padding-top: 5px;">Verified By</p>
                </div>
            </div>
        </div>
    `;

    return generatePDF(html, "Packing_Slip");
}

// Generate Carton Labels PDF
export async function generateCartonLabelsPDF(data: PackingPDFData) {
    const { packing, receiving, company } = data;

    // Coerce numeric types that might come as strings from DB
    packing.net_weight = Number(packing.net_weight || 0);
    packing.gross_weight = Number(packing.gross_weight || 0);
    packing.carton_count = Number(packing.carton_count || 0);
    const cartonCount = packing.carton_count;

    let labels = "";
    for (let i = 1; i <= cartonCount; i++) {
        labels += `
            <div style="page-break-inside: avoid; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 4in; width: 6in; border: 2px solid #000; padding: 10px; margin: 5px; background-color: #fff; font-family: Arial; color: #000000;">
                <div style="text-align: center; width: 100%;">
                    <h3 style="margin: 0; font-size: 16px; font-weight: bold;">${company.name}</h3>
                    <p style="margin: 5px 0; font-size: 11px;">CARTON LABEL</p>
                </div>

                <div style="margin: 10px 0; text-align: center; font-size: 48px; font-weight: bold;">
                    ${i}/${cartonCount}
                </div>

                <table style="width: 90%; margin: 10px 0; font-size: 10px; border-collapse: collapse;">
                    <tr>
                        <td style="border: 1px solid #999; padding: 3px;"><strong>Ref:</strong></td>
                        <td style="border: 1px solid #999; padding: 3px;">${receiving.receiving_number}</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #999; padding: 3px;"><strong>Weight:</strong></td>
                        <td style="border: 1px solid #999; padding: 3px;">${(packing.net_weight / cartonCount).toFixed(2)} kg</td>
                    </tr>
                </table>

                <div style="border: 1px dashed #999; padding: 5px; margin: 5px 0; width: 90%; text-align: center; font-size: 9px; white-space: pre-wrap;">
                    ${packing.export_marks?.split("\n")[0] || "Handle with care"}
                </div>

                <p style="margin: 5px 0; font-size: 8px; text-align: center;">Date: ${new Date().toLocaleDateString()}</p>
            </div>
        `;
    }

    const html = `
        <div style="font-family: Arial, sans-serif; display: flex; flex-wrap: wrap; justify-content: center; color: #000000;">
            ${labels}
        </div>
    `;

    return generatePDF(html, "Carton_Labels");
}

// Helper function to generate PDF from HTML
async function generatePDF(html: string, filename: string) {
    try {
        // Create a temporary div with the HTML content
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;
        tempDiv.style.position = "absolute";
        tempDiv.style.top = "-9999px";
        tempDiv.style.left = "-9999px";
        tempDiv.style.width = "8.5in";
        tempDiv.style.zIndex = "-9999";
        tempDiv.style.pointerEvents = "none";
        document.body.appendChild(tempDiv);

        // Allow DOM to process the appended element
        await new Promise(resolve => setTimeout(resolve, 100));

        // Convert to canvas
        const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
        });

        // Remove temporary div
        document.body.removeChild(tempDiv);

        // Create PDF
        const imgData = canvas.toDataURL("image/jpeg", 1.0);
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
        });

        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= 297;

        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
            heightLeft -= 297;
        }

        pdf.save(`${filename}_${new Date().getTime()}.pdf`);
    } catch (error) {
        console.error("Error generating PDF:", error);
        throw error;
    }
}
