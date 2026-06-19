import { useMemo } from "react";
import { Target, Bell, CheckCircle2, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO } from "date-fns";

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

const statusColor = (s: string) => {
  const map: Record<string, string> = {
    "New": COLORS.blue,
    "Qualified": COLORS.purple,
    "Negotiation": COLORS.gold,
    "Follow-Up": COLORS.orange,
    "Closed Won": COLORS.green,
    "closed_won": COLORS.green,
    "Closed Lost": COLORS.red,
    "closed_lost": COLORS.red,
    "Draft": COLORS.textSecondary,
    "Sent": COLORS.blue,
    "Approved": COLORS.green,
    "Online": COLORS.green,
    "Idle": COLORS.gold,
    "Offline": COLORS.textMuted
  };
  return map[s] || COLORS.textSecondary;
};

const Card = ({ children, style = {} }: { children: React.ReactNode, style?: React.CSSProperties }) => (
  <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px 20px", ...style }}>
    {children}
  </div>
);

const MetricCard = ({ label, value, sub, color = COLORS.accent, icon, onClick }: any) => (
  <Card style={{ flex: 1, minWidth: 140, cursor: onClick ? "pointer" : "default" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }} onClick={onClick}>
      <div>
        <div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 4 }}>{sub}</div>}
      </div>
      {icon && <div style={{ opacity: 0.6 }}>{icon}</div>}
    </div>
  </Card>
);

const SectionHeader = ({ title, sub }: { title: string, sub?: string }) => (
  <div style={{ marginBottom: 20 }}>
    <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary }}>{title}</h2>
    {sub && <p style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>{sub}</p>}
  </div>
);

const ProgressBar = ({ value, max, color = COLORS.accent }: { value: number, max: number, color?: string }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ width: "100%", background: COLORS.border, borderRadius: 4, height: 6, marginTop: 6 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s" }} />
    </div>
  );
};

function Dashboard() {
  const { profile } = useAuth();

  const fetcher = async (url: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${session?.access_token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch analytics");
    return res.json();
  };

  const { data, isLoading } = useQuery({
    queryKey: ["crm_dashboard_analytics", profile?.company_id],
    queryFn: async () => {
      const companyQuery = profile?.company_id ? `?company_id=${profile.company_id}` : '';
      const [dash, funnel, rev, perf] = await Promise.all([
        fetcher(`/api/analytics/dashboard${companyQuery}`),
        fetcher(`/api/analytics/lead_funnel${companyQuery}`),
        fetcher(`/api/analytics/revenue${companyQuery}`),
        fetcher(`/api/analytics/performance${companyQuery}`)
      ]);
      
      return { dash, funnel, rev, perf };
    },
    enabled: !!profile // Wait for profile to load
  });

  if (isLoading || !data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "400px" }}>
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  const { dash, funnel: statusBreakdown, rev: trendData, perf: performanceData } = data;

  const totalLeads = dash.totalLeads || 0;
  const maxRevTrend = Math.max(...trendData.map((m: any) => m.revenue), 1);
  const revenueFormatted = dash.totalRevenue >= 1000000 
    ? `$${(dash.totalRevenue / 1000000).toFixed(2)}M` 
    : `$${(dash.totalRevenue / 1000).toFixed(1)}K`;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <SectionHeader title="CRM Dashboard" sub="Shastika Global Impex — Agri Export ERP Overview" />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <MetricCard label="Total Leads" value={dash.totalLeads.toString()} sub="Aggregated from live data" color={COLORS.blue} icon={<Target size={22} color={COLORS.blue} />} onClick={() => window.location.href = "/crm/leads"} />
        <MetricCard label="Pending Follow-Ups" value={dash.totalPending.toString()} sub={`${dash.overdueActivities} overdue`} color={COLORS.orange} icon={<Bell size={22} color={COLORS.orange} />} onClick={() => window.location.href = "/crm/activities"} />
        <MetricCard label="Closed Deals" value={dash.closedWonLeads.toString()} sub="Total Closed Won" color={COLORS.green} icon={<CheckCircle2 size={22} color={COLORS.green} />} onClick={() => window.location.href = "/crm/leads"} />
        <MetricCard label="Revenue (USD)" value={revenueFormatted} sub="Total approved quotations" color={COLORS.accent} icon={<DollarSign size={22} color={COLORS.accent} />} />
        <MetricCard label="Conversion Rate" value={`${dash.conversionRate}%`} sub="Won vs Total Leads" color={COLORS.purple} icon={<TrendingUp size={22} color={COLORS.purple} />} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: COLORS.textSecondary }}>MONTHLY REVENUE TREND</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
            {trendData.map((m: any, i: number) => {
              const label = format(parseISO(m.month), "MMM");
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: "100%", background: i === trendData.length - 1 ? COLORS.accent : COLORS.blue + "55", borderRadius: "4px 4px 0 0", height: `${(m.revenue / maxRevTrend) * 90}px`, transition: "height 0.5s", position: "relative" }}>
                    {m.revenue > 0 && <div style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: COLORS.accent, whiteSpace: "nowrap", fontFamily: "JetBrains Mono, monospace" }}>${(m.revenue / 1000).toFixed(0)}K</div>}
                  </div>
                  <span style={{ fontSize: 10, color: COLORS.textMuted }}>{label}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: COLORS.textSecondary }}>LEAD STATUS BREAKDOWN</div>
          {statusBreakdown.length === 0 ? (
            <div style={{ fontSize: 12, color: COLORS.textMuted, padding: "4px 0" }}>No lead data available</div>
          ) : statusBreakdown.map(([status, count]: [string, number]) => {
            const color = statusColor(status);
            return (
              <div key={status} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: COLORS.textSecondary, textTransform: "capitalize" }}>{status.replace("_", " ")}</span>
                  <span style={{ color, fontFamily: "JetBrains Mono, monospace" }}>{count}</span>
                </div>
                <ProgressBar value={count} max={totalLeads} color={color} />
              </div>
            );
          })}
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: COLORS.textSecondary }}>EMPLOYEE PERFORMANCE</div>
          {performanceData.length === 0 ? (
            <div style={{ fontSize: 12, color: COLORS.textMuted, padding: "4px 0" }}>No performance data available</div>
          ) : performanceData.map(([name, revenue]: [string, number]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: COLORS.accentDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: COLORS.accent, flexShrink: 0 }}>
                {name.split(" ").map(n => n[0]).join("")}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{name}</div>
                <ProgressBar value={revenue} max={Math.max(...performanceData.map((p: any) => p[1]))} color={revenue > 0 ? COLORS.green : COLORS.orange} />
              </div>
              <span style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: COLORS.textSecondary, flexShrink: 0 }}>${(revenue / 1000).toFixed(0)}K</span>
            </div>
          ))}
        </Card>

        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: COLORS.textSecondary }}>RECENT ACTIVITY</div>
          {(dash.recentActivities || []).length === 0 ? (
            <div style={{ fontSize: 12, color: COLORS.textMuted, padding: "4px 0" }}>No recent activity</div>
          ) : (dash.recentActivities || []).map((a: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: "JetBrains Mono, monospace", minWidth: 52, paddingTop: 2 }}>
                {format(parseISO(a.created_at), "hh:mm a")}
              </span>
              <div style={{ flex: 1, borderLeft: `2px solid ${COLORS.border}`, paddingLeft: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 500, textTransform: "capitalize" }}>{a.type} - {a.leads?.company_name || "Internal"}</div>
                <div style={{ fontSize: 11, color: COLORS.textSecondary }}>{a.title || "No notes provided"}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;
