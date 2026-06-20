import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Eye, EyeOff, UserSquare2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface SetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SetPasswordModal({ isOpen, onClose }: SetPasswordModalProps) {
  const { session, refresh } = useAuth();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId) {
      toast.error("Please enter your Employee ID");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      if (session?.user?.id) {
        // Update profile with the employee ID
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ employee_id: employeeId })
          .eq('id', session.user.id);
          
        if (profileError) throw profileError;
      }

      // Update the user's password
      const { error: authError } = await supabase.auth.updateUser({
        password: password,
      });

      if (authError) throw authError;

      await refresh(); // Refresh auth context so it knows employee_id is set
      toast.success("Account successfully linked! Welcome to AgriExportOS.");
      onClose();
    } catch (error: any) {
      console.error("Error setting up account:", error);
      toast.error(error.message || "Failed to complete setup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-background/80 backdrop-blur-xl border border-white/10 shadow-2xl" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader className="text-center space-y-4 pt-4">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">Complete Setup</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Please enter your Employee ID and set a password to link your Google account to the ERP.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSetPassword} className="space-y-4 py-4">
          <div className="space-y-4">
            <div className="relative">
              <UserSquare2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Employee ID (e.g. 1001)"
                className="pl-10 pr-4 py-6 bg-white/5 border-white/10 focus-visible:ring-primary/50 text-foreground"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              />
            </div>
            
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                className="pl-4 pr-10 py-6 bg-white/5 border-white/10 focus-visible:ring-primary/50 text-foreground"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                className="pl-4 pr-10 py-6 bg-white/5 border-white/10 focus-visible:ring-primary/50 text-foreground"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="submit"
              className="w-full py-6 text-base font-semibold bg-primary hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)]"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
