
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { X, Check, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";


type FollowUp = {
  id: string;
  company_name: string;
  contact_name?: string | null;
  follow_up_date: string;
  assigned_to: string;
  reminder_time: string;
};

/* ─── CSS injected once ─── */
const STYLE_ID = "followup-ping-style";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes fu-ping {
      0%   { transform: scale(1);   opacity: 0.8; }
      100% { transform: scale(1.8); opacity: 0;   }
    }
    .fu-ping-ring {
      animation: fu-ping 1.6s ease-out infinite;
    }
  `;
  document.head.appendChild(style);
}

/* ─── Draggable hook ─── */
function useDraggable(initialPos: { x: number; y: number }) {
  const [pos, setPos] = useState(initialPos);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };

    const onMove = (me: MouseEvent) => {
      if (!dragging.current) return;
      setPos({ x: me.clientX - offset.current.x, y: me.clientY - offset.current.y });
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pos]);

  return { pos, setPos, onMouseDown };
}


export function FollowUpReminders() {
  const { profile } = useAuth();
  const [reminders, setReminders] = useState<FollowUp[]>([]);
  const [hidden, setHidden] = useState(true);
  const [sessionDismissedIds, setSessionDismissedIds] = useState<Set<string>>(new Set());
  const [lastCount, setLastCount] = useState(0);
  const soundPlayedRef = useRef(false); // guard: only play once per new batch

  /* Draggable bell */
  const bell = useDraggable({
    x: typeof window !== "undefined" ? window.innerWidth - 96 : 80,
    y: typeof window !== "undefined" ? window.innerHeight - 96 : 80,
  });

  /* Draggable popup */
  const popup = useDraggable({
    x: typeof window !== "undefined" ? window.innerWidth - 408 : 0,
    y: typeof window !== "undefined" ? window.innerHeight - 520 : 0,
  });

  /* ── Sound (3-tone chime) ── */
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
      console.warn("Audio Context blocked or failed:", err);
    }
  };

  /* ── Fetch ── */
  const fetchReminders = async () => {
    if (!profile) return;
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const currentHHMM = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    try {
      const { data, error } = await supabase
        .from("follow_ups")
        .select("id, company_name, contact_name, follow_up_date, assigned_to, reminder_time")
        .eq("follow_up_date", today)
        .eq("is_notified", false);

      if (error) throw error;
      if (data) {
        const pending = (data as FollowUp[]).filter((r) => {
          if (sessionDismissedIds.has(r.id)) return false;
          if (!r.reminder_time) return true;
          const [remH, remM] = r.reminder_time.split(":");
          return currentHHMM >= `${remH}:${remM}`;
        });
        // Play once when a new reminder arrives (guard with ref)
        if (pending.length > lastCount && !soundPlayedRef.current) {
          soundPlayedRef.current = true;
          playNotificationSound();
          // Reset guard after 2 s so next fetch can play again if more arrive
          setTimeout(() => { soundPlayedRef.current = false; }, 2000);
        }
        setLastCount(pending.length);
        setReminders(pending);
      }
    } catch (error: any) {
      console.error("Error fetching reminders:", error.message);
    }
  };

  const markAsDone = async (id: string, company_name: string) => {
    try {
      const { error } = await supabase
        .from("follow_ups")
        .update({ is_notified: true })
        .eq("id", id);
      if (error) throw error;
      setReminders((prev) => prev.filter((r) => r.id !== id));
      setLastCount((prev) => Math.max(0, prev - 1));
      toast.success(`Follow-up for ${company_name} marked as done`);
    } catch (error: any) {
      toast.error("Failed to update reminder: " + error.message);
    }
  };

  const handleDismiss = (id: string) => {
    setSessionDismissedIds((prev) => new Set([...prev, id]));
    setReminders((prev) => prev.filter((r) => r.id !== id));
    setLastCount((prev) => Math.max(0, prev - 1));
  };

  useEffect(() => {
    if (profile) {
      fetchReminders();
      const interval = setInterval(fetchReminders, 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [profile?.id, sessionDismissedIds, lastCount]);

  if (!profile) return null;
  if (reminders.length === 0) return null;

  /* ── Minimised bell ── */
  if (hidden) {
    return (
      <div
        style={{ position: "fixed", left: bell.pos.x, top: bell.pos.y, zIndex: 10000 }}
      >
        {/* Ping ring */}
        <span
          className="fu-ping-ring"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "1rem",
            border: "2px solid rgba(245,158,11,0.7)",
            pointerEvents: "none",
          }}
        />

        <button
          type="button"
          onMouseDown={bell.onMouseDown}
          onClick={(e) => {
            // Only open if not dragged
            e.preventDefault();
            e.stopPropagation();
            setHidden(false);
            playNotificationSound();
          }}
          style={{
            position: "relative",
            height: 48,
            width: 48,
            background: "linear-gradient(135deg, #b45309, #fbbf24)",
            borderRadius: "0.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px rgba(217,119,6,0.4)",
            cursor: "grab",
            border: "none",
            transition: "box-shadow 0.3s",
          }}
          title="Follow-up reminders"
        >
          {/* Static bell – NO animate-pulse / animate-bounce */}
          <Bell style={{ height: 20, width: 20, color: "#000", pointerEvents: "none" }} />

          {/* Badge */}
          <div
            style={{
              position: "absolute",
              top: -7,
              right: -7,
              background: "#111",
              color: "#f59e0b",
              height: 20,
              minWidth: 20,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 900,
              padding: "0 4px",
              border: "1.5px solid rgba(245,158,11,0.5)",
              boxShadow: "0 0 0 2px rgba(0,0,0,0.3)",
              pointerEvents: "none",
            }}
          >
            {reminders.length}
          </div>
        </button>
      </div>
    );
  }

  /* ── Full popup (draggable by header) ── */
  return (
    <div
      style={{
        position: "fixed",
        left: popup.pos.x,
        top: popup.pos.y,
        zIndex: 9999,
        width: 384,
        maxWidth: "calc(100vw - 24px)",
      }}
      className="animate-in slide-in-from-bottom-5 duration-500"
    >
      {/* Drag handle / header */}
      <div
        onMouseDown={popup.onMouseDown}
        style={{
          cursor: "grab",
          background: "rgba(10,10,10,0.95)",
          backdropFilter: "blur(16px)",
          borderTopLeftRadius: "1.5rem",
          borderTopRightRadius: "1.5rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Bell style={{ height: 14, width: 14, color: "#f59e0b" }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: "#f59e0b", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Follow-up Reminders
          </span>
          <span style={{
            background: "#f59e0b",
            color: "#000",
            borderRadius: 6,
            padding: "1px 7px",
            fontSize: 10,
            fontWeight: 900,
          }}>
            {reminders.length}
          </span>
        </div>

        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setHidden(true)}
          style={{
            height: 28,
            width: 28,
            borderRadius: 8,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#6b7280",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.2s, color 0.2s",
          }}
          title="Minimize"
        >
          <X style={{ height: 14, width: 14 }} />
        </button>
      </div>

      {/* Cards — scrollable */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxHeight: "60vh",
          overflowY: "auto",
          padding: "10px 10px 12px",
          background: "rgba(10,10,10,0.92)",
          backdropFilter: "blur(16px)",
          borderBottomLeftRadius: "1.5rem",
          borderBottomRightRadius: "1.5rem",
          border: "1px solid rgba(255,255,255,0.05)",
          borderTop: "none",
        }}
      >
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "1rem",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {/* Row 1: label + time */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 9, fontWeight: 900, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.18em" }}>
                Critical Reminder
              </span>
              <span style={{ fontSize: 9, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>
                {reminder.reminder_time
                  ? new Date(`2000-01-01T${reminder.reminder_time}`).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
                  : "ASAP"}
              </span>
            </div>

            {/* Row 2: company name */}
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.35, margin: 0 }}>
              Call{" "}
              <span style={{ color: "#fbbf24", textDecoration: "underline", textDecorationColor: "rgba(251,191,36,0.3)", textUnderlineOffset: 3 }}>
                {reminder.company_name}
              </span>{" "}
              at{" "}
              {reminder.reminder_time
                ? new Date(`2000-01-01T${reminder.reminder_time}`).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
                : "09:00 AM"}
            </p>

            {/* Row 3: contact name (optional) */}
            {reminder.contact_name && (
              <div style={{
                background: "rgba(255,255,255,0.04)",
                borderRadius: 8,
                padding: "4px 10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "1px solid rgba(255,255,255,0.05)",
              }}>
                <span style={{ fontSize: 9, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>Contact</span>
                <span style={{ fontSize: 11, color: "#fef3c7", fontWeight: 800 }}>{reminder.contact_name}</span>
              </div>
            )}

            {/* Row 4: Got It + Dismiss — always visible */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{
                  flex: 1,
                  height: 34,
                  background: "#f59e0b",
                  color: "#000",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                }}
                onClick={() => markAsDone(reminder.id, reminder.company_name)}
              >
                <Check style={{ height: 12, width: 12, strokeWidth: 3 }} /> Got It
              </button>
              <button
                style={{
                  flex: 1,
                  height: 34,
                  background: "rgba(255,255,255,0.06)",
                  color: "#9ca3af",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                }}
                onClick={() => handleDismiss(reminder.id)}
              >
                <X style={{ height: 12, width: 12 }} /> Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
