import { supabase } from "@/integrations/supabase/client";
import { inferTeamFromActorName } from "@/lib/teamMapping";

const AUDIT_LOGS_TABLE = "audit_logs";
const CRM_AUDIT_LOG_TABLE = "crm_audit_log";

let resolvedAuditTable: string | null = null;

async function getAuditTableName() {
  if (resolvedAuditTable) return resolvedAuditTable;

  const { error } = await supabase
    .from(AUDIT_LOGS_TABLE)
    .select("id")
    .limit(1);

  resolvedAuditTable = error ? CRM_AUDIT_LOG_TABLE : AUDIT_LOGS_TABLE;
  return resolvedAuditTable;
}

export type AuditAction = 
  | "create" 
  | "update" 
  | "delete" 
  | "export" 
  | "login" 
  | "logout" 
  | "view" 
  | "download" 
  | "share" 
  | "approve"
  | "reject"
  | "archive";

export interface AuditLogEntry {
  action: AuditAction;
  resourceType: string;
  team?: string;
  resourceId?: string;
  resourceName?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  status?: "success" | "failed";
  errorMessage?: string;
}

/**
 * Log an action to the audit_logs table
 * Automatically captures user_id and current timestamp
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("No authenticated user for audit log");
      return;
    }

    // Calculate changes count
    const changesCount = entry.newValues 
      ? Object.keys(entry.newValues).length 
      : 0;

    // Get IP address (best effort - may be undefined in some environments)
    let ipAddress: string | undefined;
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      ipAddress = data.ip;
    } catch (error) {
      // IP fetch failed, continue without it
      console.debug("Could not fetch IP address");
    }

    // Resolve team: prefer provided value, else try to infer from profile or roles
    let teamToInsert: string | undefined = entry.team;
    let profileFullName: string | undefined;

    if (!teamToInsert) {
      try {
        // Try to read department and full name from profiles (some deployments may have this column)
        const { data: profileData, error: profErr } = await supabase
          .from("profiles")
          .select("department, full_name")
          .eq("id", user.id)
          .single();

        if (!profErr) {
          if (profileData?.department) {
            teamToInsert = profileData.department;
          }
          profileFullName = profileData?.full_name;
        }
      } catch (err) {
        // ignore
      }
    }

    if (!teamToInsert) {
      teamToInsert = inferTeamFromActorName(profileFullName || user.email || undefined);
    }

    if (!teamToInsert) {
      try {
        // Fallback: infer from role slugs (e.g. 'bde' or 'sales' -> 'BDE')
        const { data: userRoles } = await supabase
          .from("user_roles")
          .select("roles(slug)")
          .eq("user_id", user.id);

        const slugs = (userRoles || []).map((r: any) => r.roles?.slug).filter(Boolean) as string[];
        if (slugs.find(s => /bde|sales/i.test(s))) teamToInsert = "BDE";
        else if (slugs.find(s => /admin/i.test(s))) teamToInsert = "Admin";
      } catch (err) {
        // ignore
      }
    }

    // Insert audit log into the table available in the current database.
    const auditTable = await getAuditTableName();
    const insertPayload =
      auditTable === AUDIT_LOGS_TABLE
        ? {
            user_id: user.id,
            action: entry.action,
            team: teamToInsert,
            resource_type: entry.resourceType,
            resource_id: entry.resourceId,
            resource_name: entry.resourceName,
            old_values: entry.oldValues,
            new_values: entry.newValues,
            ip_address: ipAddress,
            user_agent: navigator.userAgent,
            status: entry.status || "success",
            error_message: entry.errorMessage,
            changes_count: changesCount,
          }
        : {
            user_id: user.id,
            action: entry.action,
            user_email: user.email ?? undefined,
          };

    const { error } = await supabase.from(auditTable).insert(insertPayload);

    if (error) {
      console.error("Failed to log audit:", error);
    }
  } catch (error) {
    console.error("Audit logging error:", error);
  }
}

/**
 * Fetch audit logs with filters
 */
export async function getAuditLogs(filters?: {
  userId?: string;
  action?: AuditAction;
  team?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const auditTable = await getAuditTableName();

  const selectFields =
    auditTable === AUDIT_LOGS_TABLE
      ? `
      *,
      profiles!inner(full_name, email)
    `
      : "id,created_at,action,user_id,user_email";

  const orderColumn = auditTable === AUDIT_LOGS_TABLE ? "timestamp" : "created_at";

  let query = supabase
    .from(auditTable)
    .select(selectFields)
    .order(orderColumn, { ascending: false });

  if (filters?.userId) {
    query = query.eq("user_id", filters.userId);
  }
  if (filters?.action) {
    query = query.eq("action", filters.action);
  }

  if (auditTable === AUDIT_LOGS_TABLE) {
    if (filters?.resourceType) {
      query = query.eq("resource_type", filters.resourceType);
    }
    if (filters?.resourceId) {
      query = query.eq("resource_id", filters.resourceId);
    }
    if (filters?.team) {
      query = query.eq("team", filters.team);
    }
    if (filters?.startDate) {
      query = query.gte("timestamp", filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query = query.lte("timestamp", filters.endDate.toISOString());
    }
  } else {
    if (filters?.startDate) {
      query = query.gte("created_at", filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query = query.lte("created_at", filters.endDate.toISOString());
    }
  }

  const limit = filters?.limit || 100;
  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch audit logs:", error);
    return [];
  }

  return data;
}

/**
 * Get summary statistics of audit logs
 */
export async function getAuditSummary(days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const auditTable = await getAuditTableName();

  if (auditTable === AUDIT_LOGS_TABLE) {
    const { data, error } = await supabase
      .from(auditTable)
      .select("action, status, resource_type")
      .gte("timestamp", startDate.toISOString());

    if (error) {
      console.error("Failed to fetch audit summary:", error);
      return null;
    }

    const summary = {
      totalLogs: data.length,
      byAction: {} as Record<string, number>,
      byStatus: { success: 0, failed: 0 },
      byResourceType: {} as Record<string, number>,
    };

    data.forEach((log: any) => {
      summary.byAction[log.action] = (summary.byAction[log.action] || 0) + 1;
      summary.byStatus[log.status] = (summary.byStatus[log.status] || 0) + 1;
      summary.byResourceType[log.resource_type] = 
        (summary.byResourceType[log.resource_type] || 0) + 1;
    });

    return summary;
  }

  const { data, error } = await supabase
    .from(auditTable)
    .select("action")
    .gte("created_at", startDate.toISOString());

  if (error) {
    console.error("Failed to fetch CRM audit summary:", error);
    return null;
  }

  const summary = {
    totalLogs: data.length,
    byAction: {} as Record<string, number>,
    byStatus: null,
    byResourceType: null,
  };

  data.forEach((log: any) => {
    summary.byAction[log.action] = (summary.byAction[log.action] || 0) + 1;
  });

  return summary;
}

/**
 * Delete old audit logs (for data retention policy)
 * Admin only - keep last 90 days
 */
export async function cleanupOldAuditLogs(daysToKeep: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const auditTable = await getAuditTableName();
  const dateColumn = auditTable === AUDIT_LOGS_TABLE ? "timestamp" : "created_at";

  const { data, error } = await supabase
    .from(auditTable)
    .update({
      is_deleted: true,
      deleted_at: cutoffDate.toISOString(),
      deleted_by: null,
    })
    .lt(dateColumn, cutoffDate.toISOString())
    .select('id');

  if (error) {
    console.error("Failed to cleanup audit logs:", error);
    return 0;
  }

  return data?.length || 0;
}
