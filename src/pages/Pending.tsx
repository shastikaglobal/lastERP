import { Sprout, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Pending() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <Sprout className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="text-xl font-semibold">AgriExportOS</div>
        </div>
        <div className="bg-card border rounded-lg p-6 text-center space-y-4 shadow-sm">
          <Clock className="h-12 w-12 mx-auto text-primary" />
          <h1 className="text-lg font-semibold">Awaiting admin approval</h1>
          <p className="text-sm text-muted-foreground">
            Your account has been created and is currently awaiting approval from an administrator. 
            You will be able to access the dashboard once your account is approved.
          </p>
          <div className="pt-4">
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
