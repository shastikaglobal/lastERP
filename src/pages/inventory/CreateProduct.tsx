import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Section, FormGrid, FormRow } from "@/components/shared/FormShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function CreateProduct() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { profile } = useAuth();
  
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    sku: "",
    name: "",
    category: "",
    unit: "",
    hs_code: "",
    description: "",
  });

  const handleSave = async () => {
    if (!profile?.company_id) return;
    if (!form.sku || !form.name) {
      toast.error("Please fill in required fields (SKU, Name)");
      return;
    }
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          company_id: profile.company_id,
          sku: form.sku,
          name: form.name,
          category: form.category || null,
          unit: form.unit || "Piece",
          hs_code: form.hs_code || null,
          description: form.description || null,
          is_active: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create product");
      }
      toast.success("Product created successfully");
      qc.invalidateQueries({ queryKey: ["products"] });
      nav("/inventory/products");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Create Product" breadcrumbs={[{ label: "Inventory" }, { label: "Products", to: "/inventory/products" }, { label: "New" }]}
        actions={<>
          <Button variant="outline" size="sm" onClick={() => nav(-1)} disabled={busy}><ArrowLeft className="h-4 w-4 mr-1.5" />Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />} Save
          </Button>
        </>}
      />
      <div className="space-y-4 max-w-4xl">
        <Section title="Product Details">
          <FormGrid>
            <FormRow label="SKU" required><Input placeholder="AGRI-CCN-001" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} /></FormRow>
            <FormRow label="Name" required><Input placeholder="Fresh Brown Coconut" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></FormRow>
            <FormRow label="Category">
              <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Coconuts">Coconuts</SelectItem>
                  <SelectItem value="Vegetables">Vegetables</SelectItem>
                  <SelectItem value="Fruits">Fruits</SelectItem>
                  <SelectItem value="Bananas">Bananas</SelectItem>
                  <SelectItem value="Spices">Spices</SelectItem>
                  <SelectItem value="Grains">Grains</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="UOM">
              <Select value={form.unit} onValueChange={v => setForm({...form, unit: v})}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Piece">Piece</SelectItem>
                  <SelectItem value="Ton">Ton</SelectItem>
                  <SelectItem value="Kg">Kg</SelectItem>
                  <SelectItem value="Box">Box</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="HS Code"><Input placeholder="0801.19" value={form.hs_code} onChange={e => setForm({...form, hs_code: e.target.value})} /></FormRow>
          </FormGrid>
          <div className="mt-4"><FormRow label="Description"><Textarea rows={3} placeholder="Detailed product description…" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></FormRow></div>
        </Section>
        <Section title="Pricing & Stock">
          <FormGrid cols={3}>
            <FormRow label="Unit price"><Input type="number" placeholder="0.00" /></FormRow>
            <FormRow label="Currency"><Select defaultValue="usd"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="usd">USD</SelectItem></SelectContent></Select></FormRow>
            <FormRow label="Reorder level"><Input type="number" placeholder="100" /></FormRow>
          </FormGrid>
        </Section>
      </div>
    </div>
  );
}
