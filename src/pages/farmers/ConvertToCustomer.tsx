import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Farmer {
  id: string;
  code: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  village: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  primary_crops: string[] | null;
  notes: string | null;
  is_active: boolean;
  conversion_status: "converted" | "active";
}

export default function ConvertToCustomer() {
  const { profile, session } = useAuth();
  const qc = useQueryClient();
  const [convertingIds, setConvertingIds] = useState<Set<string>>(new Set());
  const [searchParams] = useSearchParams();
  const selectedId = searchParams.get("id");
  const [statusFilter, setStatusFilter] = useState("all");

  // ── Fetch farmers directly from Supabase (same source as FarmersList) ──
  const { data: farmers = [], isLoading } = useQuery({
    queryKey: ["farmers-convert"],
    queryFn: async () => {
      // 1. Get all non-deleted farmers
      const { data: farmersData, error: farmersError } = await supabase
        .from("farmers")
        .select("id, code, full_name, phone, email, village, district, state, country, primary_crops, notes, is_active")
        .neq("is_deleted", true)
        .order("created_at", { ascending: false });

      if (farmersError) throw farmersError;
      if (!farmersData || farmersData.length === 0) return [] as Farmer[];

      // 2. Get IDs of already-converted farmers (those that have a customers row)
      const { data: convertedData } = await supabase
        .from("customers")
        .select("farmer_id")
        .not("farmer_id", "is", null);

      const convertedIds = new Set((convertedData || []).map((c: { farmer_id: string }) => c.farmer_id));

      return farmersData.map((f) => ({
        ...f,
        conversion_status: convertedIds.has(f.id) ? ("converted" as const) : ("active" as const),
      })) as Farmer[];
    },
    enabled: !!profile?.company_id,
  });

  const selectedFarmer = useMemo(
    () => farmers.find((farmer) => farmer.id === selectedId) || null,
    [farmers, selectedId]
  );

  const displayFarmers = selectedId ? (selectedFarmer ? [selectedFarmer] : []) : farmers;

  const filteredFarmers = useMemo(() => {
    return displayFarmers.filter((farmer) => {
      const isConverted = farmer.conversion_status === "converted";
      if (statusFilter === "active") return farmer.is_active && !isConverted;
      if (statusFilter === "inactive") return !farmer.is_active && !isConverted;
      if (statusFilter === "converted") return isConverted;
      return true;
    });
  }, [displayFarmers, statusFilter]);

  const handleConvert = async (farmerId: string) => {
    const farmer = farmers.find((f) => f.id === farmerId);
    setConvertingIds((prev) => new Set(prev).add(farmerId));
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/farmers/${farmerId}/convert`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ company_id: profile?.company_id }),
        }
      );

      if (!res.ok) throw new Error("Conversion failed");

      await qc.invalidateQueries({ queryKey: ["farmers-convert"] });
      toast.success(`${farmer?.full_name || "Farmer"} converted to customer successfully!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to convert farmer. Please try again.");
    } finally {
      setConvertingIds((prev) => {
        const next = new Set(prev);
        next.delete(farmerId);
        return next;
      });
    }
  };

  const columns = [
    {
      key: "code",
      header: "Code",
      render: (r: Farmer) => (
        <span className="font-mono text-xs text-muted-foreground">{r.code || "—"}</span>
      ),
    },
    {
      key: "full_name",
      header: "Farmer Name",
      render: (r: Farmer) => <span className="font-medium">{r.full_name}</span>,
    },
    {
      key: "phone",
      header: "Phone",
      render: (r: Farmer) => (
        <span className="text-sm text-muted-foreground">{r.phone || "—"}</span>
      ),
    },
    {
      key: "loc",
      header: "Location",
      render: (r: Farmer) => (
        <span className="text-sm">
          {[r.village, r.district, r.state].filter(Boolean).join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "crops",
      header: "Crops",
      render: (r: Farmer) => (
        <span className="text-xs text-muted-foreground">
          {(r.primary_crops || []).join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r: Farmer) => <StatusBadge status={r.is_active ? "Active" : "Inactive"} />,
    },
    {
      key: "actions",
      header: "Action",
      className: "text-right",
      render: (r: Farmer) => {
        const isConverted = r.conversion_status === "converted";
        const isConverting = convertingIds.has(r.id);

        if (isConverted) {
          return (
            <Button
              size="sm"
              disabled
              className="bg-green-600/10 text-green-600 border border-green-600/20 hover:bg-green-600/10"
            >
              Converted
            </Button>
          );
        }

        if (isConverting) {
          return (
            <Button size="sm" disabled>
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              Converting...
            </Button>
          );
        }

        return (
          <Button size="sm" onClick={() => handleConvert(r.id)}>
            Convert
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Convert Farmer to Customer"
        description="Here you can convert farmers into customers."
        breadcrumbs={[{ label: "Farmers", to: "/farmers" }, { label: "Convert to Customer" }]}
      />

      {isLoading ? (
        <div className="erp-card flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DataTable
          data={filteredFarmers}
          searchKeys={["full_name", "code", "phone", "village", "district"]}
          toolbar={
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium mr-1">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10 text-white animate-fade-in duration-200">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active Farmer</SelectItem>
                  <SelectItem value="inactive">Inactive Farmer</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
          columns={columns}
          emptyMessage="No farmers available for conversion"
        />
      )}
    </div>
  );
}
