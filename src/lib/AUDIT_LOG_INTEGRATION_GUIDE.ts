/**
 * INTEGRATION GUIDE FOR AUDIT LOGS
 * 
 * Add these calls to track important operations in your app
 */

// ============================================
// EXAMPLE 1: Creating a Quotation
// ============================================
import { logAudit } from "@/lib/auditLog";
import { softDeleteRecord } from "@/lib/softDelete";

async function createQuotation(data: any) {
  try {
    const { data: newQuotation, error } = await supabase
      .from("quotations")
      .insert([data])
      .select()
      .single();

    if (error) throw error;

    // LOG THE ACTION
    await logAudit({
      action: "create",
      team: "BDE",
      resourceType: "quotation",
      resourceId: newQuotation.id,
      resourceName: `Quotation #${newQuotation.quotation_number}`,
      newValues: newQuotation,
      status: "success",
    });

    return newQuotation;
  } catch (error) {
    // LOG THE ERROR
    await logAudit({
      action: "create",
      team: "BDE",
      resourceType: "quotation",
      newValues: data,
      status: "failed",
      errorMessage: error.message,
    });
    throw error;
  }
}

// ============================================
// EXAMPLE 2: Updating a Quotation
// ============================================

async function updateQuotation(id: string, updates: any, oldValues: any) {
  try {
    const { data: updatedQuotation, error } = await supabase
      .from("quotations")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // LOG WHAT CHANGED
    await logAudit({
      action: "update",
      team: "BDE",
      resourceType: "quotation",
      resourceId: id,
      resourceName: `Quotation #${updatedQuotation.quotation_number}`,
      oldValues,
      newValues: updates,
      status: "success",
    });

    return updatedQuotation;
  } catch (error) {
    await logAudit({
      action: "update",
      team: "BDE",
      resourceType: "quotation",
      resourceId: id,
      oldValues,
      newValues: updates,
      status: "failed",
      errorMessage: error.message,
    });
    throw error;
  }
}

// ============================================
// EXAMPLE 3: Deleting a Record
// ============================================

async function deleteQuotation(id: string, quotationNumber: string) {
  try {
    await softDeleteRecord("quotations", id, {
      resourceType: "quotation",
      resourceName: `Quotation #${quotationNumber}`,
    });

    // LOG THE SOFT DELETE ACTION
    await logAudit({
      action: "delete",
      team: "BDE",
      resourceType: "quotation",
      resourceId: id,
      resourceName: `Quotation #${quotationNumber}`,
      status: "success",
    });
  } catch (error) {
    await logAudit({
      action: "delete",
      team: "BDE",
      resourceType: "quotation",
      resourceId: id,
      resourceName: `Quotation #${quotationNumber}`,
      status: "failed",
      errorMessage: error.message,
    });
    throw error;
  }
}

// ============================================
// EXAMPLE 4: Exporting Data
// ============================================

async function exportQuotations(filters: any) {
  try {
    const { data: quotations, error } = await supabase
      .from("quotations")
      .select("*")
      .match(filters);

    if (error) throw error;

    // LOG THE EXPORT
    await logAudit({
      action: "export",
      team: "BDE",
      resourceType: "quotation",
      resourceName: `Export: ${quotations.length} quotations`,
      newValues: { count: quotations.length, filters },
      status: "success",
    });

    return quotations;
  } catch (error) {
    await logAudit({
      action: "export",
      team: "BDE",
      resourceType: "quotation",
      status: "failed",
      errorMessage: error.message,
    });
    throw error;
  }
}

// ============================================
// EXAMPLE 5: Downloading Files
// ============================================

async function downloadQuotationPDF(quotationId: string, quotationNumber: string) {
  try {
    // Generate/download PDF
    const pdfBlob = await generatePDF(quotationId);

    // LOG THE DOWNLOAD
    await logAudit({
      action: "download",
      team: "BDE",
      resourceType: "quotation",
      resourceId: quotationId,
      resourceName: `${quotationNumber}.pdf`,
      status: "success",
    });

    // Download file
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${quotationNumber}.pdf`;
    link.click();
  } catch (error) {
    await logAudit({
      action: "download",
      team: "BDE",
      resourceType: "quotation",
      resourceId: quotationId,
      status: "failed",
      errorMessage: error.message,
    });
    throw error;
  }
}

// ============================================
// EXAMPLE 6: Sharing/Changing Permissions
// ============================================

async function shareQuotation(quotationId: string, sharedWithUserId: string) {
  try {
    const { error } = await supabase
      .from("quotation_shares")
      .insert({ quotation_id: quotationId, shared_with_user_id: sharedWithUserId });

    if (error) throw error;

    // LOG THE SHARE ACTION
    await logAudit({
      action: "share",
      team: "BDE",
      resourceType: "quotation",
      resourceId: quotationId,
      newValues: { sharedWithUserId },
      status: "success",
    });
  } catch (error) {
    await logAudit({
      action: "share",
      team: "BDE",
      resourceType: "quotation",
      resourceId: quotationId,
      newValues: { sharedWithUserId },
      status: "failed",
      errorMessage: error.message,
    });
    throw error;
  }
}

// ============================================
// EXAMPLE 7: Approvals/Status Changes
// ============================================

async function approveQuotation(quotationId: string, approverNotes: string) {
  try {
    const { data: updated, error } = await supabase
      .from("quotations")
      .update({
        status: "approved",
        approved_at: new Date(),
        approver_notes: approverNotes,
      })
      .eq("id", quotationId)
      .select()
      .single();

    if (error) throw error;

    // LOG THE APPROVAL
    await logAudit({
      action: "approve",
      team: "BDE",
      resourceType: "quotation",
      resourceId: quotationId,
      resourceName: updated.quotation_number,
      newValues: { status: "approved", approverNotes },
      status: "success",
    });
  } catch (error) {
    await logAudit({
      action: "approve",
      team: "BDE",
      resourceType: "quotation",
      resourceId: quotationId,
      status: "failed",
      errorMessage: error.message,
    });
    throw error;
  }
}

// ============================================
// QUICK CHECKLIST - Add logging to these operations:
// ============================================

/*
  ✓ Create quotation
  ✓ Update quotation
  ✓ Delete quotation
  ✓ Export quotations
  ✓ Download PDF/invoice
  ✓ Share quotation
  ✓ Approve quotation
  
  ✓ Create customer
  ✓ Update customer
  ✓ Delete customer
  ✓ Export customer list
  ✓ Merge customers
  
  ✓ Create order
  ✓ Update order
  ✓ Delete order
  ✓ Export orders
  
  ✓ Create invoice
  ✓ Send invoice
  ✓ Download invoice
  ✓ Mark as paid
  
  ✓ Approve/reject approvals
  ✓ Change user role
  ✓ Create/update employee
  ✓ Login/logout
*/
