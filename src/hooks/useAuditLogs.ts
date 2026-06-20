import { useState, useEffect } from "react";
import { getAuditLogs, getAuditSummary, AuditAction } from "@/lib/auditLog";

export interface AuditLog {
  id: string;
  user_id: string;
  action: AuditAction;
  resource_type?: string | null;
  resource_id?: string | null;
  resource_name?: string | null;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  status?: "success" | "failed";
  error_message?: string | null;
  changes_count?: number;
  timestamp?: string;
  created_at?: string;
  user_email?: string | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
    department?: string | null;
  };
  team?: string | null;
}

export function useAuditLogs(filters?: {
  userId?: string;
  action?: AuditAction;
  team?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const data = await getAuditLogs(filters);
        setLogs(data as AuditLog[]);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch logs");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [filters?.userId, filters?.action, filters?.resourceType, filters?.limit, filters?.team]);

  return { logs, loading, error };
}

export function useAuditSummary(days: number = 7) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await getAuditSummary(days);
        setSummary(data);
      } catch (error) {
        console.error("Failed to fetch audit summary:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [days]);

  return { summary, loading };
}
