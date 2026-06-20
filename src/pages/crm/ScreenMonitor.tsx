import { useState, useEffect, useRef } from "react";
import SectionHeader from "../../components/SectionHeader";
import Card from "@/components/Card";
import { Monitor, CheckCircle, Clock, ShieldAlert, Eye, RefreshCw, User, MousePointer, Keyboard, Activity, X, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface BdeStatus {
  id: string;
  name: string;
  role: string;
  activeModule: string;
  status: "Online" | "Idle" | "Offline";
  lastActive: string;
  lastMouse: string;
  lastKeys: string;
}

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  module: string;
  event_type: "page_visit" | "mouse_move" | "keypress" | "idle";
  session_id: string;
  created_at: string;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

// ── WebRTC Live Viewer Modal ──────────────────────────────────────────────────
function LiveViewerModal({ targetUser, onClose }: { targetUser: BdeStatus; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "loading" | "failed">("connecting");
  const adminId = useRef(`admin_${Date.now()}`);

  useEffect(() => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    pc.ontrack = (e) => {
      if (videoRef.current && e.streams[0]) {
        videoRef.current.srcObject = e.streams[0];
        setStatus("loading");
        // Force play
        videoRef.current.play().catch(() => {});
      }
    };

    pc.onicecandidate = async (e) => {
      if (e.candidate) {
        await (supabase.from("screen_signals") as any).insert({
          from_user_id: adminId.current,
          to_user_id: targetUser.id,
          signal_type: "candidate",
          payload: JSON.stringify(e.candidate),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        setStatus("failed");
      }
    };

    const requestWatch = async () => {
      await (supabase.from("screen_signals") as any).insert({
        from_user_id: adminId.current,
        to_user_id: targetUser.id,
        signal_type: "watch_request",
        payload: JSON.stringify({ adminId: adminId.current }),
      });
    };

    requestWatch();

    const channel = supabase
      .channel(`viewer_${adminId.current}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "screen_signals",
        filter: `to_user_id=eq.${adminId.current}`,
      }, async (payload: any) => {
        const sig = payload.new;
        if (sig.to_user_id !== adminId.current) return;

        try {
          if (sig.signal_type === "offer") {
            // Only set remote description if in valid state
            if (pc.signalingState === "stable" || pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(sig.payload)));
            }
            // Only create and set answer if we have a remote offer
            if (pc.signalingState === "have-remote-offer") {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await (supabase.from("screen_signals") as any).insert({
                from_user_id: adminId.current,
                to_user_id: targetUser.id,
                signal_type: "answer",
                payload: JSON.stringify(answer),
              });
            }
          } else if (sig.signal_type === "candidate") {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(sig.payload)));
            } catch { }
          }
        } catch (err) {
          console.error("[LiveViewerModal] WebRTC signaling error:", err);
        }
      })
      .subscribe();

    const timeout = setTimeout(() => {
      setStatus((prev) => prev === "connecting" ? "failed" : prev);
    }, 30000);

    return () => {
      pc.close();
      supabase.removeChannel(channel);
      clearTimeout(timeout);
    };
  }, [targetUser.id]);

  // Video event handlers
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
      setStatus("live");
    }
  };

  const handleCanPlay = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
      setStatus("live");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl mx-4 bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${status === "live" ? "bg-emerald-500 animate-pulse" : status === "connecting" || status === "loading" ? "bg-amber-500 animate-pulse" : "bg-red-500"}`} />
            <span className="text-sm font-semibold text-foreground">{targetUser.name}</span>
            <span className="text-[10px] text-muted-foreground">{targetUser.role}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
              status === "live" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : status === "connecting" || status === "loading" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>
              {status === "live" ? "● LIVE" : status === "loading" ? "Buffering..." : status === "connecting" ? "Connecting..." : "Failed"}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-800 transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Video */}
        <div className="relative bg-black aspect-video flex items-center justify-center">
          {status === "connecting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Wifi className="h-10 w-10 text-primary animate-pulse" />
              <p className="text-sm text-muted-foreground">Connecting to {targetUser.name}'s screen...</p>
              <p className="text-xs text-muted-foreground opacity-60">The user must have screen sharing active</p>
            </div>
          )}
          {status === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Loading {targetUser.name}'s screen...</p>
            </div>
          )}
          {status === "failed" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <ShieldAlert className="h-10 w-10 text-red-400" />
              <p className="text-sm text-muted-foreground">Could not connect to {targetUser.name}'s screen</p>
              <p className="text-xs text-muted-foreground opacity-60">User may have stopped sharing or gone offline</p>
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={handleLoadedMetadata}
            onCanPlay={handleCanPlay}
            className={`w-full h-full object-contain transition-opacity duration-300 ${status === "live" ? "opacity-100" : "opacity-0"}`}
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-border bg-neutral-900/40 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-mono">
            Module: {targetUser.activeModule}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Last active: {targetUser.lastActive ? new Date(targetUser.lastActive).toLocaleTimeString() : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Screen Broadcaster (runs in background for every logged-in user) ──────────
function useScreenBroadcaster(userId: string | undefined, stream: MediaStream | null) {
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  useEffect(() => {
    if (!userId || !stream) return;

    const channelName = `broadcaster_${userId}_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "screen_signals",
        filter: `to_user_id=eq.${userId}`,
      }, async (payload: any) => {
        const sig = payload.new;
        if (sig.to_user_id !== userId) return;

        try {
          if (sig.signal_type === "watch_request") {
            const adminId = sig.from_user_id;

            const pc = new RTCPeerConnection(RTC_CONFIG);
            pcsRef.current.set(adminId, pc);

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = async (e) => {
              if (e.candidate) {
                await (supabase.from("screen_signals") as any).insert({
                  from_user_id: userId,
                  to_user_id: adminId,
                  signal_type: "candidate",
                  payload: JSON.stringify(e.candidate),
                });
              }
            };

            // Create and set offer only in stable state
            if (pc.signalingState === "stable") {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);

              await (supabase.from("screen_signals") as any).insert({
                from_user_id: userId,
                to_user_id: adminId,
                signal_type: "offer",
                payload: JSON.stringify(offer),
              });
            }

          } else if (sig.signal_type === "answer") {
            const pc = pcsRef.current.get(sig.from_user_id);
            if (pc && pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(sig.payload)));
            }

          } else if (sig.signal_type === "candidate") {
            const pc = pcsRef.current.get(sig.from_user_id);
            if (pc) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(sig.payload)));
              } catch { }
            }
          }
        } catch (err) {
          console.error("[useScreenBroadcaster] WebRTC signaling error:", err);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      pcsRef.current.forEach(pc => pc.close());
      pcsRef.current.clear();
    };
  }, [userId, stream]);
}

// ── Main ScreenMonitor Page ───────────────────────────────────────────────────
export default function ScreenMonitor() {
  const [bdes, setBdes] = useState<BdeStatus[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState({ activeCount: 0, idleCount: 0, totalEventsToday: 0 });
  const [loading, setLoading] = useState(true);
  const [watchingUser, setWatchingUser] = useState<BdeStatus | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [myUserId, setMyUserId] = useState<string | undefined>();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setMyUserId(session.user.id);
    });

    const checkStream = () => {
      const s = (window as any).__screenStream;
      if (s) setMyStream(s);
    };
    checkStream();
    const interval = setInterval(checkStream, 2000);
    return () => clearInterval(interval);
  }, []);

  useScreenBroadcaster(myUserId, myStream);
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: profilesData } = await supabase.from("profiles").select("id, full_name, requested_role");
      const allProfiles = profilesData || [];

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data: logsData } = await (supabase.from("activity_logs") as any)
        .select("*")
        .order("created_at", { ascending: false });

      const allLogs = (logsData || []) as ActivityLog[];
      setActivityLogs(allLogs.slice(0, 15));

      const todayLogs = allLogs.filter((l) => new Date(l.created_at) >= startOfToday);

      const mappedBdes: BdeStatus[] = allProfiles.map((p: any) => {
        let userLogs = allLogs.filter((l) => l.user_id === p.id);
        if (userLogs.length === 0) {
          userLogs = allLogs.filter((l) => l.user_name?.toLowerCase() === (p.full_name || "").toLowerCase());
        }

        const mostRecentLog = userLogs[0];
        const lastMouseLog = userLogs.find((l) => l.event_type === "mouse_move");
        const lastKeysLog = userLogs.find((l) => l.event_type === "keypress");

        let status: "Online" | "Idle" | "Offline" = "Offline";
        if (mostRecentLog) {
          const diffMs = Date.now() - new Date(mostRecentLog.created_at).getTime();
          if (mostRecentLog.event_type === "idle") status = "Idle";
          else if (diffMs < 15 * 60 * 1000) status = "Online";
          else status = "Offline";
        }

        return {
          id: p.id,
          name: p.full_name || "Unknown User",
          role: p.requested_role || "Staff",
          activeModule: mostRecentLog ? mostRecentLog.module : "No Activity",
          status,
          lastActive: mostRecentLog ? mostRecentLog.created_at : "",
          lastMouse: lastMouseLog ? lastMouseLog.created_at : "",
          lastKeys: lastKeysLog ? lastKeysLog.created_at : "",
        };
      });

      setBdes(mappedBdes);
      setStats({
        activeCount: mappedBdes.filter((b) => b.status === "Online").length,
        idleCount: mappedBdes.filter((b) => b.status === "Idle").length,
        totalEventsToday: todayLogs.length,
      });
    } catch (error) {
      console.error("Error fetching screen monitor data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();

    const logsSubscription = supabase
      .channel("activity-screen-monitor")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, (payload) => {
        const newLog = payload.new as ActivityLog;
        setActivityLogs((prev) => [newLog, ...prev].slice(0, 15));
        setStats((prev) => ({ ...prev, totalEventsToday: prev.totalEventsToday + 1 }));
        setBdes((prevBdes) => prevBdes.map((bde) => {
          const matchById = bde.id === newLog.user_id;
          const matchByName = bde.name?.toLowerCase() === newLog.user_name?.toLowerCase();
          if (matchById || matchByName) {
            return {
              ...bde,
              activeModule: newLog.module,
              lastActive: newLog.created_at,
              lastMouse: newLog.event_type === "mouse_move" ? newLog.created_at : bde.lastMouse,
              lastKeys: newLog.event_type === "keypress" ? newLog.created_at : bde.lastKeys,
              status: newLog.event_type === "idle" ? "Idle" : "Online",
            };
          }
          return bde;
        }));
      })
      .subscribe();

    const statusInterval = setInterval(() => {
      setBdes((prevBdes) => prevBdes.map((bde) => {
        if (!bde.lastActive) return bde;
        const diffMs = Date.now() - new Date(bde.lastActive).getTime();
        if (bde.status === "Online" && diffMs >= 15 * 60 * 1000) return { ...bde, status: "Offline" };
        return bde;
      }));
    }, 10000);

    return () => {
      supabase.removeChannel(logsSubscription);
      clearInterval(statusInterval);
    };
  }, []);

  useEffect(() => {
    setStats((prev) => ({
      ...prev,
      activeCount: bdes.filter((b) => b.status === "Online").length,
      idleCount: bdes.filter((b) => b.status === "Idle").length,
    }));
  }, [bdes]);

  const formatTime = (isoString: string) => {
    if (!isoString) return "—";
    return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const getIdleDuration = (lastActiveIso: string) => {
    if (!lastActiveIso) return "—";
    const diffMins = Math.floor((Date.now() - new Date(lastActiveIso).getTime()) / 60000);
    return diffMins > 0 ? `${diffMins}m` : "Less than 1m";
  };

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      {watchingUser && <LiveViewerModal targetUser={watchingUser} onClose={() => setWatchingUser(null)} />}

      <SectionHeader
        title="Live BDE Screen Monitoring & Auditing"
        sub="Audit live employee screens, monitor idle timers, and verify data privacy compliance for remote sales terminals"
        actions={
          <Button size="sm" className="btn-gold shadow-md" onClick={fetchInitialData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh Feed
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4 p-5 bg-card/60 backdrop-blur-md border-border">
          <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20"><Monitor className="h-5 w-5" /></div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Active Representatives</div>
            <div className="text-2xl font-bold font-mono mt-0.5">{stats.activeCount} Online</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5 bg-card/60 backdrop-blur-md border-border">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20"><Clock className="h-5 w-5 animate-pulse" /></div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Idle Terminals</div>
            <div className="text-2xl font-bold font-mono mt-0.5">{stats.idleCount} Idle</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5 bg-card/60 backdrop-blur-md border-border">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20"><CheckCircle className="h-5 w-5" /></div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Audited Events Today</div>
            <div className="text-2xl font-bold font-mono mt-0.5">{stats.totalEventsToday} Logs</div>
          </div>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">All Users — Live Monitoring</h3>
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-card/40 border border-border rounded-xl">
            <RefreshCw className="h-8 w-8 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground font-medium">Re-syncing live terminal screens...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {bdes.map((b) => (
              <Card key={b.id} className="p-5 flex flex-col justify-between gap-4 bg-card/60 backdrop-blur-md hover:border-primary/30 transition-all duration-300">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground leading-normal">{b.name}</h4>
                      <p className="text-[10px] text-muted-foreground">{b.role}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[9px] ${b.status === "Online" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : b.status === "Idle" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-neutral-800 text-muted-foreground border border-neutral-700"}`}>
                      {b.status}
                    </span>
                  </div>

                  <div className="h-28 rounded-lg bg-neutral-900 border border-border flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#00d4aa_1px,transparent_1px)] [background-size:8px_8px]" />
                    {b.status !== "Offline" ? (
                      <>
                        <Eye className="h-6 w-6 text-primary opacity-40 animate-pulse mb-1.5" />
                        <span className="text-[9px] font-mono text-muted-foreground text-center px-2 truncate max-w-[170px]">{b.activeModule}</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-6 w-6 text-muted-foreground opacity-20 mb-1.5" />
                        <span className="text-[9px] font-mono text-muted-foreground">Terminal Offline</span>
                      </>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-1 text-[10px] text-muted-foreground font-mono">
                    <div className="flex justify-between border-b border-border/20 pb-1">
                      <span className="flex items-center gap-1"><MousePointer className="h-3 w-3" /> Mouse</span>
                      <span className="text-foreground">{formatTime(b.lastMouse)}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/20 pb-1">
                      <span className="flex items-center gap-1"><Keyboard className="h-3 w-3" /> Keypress</span>
                      <span className="text-foreground">{formatTime(b.lastKeys)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Idle Duration</span>
                      <span className="text-foreground">{b.status === "Idle" ? getIdleDuration(b.lastActive) : "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/20 pt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    {b.status !== "Offline" ? `Active ${formatTime(b.lastActive)}` : "Active Offline"}
                  </span>
                  {b.status !== "Offline" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[10px] font-semibold h-7 py-1 px-2 border border-border hover:bg-primary/10"
                      onClick={() => setWatchingUser(b)}
                    >
                      Watch Live
                    </Button>
                  )}
                </div>
              </Card>
            ))}
            {bdes.length === 0 && (
              <div className="col-span-full p-8 text-center text-muted-foreground text-xs">No user profiles found in database.</div>
            )}
          </div>
        )}
      </div>

      <Card className="space-y-4 border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Live Audit Log Feed
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time socket transactions streamed globally from all terminals</p>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-[9px] uppercase tracking-wider animate-pulse">
            Realtime Stream
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-900/60 text-muted-foreground font-semibold border-b border-border">
                <th className="p-3">Event ID</th>
                <th className="p-3">User Name</th>
                <th className="p-3">Active ERP Module</th>
                <th className="p-3">Interaction Type</th>
                <th className="p-3">Session ID</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {activityLogs.map((log) => (
                <tr key={log.id} className="border-b border-border/40 hover:bg-neutral-900/30 transition-colors">
                  <td className="p-3 font-mono text-muted-foreground">{log.id.slice(0, 8)}...</td>
                  <td className="p-3 font-semibold text-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />{log.user_name}
                  </td>
                  <td className="p-3 text-foreground font-mono">{log.module}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] ${log.event_type === "page_visit" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : log.event_type === "mouse_move" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : log.event_type === "keypress" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse"}`}>
                      {log.event_type}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-muted-foreground">{log.session_id}</td>
                  <td className="p-3 text-muted-foreground font-mono">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {activityLogs.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Waiting for real-time audit logs to stream...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}