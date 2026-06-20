import { useState } from "react";
import SectionHeader from "../../components/SectionHeader";
import Card from "@/components/Card";
import { ShieldCheck, Key, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Security() {
  const [settings] = useState([
    { title: "IP Whitelisting", desc: "Restricts access to trusted IP ranges.", icon: ShieldCheck, status: "Enabled" },
    { title: "Hardware Token", desc: "Requires hardware token for critical actions.", icon: Key, status: "Active" },
    { title: "Screen Capture Protection", desc: "Prevents screenshots of sensitive data.", icon: Lock, status: "Enabled" },
  ]);

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      <SectionHeader
        title="Security Settings"
        sub="Configure security policies for CRM access and data protection."
        actions={
          <Button size="sm" className="btn-gold shadow-md">
            Save Changes
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {settings.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="p-5 bg-card/60 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-2">
                <Icon className="h-5 w-5 text-primary" />
                <h4 className="font-medium text-foreground">{s.title}</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{s.desc}</p>
              <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary rounded">
                {s.status}
              </span>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
