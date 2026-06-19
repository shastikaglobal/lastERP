import { useNavigate } from "react-router-dom";
import { Plus, Loader2, Sprout } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useCan } from "@/hooks/useAuth";

type Farmer = {
  id: string;
  code: string | null;
  full_name: string;
  phone: string | null;
  village: string | null;
  district: string | null;
  state: string | null;
  primary_crops: string[] | null;
  is_active: boolean;
  created_at: string;
};

export default function FarmersList() {
  const nav = useNavigate();
  const can = useCan();
  const canConvert = can("farmers.manage");

  const { data, isLoading } = useQuery({
    queryKey: ["farmers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farmers")
        .select("id, code, full_name, phone, village, district, state, primary_crops, is_active, created_at")
        .neq("is_deleted", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Farmer[];
    },
  });

  const columns = [
    { key: "code", header: "Code", render: (r: Farmer) => <span className="font-mono text-xs text-muted-foreground">{r.code || "—"}</span> },
    { key: "name", header: "Farmer", render: (r: Farmer) => <span className="font-medium">{r.full_name}</span> },
    { key: "phone", header: "Phone", render: (r: Farmer) => <span className="text-sm text-muted-foreground">{r.phone || "—"}</span> },
    { key: "loc", header: "Location", render: (r: Farmer) => <span className="text-sm">{[r.village, r.district, r.state].filter(Boolean).join(", ") || "—"}</span> },
    { key: "crops", header: "Crops", render: (r: Farmer) => <span className="text-xs text-muted-foreground">{(r.primary_crops || []).join(", ") || "—"}</span> },
    { key: "status", header: "Status", render: (r: Farmer) => <StatusBadge status={r.is_active ? "Active" : "Inactive"} /> },
    {
      key: "actions",
      header: "Action",
      className: "text-right",
      render: (r: Farmer) => (
        <Button
          size="xs"
          variant="secondary"
          onClick={(event) => {
            event.stopPropagation();
            nav(`/farmers/convert?id=${r.id}`);
          }}
        >
          Convert to Customer
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Farmers"
        description="Master database of farmer suppliers"
        breadcrumbs={[{ label: "Farmers" }]}
        actions={
          can("farmers.create") && (
            <Button size="sm" onClick={() => nav("/farmers/create")}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Farmer
            </Button>
          )
        }
      />

      {isLoading ? (
        <div className="erp-card flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<Sprout className="h-5 w-5" />}
          title="No farmers yet"
          description="Add your first farmer supplier to start procuring produce."
          action={
            can("farmers.create") && (
              <Button size="sm" onClick={() => nav("/farmers/create")}>
                <Plus className="h-4 w-4 mr-1.5" /> Add Farmer
              </Button>
            )
          }
        />
      ) : (
        <DataTable
          data={data}
          searchKeys={["full_name", "code", "village", "district"]}
          onRowClick={(r) => nav(`/farmers/${r.id}`)}
          columns={columns}
        />
      )}
    </div>
  );
}
