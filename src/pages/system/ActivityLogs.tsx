import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { inferTeamFromActorName } from "@/lib/teamMapping";

interface ActivityLog {
  id: string;
  company_id: string;
  actor_id: string | null;
  actor_name: string;
  entity: string | null;
  action: string;
  team: string | null;
  created_at: string;
  actor_role?: string | null;
  user_name?: string | null;
  module?: string | null;
  event_type?: string | null;
}

const ROLE_TO_TEAM: Record<string, string> = {
  admin: "Management",
  bde: "Business Development Team",
  "senior bde": "Sales Team",
  "junior bde": "Sales Team",
  sales: "Sales Team",
  secretary: "Operations Team",
  procurement: "Procurement Team",
  accounts: "Accounts Team",
  qc: "Quality Control Team",
  logistics: "Logistics Team",
};

const getEntityBadge = (entity: string | null | undefined) => {
  if (!entity) return <span className="text-muted-foreground text-xs">—</span>;

  const styles: Record<string, string> = {
    QUOTATION: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    LEAD: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    INVOICE: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    SHIPMENT: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    PO: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    CRM_ACTIVITY: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  };

  const key = entity.toUpperCase();
  const style = styles[key] || "bg-muted text-muted-foreground border-transparent";
  const displayName = entity === "CRM_ACTIVITY" ? "CRM Task" : entity;

  return (
    <Badge variant="outline" className={`font-mono text-[10px] font-bold uppercase ${style}`}>
      {displayName}
    </Badge>
  );
};

const getRoleBadge = (role: string | null | undefined) => {
  if (!role) return null;
  const roleStyles: Record<string, string> = {
    admin: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    bde: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "senior bde": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "junior bde": "bg-teal-500/10 text-teal-400 border-teal-500/20",
    secretary: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  };
  const style = roleStyles[role.toLowerCase()] || "bg-muted text-muted-foreground border-transparent";
  return (
    <Badge variant="outline" className={`font-mono text-[9px] font-bold uppercase ml-1.5 ${style}`}>
      {role}
    </Badge>
  );
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const { data: logsData, error: logsError } = await supabase
        .from("activity_logs" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (logsError) throw logsError;

      const rawLogs = (logsData || []) as ActivityLog[];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, requested_role");

      const profileMap: Record<string, { role: string; team: string }> = {};
      (profiles || []).forEach((p: any) => {
        const role = p.requested_role || "";
        profileMap[p.id] = {
          role,
          team: ROLE_TO_TEAM[role.toLowerCase()] || role,
        };
      });

      const enriched: ActivityLog[] = rawLogs.map((log) => {
        const profile = log.actor_id ? profileMap[log.actor_id] : null;
        return {
          ...log,
          actor_role: profile?.role || null,
          team: log.team || profile?.team || null,
        };
      });

      setLogs(enriched);
    } catch (err: any) {
      toast.error(err.message || "Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    const channelId = `activity-logs-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, () => fetchLogs())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div>
      <PageHeader
        title="Activity Logs"
        description="Full audit trail of system actions"
        breadcrumbs={[{ label: "System" }, { label: "Logs" }]}
      />
      {loading ? (
        <div className="flex justify-center items-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <DataTable
          data={logs}
          searchKeys={["actor_name", "user_name", "action", "event_type", "entity", "module", "team"]}
          columns={[
            {
              key: "created_at",
              header: "Time",
              render: (r) => (
                <span className="text-xs font-mono text-muted-foreground">
                  {format(new Date(r.created_at), "PPp")}
                </span>
              ),
            },
            {
              key: "actor_name",
              header: "Actor",
              render: (r) => (
                <div className="flex items-center flex-wrap gap-1">
                  <span className="font-medium text-foreground">{r.actor_name || r.user_name || "Unknown"}</span>
                  {getRoleBadge(r.actor_role)}
                </div>
              ),
            },
            {
              key: "team",
              header: "Team",
              render: (r) => {
                const displayTeam = r.team || inferTeamFromActorName(r.actor_name || r.user_name || "");
                return <span className="text-sm text-muted-foreground">{displayTeam || "—"}</span>;
              },
            },
            {
              key: "entity",
              header: "Entity",
              render: (r) => getEntityBadge(r.entity || r.module),
            },
            {
              key: "action",
              header: "Action",
              render: (r) => (
                <span className="text-sm text-muted-foreground">{r.action || r.event_type || "—"}</span>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}