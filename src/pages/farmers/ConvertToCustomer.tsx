import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

  const selectedFarmer = useMemo(
    () => farmers.find((farmer) => farmer.id === selectedId) || null,
    [farmers, selectedId]
  );

  const displayFarmers = selectedId ? (selectedFarmer ? [selectedFarmer] : []) : farmers;

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

  // Mark converted farmers based on existing customers for this company
  useEffect(() => {
    const loadConverted = async () => {
      if (!profile?.company_id || farmers.length === 0) return;

      const emails = farmers
        .map((f) => f.email?.trim())
        .filter((email): email is string => !!email);

      if (emails.length === 0) return;

      const { data, error } = await supabase
        .from("customers" as any)
        .select("email")
        .eq("company_id", profile.company_id)
        .in("email", emails);

      if (error) {
        console.error("Failed to load converted customers", error);
        return;
      }

      const existingEmails = new Set((data || []).map((c: any) => c.email?.trim()));
      setConvertedIds((prev) => {
        const next = new Set(prev);
        farmers.forEach((farmer) => {
          if (farmer.email && existingEmails.has(farmer.email.trim())) {
            next.add(farmer.id);
          }
        });
        return next;
      });
    };

    loadConverted();
  }, [farmers, profile?.company_id]);

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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Convert Farmer to Customer</h1>
      <p className="mb-6 text-muted-foreground">Here you can convert farmers into customers.</p>
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
      {selectedId && !loading && !selectedFarmer && (
        <div className="mb-4 text-sm text-muted-foreground">No farmer found for the selected conversion.</div>
      )}
      {loading ? (
        <div>Loading farmers...</div>
      ) : (
        <table className="min-w-full border">
          <thead>
            <tr>
              <th className="border px-4 py-2 text-left">Name</th>
              <th className="border px-4 py-2">Status</th>
              <th className="border px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {displayFarmers.map((farmer) => (
              <tr key={farmer.id}>
                <td className="border px-4 py-2">{farmer.full_name}</td>
                <td className="border px-4 py-2">
                  {convertedIds.has(farmer.id) ? (
                    <span className="text-green-600">Converted</span>
                  ) : farmer.is_active ? (
                    <span className="text-yellow-600">Active Farmer</span>
                  ) : (
                    <span className="text-muted-foreground">Inactive Farmer</span>
                  )}
                </td>
                <td className="border px-4 py-2">
                  <Button
                    size="sm"
                    disabled={convertedIds.has(farmer.id) || converting === farmer.id}
                    onClick={() => handleConvert(farmer.id)}
                  >
                    {convertedIds.has(farmer.id)
                      ? "Converted"
                      : converting === farmer.id
                      ? "Converting..."
                      : "Convert to Customer"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
