import { useState } from "react";
import SectionHeader from "../../components/SectionHeader";
import Card from "@/components/Card";
import { Smartphone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MobileLogin() {
  const [status] = useState("Ready");

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      <SectionHeader
        title="Mobile CRM Login"
        sub="Authenticate to access the mobile CRM features."
        actions={
          <Button size="sm" className="btn-gold shadow-md">
            <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
          </Button>
        }
      />
      <Card className="p-6 bg-card/60 backdrop-blur-md flex items-center gap-4">
        <Smartphone className="h-6 w-6 text-primary" />
        <div>
          <h4 className="font-medium text-foreground">Login Status: {status}</h4>
          <p className="text-sm text-muted-foreground">Use your mobile device to scan the QR code.</p>
        </div>
      </Card>
    </div>
  );
}
