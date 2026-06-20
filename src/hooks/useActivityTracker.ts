import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const SESSION_ID =
  Math.random().toString(36).substring(2, 15) +
  Math.random().toString(36).substring(2, 15);

export function useActivityTracker(moduleName: string) {
  const { user, profile } = useAuth();

  const lastMouseLogRef = useRef<number>(0);
  const lastKeyLogRef = useRef<number>(0);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const throttleMs = 30000;
  const idleLimitMs = 300000;

  useEffect(() => {
    if (!user) return;

    const userName = profile?.full_name || user.email || "Unknown";
    const userId = user.id;

    const updateActiveSession = async (isIdle: boolean = false) => {
      try {
        const { data: existing, error: findError } = await supabase
          .from("active_sessions" as any)
          .select("id")
          .eq("user_id", userId)
          .neq("is_deleted", true)
          .limit(1)
          .maybeSingle();

        if (findError) {
          console.error("[ActivityTracker] Error finding active session:", findError.message);
          return;
        }

        const role = profile?.requested_role || "BDE";
        const device = navigator.userAgent;
        const lastActiveTime = isIdle 
          ? new Date(Date.now() - 5 * 60 * 1000).toISOString()
          : new Date().toISOString();

        if (existing) {
          await supabase
            .from("active_sessions" as any)
            .update({
              profile_name: userName,
              profile_role: role,
              last_active: lastActiveTime,
              device_info: device
            })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("active_sessions" as any)
            .insert({
              user_id: userId,
              profile_name: userName,
              profile_role: role,
              login_at: new Date().toISOString(),
              last_active: lastActiveTime,
              device_info: device
            });
        }
      } catch (err) {
        console.error("[ActivityTracker] Exception updating active session:", err);
      }
    };

    // Log page_visit on mount
    const logPageVisit = async () => {
      await (supabase.from("activity_logs") as any).insert({
        user_id: userId,
        user_name: userName,
        module: moduleName,
        event_type: "page_visit",
        session_id: SESSION_ID,
      });
      await updateActiveSession(false);
    };

    logPageVisit();

    // Throttled logging function
    const logEvent = async (eventType: string) => {
      const { error } = await (supabase.from("activity_logs") as any).insert({
        user_id: userId,
        user_name: userName,
        module: moduleName,
        event_type: eventType,
        session_id: SESSION_ID,
      });
      if (error) {
        console.error(`[ActivityTracker] ${eventType} error:`, error.message);
      } else {
        await updateActiveSession(eventType === "idle");
      }
    };

    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => logEvent("idle"), idleLimitMs);
    };

    resetIdleTimer();

    const handleMouseMove = () => {
      resetIdleTimer();
      const now = Date.now();
      if (now - lastMouseLogRef.current > throttleMs) {
        logEvent("mouse_move");
        lastMouseLogRef.current = now;
      }
    };

    const handleKeyPress = () => {
      resetIdleTimer();
      const now = Date.now();
      if (now - lastKeyLogRef.current > throttleMs) {
        logEvent("keypress");
        lastKeyLogRef.current = now;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keypress", handleKeyPress);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keypress", handleKeyPress);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [user, profile, moduleName]);
}