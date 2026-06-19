import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppNotification = {
  id: string;
  company_id: string;
  user_id: string | null;
  title: string;
  body: string;
  type: "info" | "warning" | "success" | "destructive";
  is_read: boolean;
  created_at: string;
};

export function useNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("app_notifications" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((data as unknown as AppNotification[]) ?? []);
    setLoading(false);
  }, [profile?.company_id]);

  // Mark one notification as read
  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await supabase
      .from("app_notifications" as any)
      .update({ is_read: true })
      .eq("id", id);
  }, []);

  // Mark ALL as read
  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    if (!profile?.company_id) return;
    await supabase
      .from("app_notifications" as any)
      .update({ is_read: true })
      .eq("company_id", profile.company_id)
      .eq("is_read", false);
  }, [profile?.company_id]);

  useEffect(() => {
    fetchNotifications();

    // Use a unique channel name to avoid Realtime 'already subscribed' crashes
    // during React StrictMode double mounts or fast refreshes.
    const channelId = `notifications-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_notifications" },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { notifications, loading, unreadCount, markRead, markAllRead, refetch: fetchNotifications };
}
