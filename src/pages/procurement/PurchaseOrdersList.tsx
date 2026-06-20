import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { purchaseOrders } from "@/data/mock";

export default function PurchaseOrdersList() {
  const nav = useNavigate();
  return (
    <div>
      <PageHeader title="Purchase Orders" description="All vendor purchase orders" breadcrumbs={[{ label: "Procurement" }, { label: "Orders" }]}
        actions={<Button size="sm" onClick={() => nav("/procurement/orders/create")}><Plus className="h-4 w-4 mr-1.5" />New PO</Button>} />
      <DataTable
        data={purchaseOrders}
        searchKeys={["id", "supplier"]}
        columns={[
          { key: "id", header: "PO", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: "supplier", header: "Supplier", render: (r) => <span className="font-medium">{r.supplier}</span> },
          { key: "items", header: "Items", render: (r) => <span className="tabular-nums">{r.items}</span> },
          { key: "amount", header: "Amount", render: (r) => <span className="font-medium tabular-nums">{r.currency} {r.amount.toLocaleString()}</span> },
          { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          { key: "exp", header: "Expected", render: (r) => <span className="text-xs text-muted-foreground">{r.expectedAt}</span> },
        ]}
      />
    </div>
  );
}