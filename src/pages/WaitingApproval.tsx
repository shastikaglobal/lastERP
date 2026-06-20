import { Navigate } from "react-router-dom";
import { Sprout, Clock, XCircle, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export default function WaitingApproval() {
  const { session, profile, loading, signOut, refresh } = useAuth();

  // Auto-poll every 5 seconds — when admin approves, user is redirected automatically
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!loading && !session) return <Navigate to="/auth" replace />;
  if (!loading && profile?.status === "approved") return <Navigate to="/dashboards/executive" replace />;
  if (!loading && session && !profile?.requested_role && profile?.status !== "rejected") {
    return <Navigate to="/complete-profile" replace />;
  }

  const rejected = profile?.status === "rejected";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <Sprout className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="text-xl font-semibold">AgriExportOS</div>
        </div>
        <div className="erp-card p-6 text-center space-y-4">
          {rejected ? (
            <>
              <XCircle className="h-12 w-12 mx-auto text-destructive" />
              <h1 className="text-lg font-semibold">Registration rejected</h1>
              <p className="text-sm text-muted-foreground">
                {profile?.rejection_reason || "Your registration was rejected. Please contact your administrator."}
              </p>
            </>
          ) : (
            <>
              <Clock className="h-12 w-12 mx-auto text-primary" />
              <h1 className="text-lg font-semibold">Awaiting approval</h1>
              <p className="text-sm text-muted-foreground">
                Hi {profile?.full_name || profile?.email}, your account is awaiting approval from an Admin or Manager.
                You'll get access as soon as they review your request{profile?.requested_role ? ` for the ${profile.requested_role} role` : ""}.
              </p>
            </>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => refresh()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh status
            </Button>
            <Button variant="ghost" className="flex-1" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
