import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { logCRMAction } from "@/services/crmAudit";

export const exportCRMtoPDF = async (elementId: string, isPrivileged: boolean, recordCount: number) => {
  if (!isPrivileged) {
    toast.error("You do not have permission to export to PDF");
    return;
  }
  
  const element = document.getElementById(elementId);
  if (!element) {
    toast.error("Table not found for export");
    return;
  }
  
  try {
    toast.info("Generating PDF, please wait...");
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    
    const pdf = new jsPDF("l", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("crm_leads.pdf");
    
    toast.success("PDF exported successfully");
    logCRMAction('EXPORT_PDF', recordCount);
  } catch (error) {
    console.error("PDF Export Error:", error);
    toast.error("Failed to generate PDF");
  }
};

export const exportCRMtoExcel = (data: any[], isPrivileged: boolean) => {
  if (!isPrivileged) {
    toast.error("You do not have permission to export to Excel");
    return;
  }
  
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    
    XLSX.writeFile(workbook, "crm_leads.xlsx");
    toast.success("Excel exported successfully");
    
    logCRMAction('EXPORT_EXCEL', data.length);
  } catch (error) {
    console.error("Excel Export Error:", error);
    toast.error("Failed to generate Excel file");
  }
};
