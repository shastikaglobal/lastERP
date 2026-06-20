import { useState, useEffect, useMemo, useCallback } from "react";
import {
  MoreVertical, Calendar as CalendarIcon, Video, Phone, Users,
  ChevronDown, ChevronUp, Plus, ExternalLink, FileText, Copy,
  Home, Radio, BarChart2, Link2, CheckCircle2, AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ScheduleMeetingModal } from "@/components/crm/ScheduleMeetingModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// ─── Design tokens ───────────────────────────────────────────────────────────
const C = {
  bg: "#0a0c10",
  surface: "#111318",
  card: "#161b22",
  border: "#21262d",
  accent: "#00d4aa",
  blue: "#388bfd",
  blueDim: "#388bfd22",
  teal: "#2dd4bf",
  orange: "#f78166",
  purple: "#bc8cff",
  gold: "#e3b341",
  red: "#ff7b72",
  green: "#3fb950",
  text: "#e6edf3",
  sub: "#8b949e",
  muted: "#484f58",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const dateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const Pill = ({ label, color = C.accent }: { label: string; color?: string }) => (
  <span style={{
    background: color + "22", color, border: `1px solid ${color}44`,
    borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600,
    letterSpacing: "0.05em", whiteSpace: "nowrap",
  }}>{label}</span>
);

const MutedCard = ({ children, style = {} }: any) => (
  <div style={{
    background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 12, padding: "16px 20px", ...style,
  }}>{children}</div>
);

const typeColor = (t: string) => {
  if (t === "Video Call") return C.blue;
  if (t === "In-Person") return C.purple;
  if (t === "Audio Only") return C.green;
  if (t === "Phone") return C.green;
  return C.accent;
};

// ─── Static demo data ────────────────────────────────────────────────────────
const CALL_LOGS = [
  { date: "May 29", time: "11:30 AM", contact: "Ahmad Al-Rashid", company: "Future Wave", duration: "18 min", outcome: "Positive", by: "Swathi" },
  { date: "May 29", time: "10:15 AM", contact: "Klaus Weber", company: "OrganicLife GmbH", duration: "12 min", outcome: "Follow-Up", by: "Priya" },
  { date: "May 28", time: "03:00 PM", contact: "Marc Dupont", company: "NaturalBest Co.", duration: "8 min", outcome: "Not Available", by: "Rajesh" },
  { date: "May 28", time: "11:00 AM", contact: "James Carter", company: "Sea Horse Pvt", duration: "22 min", outcome: "Quotation Requested", by: "Rajesh" },
];
const EMAILS = [
  { date: "May 29", subject: "Turmeric Powder — Price Revision Q2", to: "ahmad@futurewave.ae", status: "Opened", by: "Swathi" },
  { date: "May 28", subject: "Product Catalog — Organic Spices 2026", to: "k.weber@organiclife.de", status: "Delivered", by: "Priya" },
  { date: "May 27", subject: "PI-2026-421 — Payment Confirmation", to: "liwei@eastwest.sg", status: "Replied", by: "Swathi" },
];

// ─── Main Component ───────────────────────────────────────────────────────────
function Communication() {
  const { profile } = useAuth();

  const [mainTab, setMainTab] = useState("meetings");
  const [meetTab, setMeetTab] = useState("home");
  const [showPast, setShowPast] = useState(false);

  // Meetings state
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState<string | undefined>(undefined);
  const [editTarget, setEditTarget] = useState<any>(null);

  // Zoho connection state
  const [zohoConnected, setZohoConnected] = useState(false);
  const [zohoAccount, setZohoAccount] = useState<any>(null);
  const [personalRoom, setPersonalRoom] = useState("");
  const [personalRoomStartUrl, setPersonalRoomStartUrl] = useState("");
  const [personalRoomInput, setPersonalRoomInput] = useState("");
  const [personalRoomLoading, setPersonalRoomLoading] = useState(false);
  const [meetNowLoading, setMeetNowLoading] = useState(false);

  // Calendar
  const today = new Date();
  const todayStr = dateStr(today);
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  // ── Fetch Zoho account & personal room ──────────────────────────────────
  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from("zoho_accounts")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(async ({ data }) => {
        if (data && data.length > 0) {
          setZohoConnected(true);
          setZohoAccount(data[0]);

          // Fetch personal room from Zoho API
          setPersonalRoomLoading(true);
          try {
            const { data: roomData } = await supabase.functions.invoke("zoho-meeting", {
              body: { action: "personal_room" },
            });
            if (roomData?.success && roomData.join_url) {
              setPersonalRoom(roomData.join_url);
              setPersonalRoomInput(roomData.join_url);
              setPersonalRoomStartUrl(roomData.start_url || roomData.join_url);
              // Also save to profiles for future use
              await supabase.from("profiles").update({ zoho_meeting_link: roomData.join_url }).eq("id", profile.id);
            } else {
              // Fall back to locally saved link
              const { data: prof } = await supabase.from("profiles").select("zoho_meeting_link").eq("id", profile.id).single();
              if (prof?.zoho_meeting_link) {
                setPersonalRoom(prof.zoho_meeting_link);
                setPersonalRoomInput(prof.zoho_meeting_link);
              }
            }
          } catch {
            const { data: prof } = await supabase.from("profiles").select("zoho_meeting_link").eq("id", profile.id).single();
            if (prof?.zoho_meeting_link) {
              setPersonalRoom(prof.zoho_meeting_link);
              setPersonalRoomInput(prof.zoho_meeting_link);
            }
          } finally {
            setPersonalRoomLoading(false);
          }
        } else {
          // No Zoho account — fall back to profile link
          const { data: prof } = await supabase.from("profiles").select("zoho_meeting_link").eq("id", profile.id).single();
          if (prof?.zoho_meeting_link) {
            setPersonalRoom(prof.zoho_meeting_link);
            setPersonalRoomInput(prof.zoho_meeting_link);
          }
        }
      });
  }, [profile?.id]);

  // ── Fetch Meetings ────────────────────────────────────────────────────────
  const fetchMeetings = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoadingMeetings(true);
    const { data } = await supabase
      .from("meetings")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("meeting_date", { ascending: true })
      .order("meeting_time", { ascending: true });
    setMeetings(data || []);
    setLoadingMeetings(false);
  }, [profile?.company_id]);

  useEffect(() => {
    fetchMeetings();
    const ch = supabase
      .channel("meetings_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, fetchMeetings)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchMeetings]);

  // ── Reminders ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const upcoming = meetings.filter(m => m.status === "Upcoming" && m.meeting_date === todayStr);
    const ids: ReturnType<typeof setTimeout>[] = [];
    upcoming.forEach(m => {
      const t = new Date(`${m.meeting_date}T${m.meeting_time}`).getTime() - Date.now() - 10 * 60 * 1000;
      if (t > 0 && t < 86400000) {
        ids.push(setTimeout(() => toast.info(`Meeting in 10 min: ${m.title}`), t));
      }
    });
    return () => ids.forEach(clearTimeout);
  }, [meetings, todayStr]);

  // ── Processed meetings ────────────────────────────────────────────────────
  const upcoming = useMemo(() =>
    meetings
      .filter(m => m.status === "Upcoming" && m.meeting_date >= todayStr)
      .map(m => {
        const d = new Date(m.meeting_date);
        const isToday = m.meeting_date === todayStr;
        let countdown = "";
        if (isToday) {
          const diff = new Date(`${m.meeting_date}T${m.meeting_time}`).getTime() - Date.now();
          if (diff > 0) {
            const h = Math.floor(diff / 3600000);
            const min = Math.floor((diff % 3600000) / 60000);
            countdown = h > 0 ? `In ${h}h ${min}m` : `In ${min}m`;
          } else countdown = "Started";
        }
        return { ...m, day: String(d.getDate()).padStart(2, "0"), month: d.toLocaleString("en-US", { month: "short" }), isToday, countdown };
      }),
    [meetings, todayStr]
  );

  const past = useMemo(() =>
    meetings
      .filter(m => m.status !== "Upcoming" || m.meeting_date < todayStr)
      .map(m => {
        const d = new Date(m.meeting_date);
        return { ...m, day: String(d.getDate()).padStart(2, "0"), month: d.toLocaleString("en-US", { month: "short" }) };
      })
      .sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime()),
    [meetings, todayStr]
  );

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();

  const getDot = (day: number) => {
    const s = dateStr(new Date(calYear, calMonth, day));
    const has = meetings.some(m => m.meeting_date === s);
    if (!has) return null;
    if (s === todayStr) return C.orange;
    if (s < todayStr) return C.sub;
    return C.green;
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const copyLink = (link: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(link);
    toast.success("Link copied!");
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("meetings").update({ status }).eq("id", id);
    toast.success(`Marked as ${status}`);
  };

  const savePersonalRoom = async () => {
    if (!personalRoomInput || !profile?.id) return;
    await supabase.from("profiles").update({ zoho_meeting_link: personalRoomInput }).eq("id", profile.id);
    setPersonalRoom(personalRoomInput);
    toast.success("Personal room saved!");
  };

  const handleMeetNow = async () => {
    if (!profile) return;
    setMeetNowLoading(true);
    try {
      const topic = `Quick Meeting – ${new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`;
      let joinUrl = "";
      let startUrl = "";
      let meetingKey = "";
      let zohoSessionId = null;

      if (zohoConnected) {
        // Create real Zoho meeting via edge function
        const { data: zohoRes } = await supabase.functions.invoke("zoho-meeting", {
          body: {
            action: "create",
            meetingData: {
              title: topic,
              description: "",
              startTime: new Date().toISOString(),
              duration: 60,
              lobby_enabled: false,
            },
          },
        });
        if (zohoRes?.success && zohoRes.join_url) {
          joinUrl = zohoRes.join_url;
          startUrl = zohoRes.start_url || zohoRes.join_url;
          meetingKey = zohoRes.meeting_key || "";
          zohoSessionId = zohoRes.zoho_session_id || null;
        }
      }

      // Fallback to generated link if Zoho not connected or failed
      if (!joinUrl) {
        joinUrl = `https://meet.zoho.in/${Math.random().toString(36).substring(2, 10)}`;
        startUrl = joinUrl;
      }

      // Open start URL (host) or join URL
      window.open(startUrl || joinUrl, "_blank");

      // Save to meetings table
      await supabase.from("meetings").insert({
        company_id: profile.company_id,
        host_id: profile.id,
        host_name: profile.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : profile.email,
        title: topic,
        meeting_date: todayStr,
        meeting_time: new Date().toTimeString().slice(0, 5),
        meeting_type: "Video Call",
        status: "Upcoming",
        meeting_link: joinUrl,
        start_url: startUrl,
        meeting_key: meetingKey,
        zoho_session_id: zohoSessionId,
      });
      toast.success("Meeting started!");
    } catch (e: any) {
      toast.error("Failed to start meeting: " + e.message);
    }
    setMeetNowLoading(false);
  };

  // ─── Render: Meeting card ─────────────────────────────────────────────────
  const MeetingCard = ({ m, isPast = false }: { m: any; isPast?: boolean }) => {
    const bc = typeColor(m.meeting_type);
    const isHost = m.host_id === profile?.id;
    return (
      <div style={{
        background: isPast ? C.card : C.surface,
        border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${bc}`,
        borderRadius: 12, padding: 16,
        display: "flex", gap: 16, alignItems: "center",
        opacity: isPast ? 0.75 : 1,
        transition: "all 0.2s",
      }}
        onMouseOver={e => { if (!isPast) e.currentTarget.style.borderColor = C.sub; }}
        onMouseOut={e => { if (!isPast) e.currentTarget.style.borderColor = C.border; }}
      >
        {/* Date block */}
        <div style={{ minWidth: 64, textAlign: "center", borderRight: `1px solid ${C.border}`, paddingRight: 16 }}>
          <div style={{ fontSize: 11, color: m.isToday ? C.orange : C.sub, textTransform: "uppercase", fontWeight: 700 }}>
            {m.isToday ? "TODAY" : m.month}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: isPast ? C.muted : C.text, lineHeight: 1.1 }}>{m.day}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{m.meeting_time?.substring(0, 5)}</div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <div style={{
              fontSize: 15, fontWeight: 600, color: isPast ? C.sub : C.text,
              textDecoration: m.status === "Cancelled" ? "line-through" : "none"
            }}>{m.title}</div>
            <Pill label={m.meeting_type} color={bc} />
            <Pill label={`${m.duration_minutes || 60}m`} color={C.muted} />
            {m.isToday && m.countdown && <Pill label={m.countdown} color={C.orange} />}
            {isPast && <Pill label={m.status === "Upcoming" ? "Missed" : m.status} color={m.status === "Completed" ? C.green : C.red} />}
          </div>
          {m.participant_name && (
            <div style={{ fontSize: 13, color: C.sub, display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Users size={13} />
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: bc + "33", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: bc }}>
                {m.participant_name.charAt(0).toUpperCase()}
              </span>
              {m.participant_name}{m.participant_company ? ` (${m.participant_company})` : ""}
            </div>
          )}
          <div style={{ fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span>Host: {m.host_name || "—"}</span>
            {m.meeting_key && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: C.gold, fontWeight: 600 }}>Meeting ID:</span>
                <span style={{ fontFamily: "monospace", color: C.text }}>{m.meeting_key}</span>
                <button onClick={e => copyLink(m.meeting_key, e)} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", padding: 0 }}>
                  <Copy size={11} />
                </button>
              </span>
            )}
            {m.meeting_link && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Link2 size={11} />
                <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.meeting_link}</span>
                <button onClick={e => copyLink(m.meeting_link, e)} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", padding: 0 }}>
                  <Copy size={11} />
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* Start button — host only, uses start_url */}
          {!isPast && isHost && m.start_url && (
            <button
              onClick={() => window.open(m.start_url, "_blank")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: C.green, color: "#fff", border: "none",
                borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
              <Video size={13} /> Start
            </button>
          )}
          {/* Join button — always visible */}
          <button
            onClick={() => {
              const url = m.meeting_link || `https://meet.zoho.in/${m.id.substring(0, 8)}`;
              window.open(url, "_blank");
            }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: C.teal, color: "#fff", border: "none",
              borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
            <ExternalLink size={13} /> {isPast ? "View" : "Join"}
          </button>
          {!isPast && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button style={{ background: "transparent", border: "none", color: C.sub, cursor: "pointer", padding: 4, borderRadius: 4 }}>
                  <MoreVertical size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 border-border bg-card">
                <DropdownMenuItem onClick={() => { setEditTarget(m); setScheduleOpen(true); }} className="cursor-pointer">
                  Edit Meeting
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatus(m.id, "Completed")} className="cursor-pointer">
                  Mark Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatus(m.id, "Cancelled")} className="cursor-pointer text-red-400 focus:text-red-300">
                  Cancel Meeting
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );
  };

  // ─── Render: Meetings home cards ──────────────────────────────────────────
  const ZohoStatusBanner = () => (
    <div style={{
      background: zohoConnected ? C.green + "11" : C.gold + "11",
      border: `1px solid ${zohoConnected ? C.green : C.gold}33`,
      borderRadius: 10, padding: "10px 16px",
      display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
    }}>
      {zohoConnected
        ? <><CheckCircle2 size={16} color={C.green} /><span style={{ fontSize: 12, color: C.text }}>Zoho connected: <strong>{zohoAccount?.account_email}</strong> — meetings will auto-create when you schedule.</span></>
        : <><AlertCircle size={16} color={C.gold} /><span style={{ fontSize: 12, color: C.text }}>Zoho not connected. <a href="/system/integrations/zoho" style={{ color: C.blue, textDecoration: "underline" }}>Connect in System → Integrations</a> to enable auto-scheduling.</span></>
      }
    </div>
  );

  const HomeCards = () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
      {/* Meeting card */}
      <MutedCard style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Video size={20} color={C.teal} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>Meeting</h3>
        </div>
        <p style={{ fontSize: 12, color: C.sub, flex: 1, margin: 0 }}>Create a meeting, invite participants, and interact through screen sharing and audio/video conferencing.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button
            onClick={handleMeetNow}
            disabled={meetNowLoading}
            style={{ flex: 1, padding: "8px 0", background: "transparent", border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {meetNowLoading ? "Starting..." : "Meet Now"}
          </button>
          <button
            onClick={() => { setEditTarget(null); setScheduleType("Video Call"); setScheduleOpen(true); }}
            style={{ flex: 1, padding: "8px 0", background: C.teal, border: "none", color: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Schedule
          </button>
        </div>
      </MutedCard>

      {/* Webinar card */}
      <MutedCard style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Radio size={20} color={C.purple} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>Webinar</h3>
        </div>
        <p style={{ fontSize: 12, color: C.sub, flex: 1, margin: 0 }}>Organize a webinar, invite your audience to register, and engage with attendees by sharing your screen.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={() => window.open("https://webinar.zoho.in", "_blank")}
            style={{ flex: 1, padding: "8px 0", background: "transparent", border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Broadcast Now
          </button>
          <button onClick={() => { setEditTarget(null); setScheduleType("Webinar"); setScheduleOpen(true); }}
            style={{ flex: 1, padding: "8px 0", background: C.teal, border: "none", color: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Schedule
          </button>
        </div>
      </MutedCard>

      {/* Personal Room card */}
      <MutedCard style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Home size={20} color={C.gold} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>Personal Room</h3>
        </div>
        <p style={{ fontSize: 12, color: C.sub, margin: 0 }}>Your permanent meeting room. Share the link anytime.</p>
        {personalRoomLoading ? (
          <div style={{ fontSize: 12, color: C.sub }}>Loading room from Zoho...</div>
        ) : personalRoom ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input readOnly value={personalRoom}
                style={{ flex: 1, padding: "6px 8px", background: C.bg, border: `1px solid ${C.border}`, color: C.sub, borderRadius: 6, fontSize: 11, outline: "none" }} />
              <button onClick={e => copyLink(personalRoom, e)}
                style={{ padding: "6px 8px", background: C.bg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, cursor: "pointer" }}>
                <Copy size={12} />
              </button>
            </div>
            {/* Start Meeting = host URL; Join = participant URL */}
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => window.open(personalRoomStartUrl || personalRoom, "_blank")}
                style={{ flex: 1, padding: "8px 0", background: C.teal, border: "none", color: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Start Meeting
              </button>
              <button onClick={e => copyLink(personalRoom, e)}
                style={{ padding: "8px 12px", background: "transparent", border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Copy Invite
              </button>
            </div>
            <button onClick={() => { setPersonalRoom(""); setPersonalRoomStartUrl(""); }}
              style={{ background: "none", border: "none", color: C.sub, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>
              Change link
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              placeholder="Paste your Zoho meeting link..."
              value={personalRoomInput}
              onChange={e => setPersonalRoomInput(e.target.value)}
              style={{ padding: "6px 8px", background: C.bg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, fontSize: 11, outline: "none" }}
            />
            <button onClick={savePersonalRoom}
              style={{ padding: "8px 0", background: C.blue, border: "none", color: "#fff", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Save Room Link
            </button>
          </div>
        )}
      </MutedCard>
    </div>
  );

  const MeetingList = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Upcoming Meetings ({upcoming.length})</div>
      {loadingMeetings ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.sub }}>Loading…</div>
      ) : upcoming.length === 0 ? (
        <MutedCard style={{ textAlign: "center", padding: "40px 20px" }}>
          <CalendarIcon size={40} color={C.muted} style={{ margin: "0 auto 12px" }} />
          <div style={{ color: C.text, fontWeight: 600, marginBottom: 6 }}>No upcoming meetings</div>
          <div style={{ color: C.sub, fontSize: 13 }}>Click "Schedule" to create one.</div>
        </MutedCard>
      ) : (
        upcoming.map(m => <MeetingCard key={m.id} m={m} />)
      )}

      {/* Past meetings accordion */}
      <div style={{ marginTop: 20 }}>
        <button onClick={() => setShowPast(!showPast)}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: C.sub, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 12 }}>
          {showPast ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          Past / Completed ({past.length})
        </button>
        {showPast && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {past.length === 0
              ? <div style={{ color: C.muted, fontSize: 13 }}>No past meetings.</div>
              : past.map(m => <MeetingCard key={m.id} m={m} isPast />)
            }
          </div>
        )}
      </div>
    </div>
  );

  // ─── Sidebar nav ──────────────────────────────────────────────────────────
  const MEET_TABS = [
    { id: "home", label: "Home", icon: Home },
    { id: "meetings", label: "Meetings", icon: Video },
    { id: "webinars", label: "Webinars", icon: Radio },
    { id: "calendar", label: "Calendar", icon: CalendarIcon },
    { id: "analytics", label: "Analytics", icon: BarChart2 },
  ];

  // ─── Calendar ─────────────────────────────────────────────────────────────
  const CalendarWidget = () => (
    <MutedCard style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
          {new Date(calYear, calMonth).toLocaleString("en-US", { month: "long", year: "numeric" })}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
            style={{ background: C.surface, border: "none", color: C.sub, padding: "2px 6px", borderRadius: 4, cursor: "pointer" }}>&lt;</button>
          <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
            style={{ background: C.surface, border: "none", color: C.sub, padding: "2px 6px", borderRadius: 4, cursor: "pointer" }}>&gt;</button>
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center", marginBottom: 6 }}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
          <div key={d} style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{d}</div>
        ))}
      </div>

      {/* Days */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const s = dateStr(new Date(calYear, calMonth, day));
          const isToday = s === todayStr;
          const dot = getDot(day);
          return (
            <div key={day} style={{
              aspectRatio: "1/1", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", borderRadius: "50%",
              fontSize: 12, position: "relative",
              background: isToday ? C.blueDim : "transparent",
              color: isToday ? C.blue : (dot ? C.text : C.sub),
              fontWeight: isToday || dot ? 600 : 400,
            }}
              onMouseOver={e => { if (!isToday) e.currentTarget.style.background = C.surface; }}
              onMouseOut={e => { if (!isToday) e.currentTarget.style.background = "transparent"; }}
            >
              {day}
              {dot && <div style={{ width: 4, height: 4, borderRadius: "50%", background: dot, position: "absolute", bottom: 2 }} />}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {upcoming.slice(0, 3).length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.sub, marginBottom: 8 }}>Upcoming</div>
          {upcoming.slice(0, 3).map(m => (
            <div key={m.id} style={{ fontSize: 12, color: C.text, display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: typeColor(m.meeting_type), flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</span>
            </div>
          ))}
        </div>
      )}
    </MutedCard>
  );

  // ─── MAIN RENDER ──────────────────────────────────────────────────────────
  const MAIN_TABS = [["calls", "📞 Call Logs"], ["meetings", "📅 Meetings"]];

  return (
    <div style={{ animation: "slideIn 0.3s ease" }}>

      {/* Page header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>Communication Management</h2>
          <p style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>All channels: calls, meetings in one place</p>
        </div>
        {mainTab === "meetings" && (
          <button onClick={() => { setEditTarget(null); setScheduleType("Video Call"); setScheduleOpen(true); }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: C.accent, color: C.bg, border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            <Plus size={15} /> Schedule Meeting
          </button>
        )}
      </div>

      {/* Main tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.surface, padding: 4, borderRadius: 10, width: "fit-content" }}>
        {MAIN_TABS.map(([id, label]) => (
          <button key={id} onClick={() => setMainTab(id)} style={{
            background: mainTab === id ? C.card : "transparent",
            color: mainTab === id ? C.text : C.sub,
            border: mainTab === id ? `1px solid ${C.border}` : "1px solid transparent",
            borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
          }}>{label}</button>
        ))}
      </div>

      {/* ── Call Logs ── */}
      {mainTab === "calls" && (
        <MutedCard style={{ padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Date", "Time", "Contact", "Company", "Duration", "Outcome", "By"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: "0.08em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CALL_LOGS.map((c, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: C.sub }}>{c.date}</td>
                  <td style={{ padding: "10px 16px", fontSize: 12, fontFamily: "monospace" }}>{c.time}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 500 }}>{c.contact}</td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: C.sub }}>{c.company}</td>
                  <td style={{ padding: "10px 16px", fontSize: 12, fontFamily: "monospace", color: C.blue }}>{c.duration}</td>
                  <td style={{ padding: "10px 16px" }}><Pill label={c.outcome} color={c.outcome === "Positive" ? C.green : c.outcome === "Replied" ? C.accent : C.gold} /></td>
                  <td style={{ padding: "10px 16px", fontSize: 12 }}>{c.by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </MutedCard>
      )}

      {/* ── Meetings ── */}
      {mainTab === "meetings" && (
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 280px", gap: 20 }}>

          {/* Left sidebar nav */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {MEET_TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setMeetTab(id)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 14px",
                background: meetTab === id ? C.card : "transparent",
                color: meetTab === id ? C.text : C.sub,
                border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: "pointer", textAlign: "left", transition: "all 0.2s",
              }}>
                <Icon size={15} color={meetTab === id ? C.teal : C.muted} />
                {label}
              </button>
            ))}
          </div>

          {/* Middle content */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
            <ZohoStatusBanner />

            {meetTab === "home" && (
              <>
                <HomeCards />
                <MeetingList />
              </>
            )}

            {meetTab === "meetings" && <MeetingList />}

            {meetTab === "webinars" && (
              <MutedCard style={{ textAlign: "center", padding: "60px 20px" }}>
                <Radio size={40} color={C.muted} style={{ margin: "0 auto 12px" }} />
                <div style={{ color: C.text, fontWeight: 600, marginBottom: 8 }}>No upcoming webinars</div>
                <button onClick={() => { setEditTarget(null); setScheduleType("Webinar"); setScheduleOpen(true); }}
                  style={{ background: C.teal, border: "none", color: "#fff", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 8 }}>
                  Schedule Webinar
                </button>
              </MutedCard>
            )}

            {meetTab === "calendar" && (
              <MutedCard>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 16 }}>Full Calendar View</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[...upcoming, ...past].slice(0, 10).map(m => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.surface, borderRadius: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: typeColor(m.meeting_type), flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{m.title}</span>
                      <span style={{ fontSize: 11, color: C.sub }}>{m.meeting_date} {m.meeting_time?.substring(0, 5)}</span>
                      <Pill label={m.status} color={m.status === "Upcoming" ? C.blue : m.status === "Completed" ? C.green : C.red} />
                    </div>
                  ))}
                </div>
              </MutedCard>
            )}

            {meetTab === "analytics" && (
              <MutedCard style={{ textAlign: "center", padding: "60px 20px" }}>
                <BarChart2 size={40} color={C.muted} style={{ margin: "0 auto 12px" }} />
                <div style={{ color: C.text, fontWeight: 600, marginBottom: 8 }}>Meeting Analytics</div>
                <div style={{ color: C.sub, fontSize: 13 }}>
                  {meetings.length} total · {upcoming.length} upcoming · {past.filter(m => m.status === "Completed").length} completed · {past.filter(m => m.status === "Cancelled").length} cancelled
                </div>
              </MutedCard>
            )}
          </div>

          {/* Right calendar */}
          <div>
            <CalendarWidget />
          </div>

        </div>
      )}

      {/* Schedule / Edit modal */}
      <ScheduleMeetingModal
        open={scheduleOpen}
        onOpenChange={v => { setScheduleOpen(v); if (!v) { setEditTarget(null); setScheduleType(undefined); } }}
        meetingToEdit={editTarget}
        defaultMeetingType={scheduleType}
        zohoAccountId={zohoAccount?.id || null}
        onSaved={fetchMeetings}
      />
    </div>
  );
}

export default Communication;