import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState("");
  const [searchParams] = useSearchParams();
  const { session } = useAuth();

  useEffect(() => {
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');
    const code = searchParams.get('code');

    if (error) {
      setErrorMsg(error_description || "Authentication failed.");
      return;
    }

    if (code) {
      // Exchange the code for a session
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) {
          setErrorMsg(error.message);
        } else {
          const isRecovery = window.location.hash.includes("type=recovery") || searchParams.get("type") === "recovery";
          if (isRecovery) {
            navigate("/auth?mode=reset", { replace: true });
          } else {
            navigate("/employees/face-attendance?mode=checkin", { replace: true });
          }
        }
      });
    } else if (session) {
      const isRecovery = window.location.hash.includes("type=recovery") || searchParams.get("type") === "recovery";
      if (isRecovery) {
        navigate("/auth?mode=reset", { replace: true });
      } else {
        navigate("/employees/face-attendance?mode=checkin", { replace: true });
      }
    }
  }, [session, navigate, searchParams]);

  // Timeout just in case it hangs forever (10 seconds)
  useEffect(() => {
    if (session || errorMsg) return;
    
    const timer = setTimeout(() => {
      setErrorMsg("Authentication timed out. The session could not be established. Please try again.");
    }, 10000);

    return () => clearTimeout(timer);
  }, [session, errorMsg]);

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="p-6 text-center max-w-md w-full border rounded-lg shadow-sm bg-card">
          <h2 className="text-lg font-semibold text-destructive mb-2">Authentication Error</h2>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <button
            onClick={() => navigate("/auth", { replace: true })}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md w-full hover:bg-primary/90"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <h2 className="text-xl font-semibold">Completing sign in...</h2>
      <p className="text-sm text-muted-foreground">Please wait while we establish your secure session.</p>
    </div>
  );
}