import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Farmer {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  village: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  notes: string | null;
  is_active: boolean;
}

export default function ConvertToCustomer() {
  const { profile, session } = useAuth();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set());
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
      const isConverted = convertedIds.has(farmer.id);
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
  }, [displayFarmers, statusFilter, convertedIds]);

  // Fetch farmers on mount (exclude soft-deleted)
  useEffect(() => {
    let mounted = true
    setLoading(true);
    supabase
      .from("farmers")
      .select("id, full_name, phone, email, village, district, state, country, notes, is_active")
      .neq('is_deleted', true)
      .order('full_name', { ascending: true })
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) {
          console.error('Failed to load farmers', error)
          setError(error.message || 'Unable to load farmers')
          setFarmers([])
        } else {
          setError(null)
          setFarmers(data || [])
        }
        setLoading(false);
      });
    return () => { mounted = false }
  }, []);

  // Mark converted farmers based on farmer_id link in customers table
  useEffect(() => {
    const loadConverted = async () => {
      if (!profile?.company_id || farmers.length === 0) return;

      try {
        // Try fetching from the local API first (which connects to the VPS DB where farmer_id is fully supported)
        const response = await fetch(`/api/customers?company_id=${profile.company_id}`, {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Local API returned status ${response.status}`);
        }

        const data = await response.json();
        const convertedFarmerIds = new Set(
          data.map((c: any) => c.farmer_id).filter((id: any): id is string => !!id)
        );

        setConvertedIds((prev) => {
          const next = new Set(prev);
          farmers.forEach((farmer) => {
            if (convertedFarmerIds.has(farmer.id)) {
              next.add(farmer.id);
            }
          });
          return next;
        });
      } catch (apiError) {
        console.warn("Failed to load from local customers API, falling back to Supabase", apiError);

        // Fallback: Query Supabase directly
        const farmerIds = farmers.map((f) => f.id);
        const { data, error } = await supabase
          .from("customers" as any)
          .select("farmer_id")
          .eq("company_id", profile.company_id)
          .in("farmer_id", farmerIds);

        if (error) {
          console.error("Failed to load converted customers from Supabase", error);
          // Fallback: try email-based check for older records without farmer_id
          const emails = farmers
            .map((f) => f.email?.trim())
            .filter((email): email is string => !!email);

          if (emails.length === 0) return;

          const { data: emailData, error: emailError } = await supabase
            .from("customers" as any)
            .select("email")
            .eq("company_id", profile.company_id)
            .in("email", emails);

          if (emailError) {
            console.error("Fallback email check also failed", emailError);
            return;
          }

          const existingEmails = new Set((emailData || []).map((c: any) => c.email?.trim()));
          setConvertedIds((prev) => {
            const next = new Set(prev);
            farmers.forEach((farmer) => {
              if (farmer.email && existingEmails.has(farmer.email.trim())) {
                next.add(farmer.id);
              }
            });
            return next;
          });
          return;
        }

        const convertedFarmerIds = new Set((data || []).map((c: any) => c.farmer_id));
        setConvertedIds((prev) => {
          const next = new Set(prev);
          farmers.forEach((farmer) => {
            if (convertedFarmerIds.has(farmer.id)) {
              next.add(farmer.id);
            }
          });
          return next;
        });
      }
    };

    loadConverted();
  }, [farmers, profile?.company_id, session?.access_token]);

  const handleConvert = async (id: string) => {
    const farmer = farmers.find((f) => f.id === id);
    if (!farmer) {
      setError("Farmer not found for conversion.");
      return;
    }
    if (!profile?.company_id) {
      setError("Company information is missing.");
      return;
    }
    if (!session?.access_token) {
      setError("Authentication token is missing. Please sign in again.");
      return;
    }

    setConverting(id);
    setError(null);

    const customerPayload = {
      company_id: profile.company_id,
      name: farmer.full_name,
      country: farmer.country || "",
      email: farmer.email || "",
      phone: farmer.phone || "",
      notes: farmer.notes || ""
    };

    try {
      const response = await fetch(`/api/farmers/${id}/convert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(customerPayload),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 409) {
          setConvertedIds((prev) => new Set(prev).add(id));
        } else {
          const message = responseData?.error || response.statusText || "Conversion failed";
          console.error("Customer conversion failed", message);
          setError(message);
        }
      } else {
        setConvertedIds((prev) => new Set(prev).add(id));
      }
    } catch (err) {
      console.error("Customer conversion failed", err);
      setError((err as Error)?.message || "Conversion failed");
    } finally {
      setConverting(null);
    }
  };

  const columns = [
    { key: "full_name", header: "Farmer", render: (r: Farmer) => <span className="font-medium">{r.full_name}</span> },
    { key: "phone", header: "Phone", render: (r: Farmer) => <span className="text-sm text-muted-foreground">{r.phone || "—"}</span> },
    { key: "loc", header: "Location", render: (r: Farmer) => <span className="text-sm">{[r.village, r.district, r.state].filter(Boolean).join(", ") || "—"}</span> },
    { key: "status", header: "Status", render: (r: Farmer) => (
      convertedIds.has(r.id) ? (
        <span className="text-green-600 font-semibold">Converted</span>
      ) : r.is_active ? (
        <span className="text-yellow-600 font-semibold">Active Farmer</span>
      ) : (
        <span className="text-muted-foreground">Inactive Farmer</span>
      )
    ) },
    {
      key: "actions",
      header: "Action",
      className: "text-right",
      render: (r: Farmer) => (
        <Button
          size="sm"
          disabled={convertedIds.has(r.id) || converting === r.id}
          onClick={() => handleConvert(r.id)}
        >
          {convertedIds.has(r.id)
            ? "Converted"
            : converting === r.id
            ? "Converting..."
            : "Convert to Customer"}
        </Button>
      )
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
          searchKeys={["full_name", "phone", "village", "district"]}
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
