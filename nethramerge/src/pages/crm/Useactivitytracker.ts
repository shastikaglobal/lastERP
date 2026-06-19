import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useActivityTracker(moduleName: string) {
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const sessionId = useRef<string>(crypto.randomUUID());
  const hasLoggedVisit = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    hasLoggedVisit.current = false;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const userId = session.user.id;
      const userName =
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        session.user.email ||
        "Unknown";

      if (!hasLoggedVisit.current) {
        hasLoggedVisit.current = true;
        const { error } = await supabase.from("activity_logs").insert({
          user_id: userId,
          user_name: userName,
          module: moduleName,
          event_type: "page_visit",
          session_id: sessionId.current,
        });
        if (error) console.error("activity_logs insert error:", error.message);
      }

      const resetIdle = () => {
        clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(async () => {
          await supabase.from("activity_logs").insert({
            user_id: userId,
            user_name: userName,
            module: moduleName,
            event_type: "idle",
            session_id: sessionId.current,
          });
        }, 5 * 60 * 1000);
      };

      function throttle(fn: () => void, ms: number) {
        let last = 0;
        return () => {
          const now = Date.now();
          if (now - last > ms) { last = now; fn(); }
        };
      }

      const onMouseMove = throttle(() => {
        resetIdle();
        supabase.from("activity_logs").insert({
          user_id: userId,
          user_name: userName,
          module: moduleName,
          event_type: "mouse_move",
          session_id: sessionId.current,
        });
      }, 30000);

      const onKeyDown = throttle(() => {
        resetIdle();
        supabase.from("activity_logs").insert({
          user_id: userId,
          user_name: userName,
          module: moduleName,
          event_type: "keypress",
          session_id: sessionId.current,
        });
      }, 30000);

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("keydown", onKeyDown);
      resetIdle();

      cleanupRef.current = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("keydown", onKeyDown);
        clearTimeout(idleTimer.current);
      };
    };

    init();

    return () => {
      cleanupRef.current?.();
    };
  }, [moduleName]);
}