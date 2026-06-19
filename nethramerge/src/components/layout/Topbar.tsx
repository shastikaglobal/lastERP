import { Bell, LogOut, Menu, Search, User as UserIcon, CheckCheck, AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications, AppNotification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

// ── Icon & colour helpers ──────────────────────────────────────────────────────
const iconMap = {
  info: Info,
  warning: AlertTriangle,
  destructive: AlertCircle,
  success: CheckCircle2,
} as const;

const dotColor: Record<string, string> = {
  info:        "bg-blue-500",
  warning:     "bg-yellow-500",
  destructive: "bg-red-500",
  success:     "bg-emerald-500",
};

function NotifRow({ n, onRead }: { n: AppNotification; onRead: (id: string) => void }) {
  const Icon = iconMap[n.type as keyof typeof iconMap] ?? Bell;
  const dot  = dotColor[n.type] ?? "bg-primary";

  return (
    <div
      key={n.id}
      onClick={() => onRead(n.id)}
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${
        !n.is_read ? "bg-muted/30" : ""
      }`}
    >
      <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${!n.is_read ? dot : "bg-transparent"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5">
          <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
          <p className={`text-xs leading-snug ${!n.is_read ? "font-medium" : "font-normal text-muted-foreground"}`}>
            {n.title}
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 pl-5">{n.body}</p>
        <p className="text-[10px] text-muted-foreground/70 mt-1 pl-5">
          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { profile, signOut, session } = useAuth();
  const nav = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const initials = (profile?.full_name || profile?.email || "U").slice(0, 2).toUpperCase();
  const activeUser = profile?.full_name || profile?.email || "User";

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    nav("/auth", { replace: true });
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    toast.success("All notifications marked as read");
  };

  const recent = notifications.slice(0, 8);

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur flex items-center gap-3 px-4 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search orders, farmers, POs…"
          className="pl-9 h-9 bg-secondary border-transparent focus-visible:bg-background"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">

        {/* ── Notification Bell ─────────────────────────────────────────── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" id="notif-bell-btn">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden" sideOffset={8}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">Notifications</span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => nav("/system/notifications")}
                  className="text-[11px] text-primary hover:underline"
                >
                  See all
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
              {recent.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  <Bell className="h-6 w-6 mx-auto mb-2 opacity-30" />
                  No notifications yet
                </div>
              ) : (
                recent.map((n) => (
                  <NotifRow key={n.id} n={n} onRead={markRead} />
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 8 && (
              <div className="border-t border-border">
                <button
                  onClick={() => nav("/system/notifications")}
                  className="w-full py-2.5 text-xs text-center text-primary hover:bg-muted/30 transition-colors"
                >
                  View all {notifications.length} notifications
                </button>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ── User Menu ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {activeUser && (
            <span className="text-sm font-medium text-foreground hidden sm:inline-block">
              {activeUser}
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-full logo-mark text-[hsl(var(--primary-foreground))] flex items-center justify-center text-xs font-bold hover:opacity-90 overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-medium truncate">
                {profile?.full_name && profile.full_name !== profile.email ? profile.full_name : "User"}
              </div>
              {profile?.email && (
                <div className="text-xs text-muted-foreground font-normal truncate">{profile.email}</div>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => nav("/system/account")}>
              <UserIcon className="h-4 w-4 mr-2" /> Account settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
