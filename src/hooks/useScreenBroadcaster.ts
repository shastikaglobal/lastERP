import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useScreenBroadcaster(userId: string | undefined, stream: MediaStream | null) {
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

            const pc = new RTCPeerConnection({
              iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
            });
            pcsRef.current.set(adminId, pc);

            // Add screen tracks
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
