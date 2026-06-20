import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KeyRound, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResetPasswordModal({ isOpen, onClose }: ResetPasswordModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    if (email.trim().toLowerCase() !== "shastikaglobal11@gmail.com") {
      toast.error("Password resets must be initiated by shastikaglobal11 only. Please contact the administrator.");
      return;
    }

    setLoading(true);

    try {
      // Supabase Logic: Sends a password reset email to the user.
      // The redirectTo URL should be the route in your app where the user sets their new password.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (error) {
        throw error;
      }

      setIsSent(true);
      toast.success("Password reset link sent to your email!");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-background/80 backdrop-blur-xl border border-white/10 shadow-2xl">
        <DialogHeader className="text-center space-y-4 pt-4">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            {isSent ? "Check Your Email" : "Reset Password"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {isSent 
              ? "We've sent a password reset link to your email. Click the link to securely update your password." 
              : "Enter the email address associated with your account, and we'll send you a link to reset your password."}
          </DialogDescription>
        </DialogHeader>

        {!isSent ? (
          <form onSubmit={handleResetPassword} className="space-y-4 py-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Enter your email address"
                className="pl-10 pr-4 py-6 bg-white/5 border-white/10 focus-visible:ring-primary/50 text-foreground"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="pt-4 flex-col gap-2">
              <Button
                type="submit"
                className="w-full py-6 text-base font-semibold bg-primary hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)]"
                disabled={loading}
              >
                {loading ? "Sending Link..." : "Send Reset Link"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="w-full py-6 text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-6 flex flex-col gap-4 items-center">
             <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full py-6 border-white/10"
              >
                Close Window
              </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
