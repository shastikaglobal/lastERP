import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section, FormGrid, FormRow } from "@/components/shared/FormShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function CreateInspection() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { profile, user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [batchId, setBatchId] = useState("");
  const [moisture, setMoisture] = useState("");
  const [foreign, setForeign] = useState("");
  const [broken, setBroken] = useState("");
  const [grade, setGrade] = useState("A");
  const result = "pending";
  const [notes, setNotes] = useState("");

  const { data: batches, isLoading: batchesLoading } = useQuery({
    queryKey: ["batches-pending", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/inventory/inventory_batches', {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch batches');
        const rows = await res.json();
        // Enrich with product names
        const prodRes = await fetch('/api/inventory/products', {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        const products = prodRes.ok ? await prodRes.json() : [];
        const prodMap: Record<string, string> = {};
        products.forEach((p: any) => { prodMap[p.id] = p.name; });
        return (rows || []).filter((b: any) => b.company_id === profile.company_id && !b.is_deleted).map((b: any) => ({
          ...b,
          product: { name: prodMap[b.product_id] || 'Unknown' }
        }));
      } catch (err) {
        console.error('Error fetching batches:', err);
        return [];
      }
    },
    enabled: !!profile?.company_id
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id || !user) return toast.error("Missing context");
    if (!batchId) return toast.error("Select a batch");
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/inventory/qc_inspections', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([{
          company_id: profile.company_id,
          batch_id: batchId,
          inspector_id: user.id,
          moisture_pct: moisture ? Number(moisture) : null,
          foreign_matter_pct: foreign ? Number(foreign) : null,
          broken_pct: broken ? Number(broken) : null,
          grade,
          result,
          lab_notes: notes || null,
        }])
      });
      if (!res.ok) { const e2 = await res.json().catch(() => ({})); throw new Error(e2.error || 'Insert failed'); }
      toast.success("Inspection recorded");
      qc.invalidateQueries({ queryKey: ["qc_inspections"] });
      qc.invalidateQueries({ queryKey: ["batches-pending"] });
      nav("/qc/inspections");
    } catch (err: any) {
      toast.error(err.message || 'Failed to save inspection');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="New QC Inspection"
        description="Record quality results for a batch"
        breadcrumbs={[{ label: "Quality Control", to: "/qc/inspections" }, { label: "New" }]}
      />
      <form onSubmit={submit} className="space-y-4">
        <Section title="Batch">
          <FormRow label="Inventory batch" required>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger>
                <SelectValue placeholder={batchesLoading ? "Loading batches..." : batches?.length === 0 ? "No batches found" : "Select a batch"} />
              </SelectTrigger>
              <SelectContent>
                {batches?.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground text-center">
                    No inventory batches found.<br />
                    <span className="text-primary">Add batches via Inventory → Inventory Batches first.</span>
                  </div>
                ) : (
                  batches?.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.lot_number} — {b.product?.name || "Unknown"} <span className="text-muted-foreground">({b.status})</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </FormRow>
        </Section>

        <Section title="Lab measurements">
          <FormGrid cols={3}>
            <FormRow label="Moisture %"><Input type="number" step="0.01" value={moisture} onChange={(e) => setMoisture(e.target.value)} /></FormRow>
            <FormRow label="Foreign matter %"><Input type="number" step="0.01" value={foreign} onChange={(e) => setForeign(e.target.value)} /></FormRow>
            <FormRow label="Broken %"><Input type="number" step="0.01" value={broken} onChange={(e) => setBroken(e.target.value)} /></FormRow>
          </FormGrid>
        </Section>

        <Section title="Result">
          <FormGrid cols={2}>
            <FormRow label="Grade">
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A — Premium</SelectItem>
                  <SelectItem value="B">B — Standard</SelectItem>
                  <SelectItem value="C">C — Below standard</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Outcome">
              <div className="rounded-md border border-slate-700 px-3 py-2 text-sm text-muted-foreground bg-slate-950">
                Pending approval
              </div>
            </FormRow>
          </FormGrid>
          <div className="mt-4">
            <FormRow label="Lab notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></FormRow>
          </div>
        </Section>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => nav("/qc/inspections")} disabled={busy}>Cancel</Button>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save inspection
          </Button>
        </div>
      </form>
    </div>
  );
}

