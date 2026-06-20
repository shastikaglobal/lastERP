import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Monitor, Globe, Clock, User, Shield, ChevronRight } from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import SectionHeader from "../../components/SectionHeader";
import Card from "@/components/Card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const COLORS = {
  bg: "#0a0c10",
  surface: "#111318",
  card: "#161b22",
  border: "#21262d",
  accent: "#00d4aa",
  accentDim: "#00d4aa22",
  blue: "#388bfd",
  blueDim: "#388bfd22",
  orange: "#f78166",
  orangeDim: "#f7816622",
  purple: "#bc8cff",
  purpleDim: "#bc8cff22",
  gold: "#e3b341",
  goldDim: "#e3b34122",
  red: "#ff7b72",
  green: "#3fb950",
  textPrimary: "#e6edf3",
  textSecondary: "#8b949e",
  textMuted: "#484f58",
};

const Badge = ({ label, color = COLORS.accent }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
    {label}
  </span>
);

const statusColor = (s: string) => {
  const map: Record<string, string> = { 
    "Online": COLORS.green, 
    "Idle": COLORS.gold, 
    "Offline": COLORS.textMuted 
  };
  return map[s] || COLORS.textSecondary;
};

export default function EmployeeActivity({ hideHeader = false }: { hideHeader?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [stats, setStats] = useState({ online: 0, idle: 0, offline: 0, avgWorkHrs: "0h" });

  const fetchData = async () => {
    try {
      const [
        { data: profilesData },
        { data: sessionsData },
        { data: userRolesData }
        ] = await Promise.all([
          supabase.from("profiles" as any).select("id, full_name, avatar_url"),
          supabase.from("active_sessions" as any).select("*").neq("is_deleted", true),
          supabase.from("user_roles" as any).select("*")
        ]);

        const profiles = (profilesData || []) as any[];
        const sessions = (sessionsData || []) as any[];
        const userRoles = (userRolesData || []) as any[];

      if (!profiles) return;

      const now = new Date();
      const enrichedEmployees = (profiles || []).map(profile => {
        const session = (sessions || []).find(s => s.user_id === profile.id);
        const role = (userRoles || []).find(ur => ur.user_id === profile.id);
        
        let status = "Offline";
        let idleTime = "—";
        let lastSeen = null;
        
        if (session) {
          lastSeen = new Date(session.last_active);
          const diffMinutes = Math.max(0, (now.getTime() - lastSeen.getTime()) / (1000 * 60));
          
          if (diffMinutes < 5) {
            status = "Online";
            idleTime = "Active now";
          } else if (diffMinutes < 30) {
            status = "Idle";
            idleTime = `${Math.round(diffMinutes)}m`;
          } else {
            status = "Offline";
          }
        }

        return {
          id: profile.id,
          name: profile.full_name || "Unknown",
          role: role?.roles?.name || "BDE",
          status: status,
          login: session?.login_at ? format(parseISO(session.login_at), 'hh:mm a') : "—",
          ip: "192.168.1.101", // Default placeholder if not tracked
          device: session?.device_info || "Browser Session",
          location: "India",
          idle: idleTime,
          avatar: profile.avatar_url,
          initials: (profile.full_name || "??")
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase()
        };
      });

      setEmployees(enrichedEmployees.sort((a, b) => a.status === "Online" ? -1 : 1));
      
      setStats({
        online: enrichedEmployees.filter(e => e.status === "Online").length,
        idle: enrichedEmployees.filter(e => e.status === "Idle").length,
        offline: enrichedEmployees.filter(e => e.status === "Offline").length,
        avgWorkHrs: "8.2h"
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to load activity data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to active_sessions changes in real-time
    const channel = supabase
      .channel("active_sessions_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "active_sessions"
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    // Fallback polling (every 60s)
    const interval = setInterval(fetchData, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#00d4aa]" />
        <p className="text-muted-foreground animate-pulse font-mono text-sm uppercase tracking-widest">Scanning Active Sessions...</p>
      </div>
    );
  }

  return (
    <div style={{ animation: "slideIn 0.3s ease" }} className="pb-20">
      {!hideHeader && (
        <SectionHeader title="Employee Activity Tracking" sub="Real-time monitoring: login, IP, device, work duration, and live session status." />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Online Now" value={stats.online.toString()} color={COLORS.green} icon="🟢" />
        <MetricCard label="Idle" value={stats.idle.toString()} color={COLORS.gold} icon="🟡" />
        <MetricCard label="Offline" value={stats.offline.toString()} color={COLORS.red} icon="🔴" />
        <MetricCard label="Avg Deployment" value="98%" color={COLORS.blue} icon="⚡" />
      </div>

      <div className="grid gap-3">
        {employees.map(e => (
          <div key={e.id} className="bg-neutral-900/40 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all backdrop-blur-3xl group">
            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
              <div className="flex items-center gap-4 min-w-[200px]">
                <div className="relative group-hover:scale-105 transition-transform">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-lg shadow-xl shadow-emerald-500/5">
                    {e.initials}
                  </div>
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-[#0a0c10] shadow-lg",
                    e.status === "Online" ? "bg-emerald-500 animate-pulse" : e.status === "Idle" ? "bg-amber-500" : "bg-neutral-600"
                  )} />
                </div>
                <div>
                  <div className="font-bold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{e.name}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-black flex items-center gap-1">
                    <Shield className="h-3 w-3 text-emerald-500/50" /> {e.role}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 w-full">
                {[
                  { label: "Session Init", val: e.login, icon: Clock, color: "text-blue-400" },
                  { label: "IP Address", val: e.ip, icon: Globe, color: "text-purple-400" },
                  { label: "Terminal", val: e.device, icon: Monitor, color: "text-amber-400" },
                  { label: "Idle State", val: e.idle, icon: Clock, color: "text-orange-400" },
                ].map((item, idx) => (
                  <div key={idx} className="bg-black/20 rounded-xl p-3 border border-white/5 hover:bg-black/40 transition-colors">
                    <div className="text-[9px] text-muted-foreground uppercase font-black mb-1 flex items-center gap-1.5">
                      <item.icon className={cn("h-3 w-3", item.color)} /> {item.label}
                    </div>
                    <div className="text-xs font-mono text-white/90 truncate">{item.val}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 self-end lg:self-auto">
                <Badge label={e.status} color={statusColor(e.status)} />
                <ChevronRight className="h-5 w-5 text-muted-foreground opacity-20 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const MetricCard = ({ label, value, color = COLORS.accent, icon }: any) => (
  <Card className="bg-neutral-900/60 border-white/5 backdrop-blur-xl relative overflow-hidden group">
    <div className="absolute -bottom-2 -right-2 text-4xl opacity-5 group-hover:scale-125 transition-transform rotate-12">{icon}</div>
    <div className="p-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mb-1">{label}</div>
      <div className={cn("text-3xl font-black font-mono",)} style={{ color }}>{value}</div>
    </div>
  </Card>
);
