import { Bell, AlertCircle, AlertTriangle, CheckCircle2, Info, CheckCheck, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section } from "@/components/shared/FormShell";
import { Button } from "@/components/ui/button";
import { useNotifications, AppNotification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

// ── Icon & colour maps ────────────────────────────────────────────────────────
const iconMap = {
  info:        { Icon: Info,         bg: "bg-blue-500/10",     text: "text-blue-500"    },
  warning:     { Icon: AlertTriangle, bg: "bg-yellow-500/10",  text: "text-yellow-500"  },
  destructive: { Icon: AlertCircle,  bg: "bg-red-500/10",      text: "text-red-500"     },
  success:     { Icon: CheckCircle2, bg: "bg-emerald-500/10",  text: "text-emerald-500" },
} as const;

const dotColor: Record<string, string> = {
  info:        "bg-blue-500",
  warning:     "bg-yellow-500",
  destructive: "bg-red-500",
  success:     "bg-emerald-500",
};

// ── Single row ────────────────────────────────────────────────────────────────
function NotifCard({ n, onRead }: { n: AppNotification; onRead: (id: string) => void }) {
  const cfg = iconMap[n.type as keyof typeof iconMap] ?? iconMap.info;
  const { Icon, bg, text } = cfg;
  const dot = dotColor[n.type] ?? "bg-primary";

  return (
    <div
      onClick={() => !n.is_read && onRead(n.id)}
      className={`group flex items-start gap-4 p-4 rounded-lg border border-border transition-all cursor-pointer
        ${!n.is_read
          ? "bg-muted/30 hover:bg-muted/50 shadow-sm"
          : "bg-background hover:bg-muted/20 opacity-70"
        }`}
    >
      {/* Type icon */}
      <div className={`h-9 w-9 rounded-lg ${bg} ${text} flex items-center justify-center shrink-0`}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm ${!n.is_read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
          {!n.is_read && (
            <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
        <p className="text-[11px] text-muted-foreground/60 mt-1.5">
          {n.created_at && !isNaN(new Date(n.created_at).getTime()) 
            ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) 
            : "Just now"}
        </p>
      </div>

      {/* Mark read hint */}
      {!n.is_read && (
        <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0">
          Click to read
        </span>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Notifications() {
  const { notifications, loading, unreadCount, markRead, markAllRead } = useNotifications();

  const unread = notifications.filter((n) => !n.is_read);
  const read   = notifications.filter((n) =>  n.is_read);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="System events and alerts — updated in real-time"
        breadcrumbs={[{ label: "System" }, { label: "Notifications" }]}
      />

      <Section>
        {/* Actions bar */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "All caught up!"}
          </p>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={markAllRead}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <Bell className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No notifications yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              When system events happen — shipment delays, payment alerts, approvals — they'll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Unread */}
            {unread.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                  Unread
                </p>
                {unread.map((n) => (
                  <NotifCard key={n.id} n={n} onRead={markRead} />
                ))}
              </div>
            )}

            {/* Read */}
            {read.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 pt-2">
                  Earlier
                </p>
                {read.map((n) => (
                  <NotifCard key={n.id} n={n} onRead={markRead} />
                ))}
              </div>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
