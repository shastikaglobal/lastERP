import { useState } from "react";
import SectionHeader from "../../components/SectionHeader";
import Card from "@/components/Card";
import { Smartphone, RefreshCw, Radio, CheckCircle, Database, ShieldAlert, Key, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MobileCRM() {
  const [features] = useState([
    { title: "Offline Data Sync", desc: "Encrypts and caches customer pipelines on physical BDE mobile devices for offline access.", icon: Database, status: "Active" },
    { title: "Rotating Pairing Key", desc: "Secures authentication by rotating QR pairing keys every 60 seconds.", icon: Key, status: "Active" },
    { title: "Visit Verification", desc: "Automates GPS check-ins using cryptographic signatures to verify customer visits.", icon: Globe, status: "Active" }
  ]);

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      <SectionHeader
        title="Mobile CRM Features & Settings"
        sub="Monitor outbound synchronization databases, pair BDE agent devices, and configure network encryption policies"
        actions={
          <Button size="sm" className="btn-gold shadow-md">
            <RefreshCw className="h-4 w-4 mr-1.5" /> Synchronize Databases
          </Button>
        }
      />

      {/* Metrics overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4 p-5 bg-card/60 backdrop-blur-md">
          <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Active Phone Connections</div>
            <div className="text-2xl font-bold font-mono mt-0.5">18 Paired</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5 bg-card/60 backdrop-blur-md">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Live Socket Streams</div>
            <div className="text-2xl font-bold font-mono mt-0.5">3 Terminals</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5 bg-card/60 backdrop-blur-md">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Synchronization Health</div>
            <div className="text-2xl font-bold font-mono mt-0.5">99.8% Successful</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <Card key={i} className="p-6 bg-card/60 backdrop-blur-md space-y-4 hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-neutral-900 text-primary border border-white/5">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold text-[10px]">
                  {f.status}
                </span>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">{f.title}</h4>
                <p className="text-xs text-muted-foreground leading-normal">{f.desc}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-bold text-foreground">Mobile Client Configurations</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Pair your mobile CRM app directly by scanning QR pairing tokens inside your profile settings page.</p>
        <div className="p-4 rounded-xl bg-neutral-900/40 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-amber-500" /> Pairing Token Policy Enforced
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Tokens pairing requires 2FA authentication code sent to email. Secure sandbox is created on device containing encrypted lead databases.
            </p>
          </div>
          <Button variant="outline" size="sm" className="text-xs font-semibold border-primary/20 hover:bg-primary/10 self-start md:self-auto shrink-0">
            View Policy Documents
          </Button>
        </div>
      </Card>
    </div>
  );
}
