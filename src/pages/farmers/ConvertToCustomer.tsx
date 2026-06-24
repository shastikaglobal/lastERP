import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/StatusBadge";

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
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(false);
  const [convertingIds, setConvertingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const selectedId = searchParams.get("id");

  const [statusFilter, setStatusFilter] = useState("all");

  const selectedFarmer = useMemo(
    () => farmers.find((farmer) => farmer.id === selectedId) || null,
    [farmers, selectedId]
  );

  const displayFarmers = selectedId ? (selectedFarmer ? [selectedFarmer] : []) : farmers;

  const filteredFarmers = useMemo(() => {
    return displayFarmers.filter((farmer) => {
      const isConverted = farmer.conversion_status === "converted";
      if (statusFilter === "active") {
        return farmer.is_active && !isConverted;
      }
      if (statusFilter === "inactive") {
        return !farmer.is_active && !isConverted;
      }
      if (statusFilter === "converted") {
        return isConverted;
      }
      return true;
    });
  }, [displayFarmers, statusFilter]);

  const fetchFarmers = async () => {
    if (!profile?.company_id || !session?.access_token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/farmers?company_id=${profile.company_id}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setFarmers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch farmers:", err);
      setError("Failed to load farmers. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, [profile?.company_id, session?.access_token]);

  const handleConvert = async (farmerId: string) => {
    const farmer = farmers.find((f) => f.id === farmerId);
    setConvertingIds(prev => new Set(prev).add(farmerId));
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/farmers/${farmerId}/convert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ company_id: profile?.company_id })
      });

      if (!res.ok) throw new Error("Conversion failed");

      await fetchFarmers(); // Refresh farmer data to update conversion status
      toast.success(`${farmer?.full_name || "Farmer"} converted to customer successfully!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to convert farmer. Please try again.");
    } finally {
      setConvertingIds(prev => {
        const next = new Set(prev);
        next.delete(farmerId);
        return next;
      });
    }
  };

  const columns = [
    { key: "code", header: "Code", render: (r: Farmer) => <span className="font-mono text-xs text-muted-foreground">{r.code || "—"}</span> },
    { key: "full_name", header: "Farmer Name", render: (r: Farmer) => <span className="font-medium">{r.full_name}</span> },
    { key: "phone", header: "Phone", render: (r: Farmer) => <span className="text-sm text-muted-foreground">{r.phone || "—"}</span> },
    { key: "loc", header: "Location", render: (r: Farmer) => <span className="text-sm">{[r.village, r.district, r.state].filter(Boolean).join(", ") || "—"}</span> },
    { key: "crops", header: "Crops", render: (r: Farmer) => <span className="text-xs text-muted-foreground">{(r.primary_crops || []).join(", ") || "—"}</span> },
    { key: "status", header: "Status", render: (r: Farmer) => <StatusBadge status={r.is_active ? "Active" : "Inactive"} /> },
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
              Converting...
            </Button>
          );
        }

        return (
          <Button
            size="sm"
            onClick={() => handleConvert(r.id)}
          >
            Convert
          </Button>
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Convert Farmer to Customer"
        description="Convert your farmer suppliers into official customers in the database"
        breadcrumbs={[{ label: "Farmers", to: "/farmers" }, { label: "Convert to Customer" }]}
      />

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
      {selectedId && !loading && !selectedFarmer && (
        <div className="mb-4 text-sm text-muted-foreground">No farmer found for the selected conversion.</div>
      )}

      {loading ? (
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
