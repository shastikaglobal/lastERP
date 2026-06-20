import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/auditLog";

export interface SoftDeleteOptions {
  deletedBy?: string | null;
  resourceType?: string;
  resourceName?: string;
  oldValues?: Record<string, any>;
  extraPayload?: Record<string, any>;
}

export async function softDeleteRecord(
  tableName: string,
  id: string,
  options: SoftDeleteOptions = {}
) {
  const { deletedBy, resourceType, resourceName, oldValues, extraPayload } = options;
  const { data: authUser } = await supabase.auth.getUser();
  const payload = {
    is_deleted: true,
    deleted_at: new Date().toISOString(),
    deleted_by: deletedBy ?? authUser?.user?.id ?? null,
    ...extraPayload,
  } as Record<string, any>;

  const { data, error } = await supabase
    .from(tableName as any)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    try {
      await logAudit({
        action: "delete",
        resourceType: resourceType ?? tableName,
        resourceId: id,
        resourceName,
        oldValues,
        newValues: payload,
        status: "failed",
        errorMessage: error.message,
      });
    } catch (auditError) {
      console.error("Failed to audit soft delete failure:", auditError);
    }

    throw error;
  }

  try {
    await logAudit({
      action: "delete",
      resourceType: resourceType ?? tableName,
      resourceId: id,
      resourceName,
      oldValues,
      newValues: payload,
      status: "success",
    });
  } catch (auditError) {
    console.error("Failed to audit soft delete:", auditError);
  }

  return data;
}

export async function restoreRecord(
  tableName: string,
  id: string,
  options: {
    resourceType?: string;
    resourceName?: string;
    oldValues?: Record<string, any>;
  } = {}
) {
  const { resourceType, resourceName, oldValues } = options;
  const payload = {
    is_deleted: false,
    deleted_at: null,
    deleted_by: null,
  } as Record<string, any>;

  const { data, error } = await supabase
    .from(tableName as any)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    try {
      await logAudit({
        action: "update",
        resourceType: resourceType ?? tableName,
        resourceId: id,
        resourceName,
        oldValues,
        newValues: payload,
        status: "failed",
        errorMessage: error.message,
      });
    } catch (auditError) {
      console.error("Failed to audit restore failure:", auditError);
    }

    throw error;
  }

  try {
    await logAudit({
      action: "update",
      resourceType: resourceType ?? tableName,
      resourceId: id,
      resourceName,
      oldValues,
      newValues: payload,
      status: "success",
    });
  } catch (auditError) {
    console.error("Failed to audit restore:", auditError);
  }

  return data;
}
