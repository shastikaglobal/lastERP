import { useState } from "react";
import { useSearchParams, useNavigate, Navigate, useLocation } from "react-router-dom";
import { Sprout, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { signInWithGoogle } from "@/lib/googleAuth";
import { SetPasswordModal } from "@/components/SetPasswordModal";

import { Input } from "@/components/ui/input";

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, profile, loading } = useAuth();
  const [busyGoogle, setBusyGoogle] = useState(false);
  const [busyGithub, setBusyGithub] = useState(false);
  const [busyEmail, setBusyEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyEmail(true);

    try {
      let loginEmail = email.trim();

      // If it doesn't look like an email, assume it's an Employee ID or eSSL/Biometric ID
      if (!loginEmail.includes('@')) {
        const { data, error } = await supabase
          .from('profiles')
          .select('email')
          .or(`employee_id.eq.${loginEmail},biometric_id.eq.${loginEmail}`)
          .maybeSingle();

        if (error || !data || !data.email) {
          toast.error("Employee ID not found. Please check your ID or contact Admin.");
          setBusyEmail(false);
          return;
        }
        
        // Use the found email to log in
        loginEmail = data.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      
      if (error) {
        toast.error(error.message || "Invalid login credentials");
        setBusyEmail(false);
      } else if (!data.session) {
        toast.error("Please confirm your email address before logging in.");
        setBusyEmail(false);
      }
      // If success and we have a session, the onAuthStateChange listener in useAuth will trigger the redirect
    } catch (err: any) {
      console.error("Login exception:", err);
      toast.error(err?.message || "An unexpected error occurred during login.");
      setBusyEmail(false);
    }
  };

  const from = (location.state as { from?: string })?.from || "/employees/face-attendance";
  
  if (!loading && session) return <Navigate to={from} replace />;

  const handleGoogle = async () => {
    setBusyGoogle(true);
    try {
      await signInWithGoogle();
      // browser will redirect — no need to setBusy(false)
    } catch (error: any) {
      setBusyGoogle(false);
      toast.error(error.message || "Could not sign in with Google");
    }
  };

  const handleGithub = async () => {
    setBusyGithub(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setBusyGithub(false);
      toast.error(error.message || "Could not sign in with GitHub");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="flex items-center justify-center rounded-lg bg-primary p-2">
            <img
              src="/assets/shastika-logo.png"
              alt="Shastika Global Impex"
              style={{ width: '80px', height: '80px', objectFit: 'contain' }}
            />
          </div>
          <div>
            <div className="text-xl font-semibold">Shastika Global Impex</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              IMPEX · AGRI EXPORT ERP
            </div>
          </div>
        </div>

        <div className="erp-card p-6 space-y-4">
          <div className="text-center space-y-1">
            <h1 className="text-lg font-semibold">Sign in to continue</h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials or use a social login.
            </p>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="User ID / Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/5"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/5"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={busyEmail}
            >
              {busyEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* Google */}
          <Button
            onClick={handleGoogle}
            disabled={busyGoogle || busyGithub}
            className="w-full"
            size="lg"
            variant="outline"
          >
            {busyGoogle ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </Button>

          {/* GitHub */}
          <Button
            onClick={handleGithub}
            disabled={busyGoogle || busyGithub}
            className="w-full"
            size="lg"
            variant="outline"
          >
            {busyGithub ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
              </svg>
            )}
            Continue with GitHub
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            By continuing you agree to the workspace terms. Your account will be created with{" "}
            <span className="font-medium">Pending</span> status until approved.
          </p>
        </div>
      </div>
    </div>
  );
}