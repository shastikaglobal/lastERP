import { BookOpen, Download } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/shared/FormShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { shipments } from "@/data/mock";
import { previewDocument } from "@/lib/utils";

export default function BillsOfLading() {
  return (
    <div>
      <PageHeader title="Bills of Lading" description="Carrier-issued transport documents" breadcrumbs={[{ label: "Documents" }, { label: "Bills of Lading" }]} />
      <Section>
        <div className="space-y-2">
          {shipments.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 border border-border rounded-md">
              <div className="h-9 w-9 rounded-md bg-primary-muted text-primary flex items-center justify-center"><BookOpen className="h-4 w-4" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium font-mono">BL-{s.id.slice(3)}</div>
                <div className="text-xs text-muted-foreground">{s.carrier} · {s.origin} → {s.destination}</div>
              </div>
              <StatusBadge status={s.status} />
              <Button variant="outline" size="sm" onClick={() => previewDocument(`BL_${s.id.replace(/-/g, '_')}.pdf`)}>
                <Download className="h-3.5 w-3.5 mr-1.5" />Preview
              </Button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
