import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useScreenBroadcaster } from "@/hooks/useScreenBroadcaster";
import { isMobileOrTablet } from "@/utils/device";

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { session, profile, loading, refresh, roleSlugs } = useAuth();
  const location = useLocation();
  const [screenStatus, setScreenStatus] = useState<"idle" | "requesting" | "sharing" | "denied">("idle");
  const streamRef = useRef<MediaStream | null>(null);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const hasStarted = useRef(false);

  // Broadcast this user's screen if requested by an admin
  useScreenBroadcaster(profile?.id, activeStream);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (session && !profile && !loading) {
      interval = setInterval(() => refresh(), 1500);
    }
    return () => clearInterval(interval);
  }, [session, profile, loading, refresh]);

  useEffect(() => {
    if (!profile || hasStarted.current) return;
    hasStarted.current = true;

    // Mobile/tablet browsers do not support getDisplayMedia for screen sharing.
    // Also, getDisplayMedia is only available in secure contexts (HTTPS or localhost).
    // Bypass screen sharing requirement if not supported or bypassed explicitly.
    if (
      isMobileOrTablet() || 
      localStorage.getItem("bypassScreenShare") === "true" || 
      window.location.search.includes("bypass=true") ||
      !navigator.mediaDevices || 
      !navigator.mediaDevices.getDisplayMedia
    ) {
      setScreenStatus("sharing");
      return;
    }

    const startShare = async () => {
      setScreenStatus("requesting");
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: "browser", frameRate: 5 },
          audio: false,
        });

        streamRef.current = stream;
        setActiveStream(stream);
        (window as any).__screenStream = stream; // ← globally store
        setScreenStatus("sharing");

        await (supabase.from("activity_logs") as any).insert({
          user_id: profile.id,
          user_name: profile.full_name || profile.email,
          module: "screen_share",
          event_type: "screen_share_started",
          session_id: `ss_${Date.now()}`,
        });

        stream.getVideoTracks()[0].onended = async () => {
          setScreenStatus("denied");
          streamRef.current = null;
          setActiveStream(null);
          (window as any).__screenStream = null;
          await (supabase.from("activity_logs") as any).insert({
            user_id: profile.id,
            user_name: profile.full_name || profile.email,
            module: "screen_share",
            event_type: "screen_share_stopped",
            session_id: `ss_${Date.now()}`,
          });
        };

      } catch {
        setScreenStatus("denied");
      }
    };

    startShare();

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-sm text-muted-foreground animate-pulse">Setting up your account...</p>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}
            className="mt-6 text-xs text-primary hover:underline transition-all cursor-pointer font-medium"
          >
            Sign Out / Switch Account
          </button>
        </div>
      </div>
    );
  }

  if (profile.status !== "approved") {
    if (profile.requested_role) return <Navigate to="/waiting-approval" replace />;
    else return <Navigate to="/complete-profile" replace />;
  }

  if (screenStatus === "requesting") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center p-8 rounded-2xl border border-border bg-card">
          <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-foreground">Screen Sharing Required</h2>
          <p className="text-sm text-muted-foreground">
            Shastika Global Impex ERP requires screen sharing for compliance and audit purposes.
            Please allow screen sharing in the browser popup to continue.
          </p>
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mt-2" />
          <p className="text-xs text-muted-foreground animate-pulse">Waiting for permission...</p>
        </div>
      </div>
    );
  }

  if (screenStatus === "denied") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center p-8 rounded-2xl border border-red-500/20 bg-card">
          <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-foreground">Screen Sharing Required</h2>
          <p className="text-sm text-muted-foreground">
            Screen sharing is mandatory to use the ERP system. For privacy, please select <strong>Chrome Tab</strong> or <strong>This Tab</strong> when prompted.
          </p>
          <button
            onClick={async () => {
              hasStarted.current = false;
              setScreenStatus("requesting");
              try {
                const stream = await navigator.mediaDevices.getDisplayMedia({
                  video: { displaySurface: "browser", frameRate: 5 },
                  audio: false,
                });

                streamRef.current = stream;
                setActiveStream(stream);
                (window as any).__screenStream = stream; // ← globally store
                setScreenStatus("sharing");
                await (supabase.from("activity_logs") as any).insert({
                  user_id: profile.id,
                  user_name: profile.full_name || profile.email,
                  module: "screen_share",
                  event_type: "screen_share_started",
                  session_id: `ss_${Date.now()}`,
                });
                stream.getVideoTracks()[0].onended = () => {
                  setScreenStatus("denied");
                  streamRef.current = null;
                  setActiveStream(null);
                  (window as any).__screenStream = null;
                };
              } catch {
                setScreenStatus("denied");
              }
            }}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
          >
            Try Again
          </button>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}
            className="text-xs text-muted-foreground hover:text-primary transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const slugs = Array.from(roleSlugs).map(s => s.toLowerCase());
  const isAdmin = slugs.includes("admin");
  const isBde = slugs.includes("bd") ||
    slugs.includes("bde") ||
    (profile?.requested_role && ["bd", "bde"].includes(profile.requested_role.toLowerCase()));

  if (isBde && !isAdmin) {
    const allowedPrefixes = ["/dashboards", "/dashboard", "/crm", "/customers", "/quotations", "/documents", "/system", "/orders/create"];
    const isAllowed = allowedPrefixes.some(prefix =>
      location.pathname === prefix || location.pathname.startsWith(prefix + "/")
    );
    if (!isAllowed) return <Navigate to="/dashboard" replace />;
  }

  return children;
}