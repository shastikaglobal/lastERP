import { Check } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/shared/FormShell";
import { toast } from "sonner";

const plans = [
  { name: "Starter", price: "$49", period: "/mo", features: ["5 users", "100 orders/mo", "Email support"], current: false },
  { name: "Pro", price: "$199", period: "/mo", features: ["25 users", "Unlimited orders", "Priority support", "AI insights"], current: true },
  { name: "Enterprise", price: "Custom", period: "", features: ["Unlimited users", "Dedicated CSM", "SSO & SAML", "Custom integrations"], current: false },
];

export default function Subscriptions() {
  const handleUpgrade = (planName: string) => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
      loading: `Preparing checkout for ${planName} plan...`,
      success: `Redirecting to billing portal...`,
      error: "Failed to initialize checkout",
    });
  };

  return (
    <div>
      <PageHeader title="Subscription" description="Your current plan and billing" breadcrumbs={[{ label: "System" }, { label: "Subscriptions" }]} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => (
          <Section key={p.name} className={p.current ? "border-primary ring-2 ring-primary/20" : ""}>
            {p.current && <div className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-2">Current Plan</div>}
            <div className="font-bold text-lg">{p.name}</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-semibold">{p.price}</span>
              <span className="text-sm text-muted-foreground">{p.period}</span>
            </div>
            <ul className="mt-4 space-y-2">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-success" />{f}</li>
              ))}
            </ul>
            <Button 
              className="w-full mt-5" 
              variant={p.current ? "outline" : "default"} 
              disabled={p.current}
              onClick={() => handleUpgrade(p.name)}
            >
              {p.current ? "Current Plan" : "Upgrade"}
            </Button>
          </Section>
        ))}
      </div>
    </div>
  );
}
