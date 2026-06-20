import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section } from "@/components/shared/FormShell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { products } from "@/data/mock";

export default function LowStockAlerts() {
  const low = products.filter((p) => p.status !== "In Stock");
  return (
    <div>
      <PageHeader title="Low Stock Alerts" description="Products at or below reorder threshold" breadcrumbs={[{ label: "Inventory" }, { label: "Alerts" }]} />
      <Section>
        <div className="space-y-2">
          {low.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 border border-border rounded-md">
              <div className="h-9 w-9 rounded-md bg-warning-muted text-warning flex items-center justify-center"><AlertTriangle className="h-4 w-4" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.sku} · On hand: {p.stock} · Reorder at: {p.reorder}</div>
              </div>
              <StatusBadge status={p.status} />
              <Button size="sm" variant="outline">Reorder</Button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
