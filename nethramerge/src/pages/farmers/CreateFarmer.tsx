import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section, FormGrid, FormRow } from "@/components/shared/FormShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

export default function CreateFarmer() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    code: "",
    full_name: "",
    phone: "",
    email: "",
    village: "",
    district: "",
    state: "",
    country: "India",
    primary_crops: "",
    bank_account: "",
    notes: "",
  });

  const onChange = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) {
      toast.error("Missing company context");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("farmers").insert({
      company_id: profile.company_id,
      code: form.code || null,
      full_name: form.full_name,
      phone: form.phone || null,
      email: form.email || null,
      village: form.village || null,
      district: form.district || null,
      state: form.state || null,
      country: form.country || null,
      primary_crops: form.primary_crops ? form.primary_crops.split(",").map((s) => s.trim()).filter(Boolean) : null,
      bank_account: form.bank_account || null,
      notes: form.notes || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Farmer added");
    qc.invalidateQueries({ queryKey: ["farmers"] });
    nav("/farmers");
  };

  return (
    <div>
      <PageHeader
        title="Add Farmer"
        description="Register a new farmer supplier"
        breadcrumbs={[{ label: "Farmers", to: "/farmers" }, { label: "Add" }]}
      />
      <form onSubmit={submit} className="space-y-4">
        <Section title="Farmer details">
          <FormGrid cols={2}>
            <FormRow label="Farmer code" hint="Optional internal code">
              <Input value={form.code} onChange={onChange("code")} placeholder="F-0001" />
            </FormRow>
            <FormRow label="Full name" required>
              <Input required value={form.full_name} onChange={onChange("full_name")} />
            </FormRow>
            <FormRow label="Phone">
              <Input value={form.phone} onChange={onChange("phone")} />
            </FormRow>
            <FormRow label="Email">
              <Input type="email" value={form.email} onChange={onChange("email")} />
            </FormRow>
          </FormGrid>
        </Section>

        <Section title="Location">
          <FormGrid cols={2}>
            <FormRow label="Village"><Input value={form.village} onChange={onChange("village")} /></FormRow>
            <FormRow label="District"><Input value={form.district} onChange={onChange("district")} /></FormRow>
            <FormRow label="State / Province"><Input value={form.state} onChange={onChange("state")} /></FormRow>
            <FormRow label="Country"><Input value={form.country} onChange={onChange("country")} /></FormRow>
          </FormGrid>
        </Section>

        <Section title="Crops & banking">
          <FormGrid cols={2}>
            <FormRow label="Primary crops" hint="Comma separated">
              <Input value={form.primary_crops} onChange={onChange("primary_crops")} placeholder="Turmeric, Cardamom" />
            </FormRow>
            <FormRow label="Bank account">
              <Input value={form.bank_account} onChange={onChange("bank_account")} />
            </FormRow>
          </FormGrid>
          <div className="mt-4">
            <FormRow label="Notes">
              <Textarea value={form.notes} onChange={onChange("notes")} rows={3} />
            </FormRow>
          </div>
        </Section>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => nav("/farmers")} disabled={busy}>Cancel</Button>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save farmer
          </Button>
        </div>
      </form>
    </div>
  );
}
