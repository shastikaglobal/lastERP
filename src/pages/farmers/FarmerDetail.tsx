import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Phone, Mail, MapPin, Sprout } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section } from "@/components/shared/FormShell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { supabase } from "@/integrations/supabase/client";

export default function FarmerDetail() {
  const { id } = useParams();
  const nav = useNavigate();

  const { data: farmer, isLoading } = useQuery({
    queryKey: ["farmer", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("farmers").select("*").eq("id", id!).neq("is_deleted", true).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: pos } = useQuery({
    queryKey: ["farmer-pos", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id, po_number, order_date, total, status")
        .eq("farmer_id", id!)
        .neq("is_deleted", true)
        .order("order_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }
  if (!farmer) {
    return <div className="text-sm text-muted-foreground">Farmer not found.</div>;
  }

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => nav("/farmers")} className="mb-2 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>
      <PageHeader
        title={farmer.full_name}
        description={farmer.code || undefined}
        breadcrumbs={[{ label: "Farmers", to: "/farmers" }, { label: farmer.full_name }]}
        actions={<StatusBadge status={farmer.is_active ? "Active" : "Inactive"} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Contact" className="lg:col-span-1">
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{farmer.phone || "—"}</li>
            <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{farmer.email || "—"}</li>
            <li className="flex items-start gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" /><span>{[farmer.village, farmer.district, farmer.state, farmer.country].filter(Boolean).join(", ") || "—"}</span></li>
            <li className="flex items-center gap-2"><Sprout className="h-3.5 w-3.5 text-muted-foreground" />{(farmer.primary_crops || []).join(", ") || "—"}</li>
          </ul>
        </Section>

        <Section title="Recent purchase orders" className="lg:col-span-2">
          {!pos || pos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchase orders yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                <tr><th className="text-left py-2">PO #</th><th className="text-left">Date</th><th className="text-right">Total</th><th className="text-left pl-3">Status</th></tr>
              </thead>
              <tbody>
                {pos.map((po) => (
                  <tr key={po.id} className="border-b last:border-0 border-border hover:bg-muted/40 cursor-pointer"
                      onClick={() => nav(`/procurement/orders`)}>
                    <td className="py-2 font-mono text-xs">{po.po_number}</td>
                    <td>{po.order_date}</td>
                    <td className="text-right tabular-nums">${Number(po.total).toLocaleString()}</td>
                    <td className="pl-3"><StatusBadge status={po.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {farmer.notes && (
          <Section title="Notes" className="lg:col-span-3">
            <p className="text-sm whitespace-pre-wrap">{farmer.notes}</p>
          </Section>
        )}
      </div>
    </div>
  );
}
