import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Section, FormGrid, FormRow } from "@/components/shared/FormShell";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function CreatePO() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    supplier: '',
    currency: 'USD',
    expectedDate: '',
    terms: 'n30',
    total: '1000'
  });

  useEffect(() => {
    supabase.from('farmers')
      .select('id, full_name')
      .eq('is_deleted', false)
      .then(({ data }) => setFarmers(data || []));
  }, []);

  const handleSave = async () => {
    if (!formData.supplier) {
      toast.error("Supplier is required");
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      let companyId = "default-company";
      if (session?.user?.id) {
        const profileRes = await supabase.from('profiles').select('company_id').eq('id', session.user.id).single();
        if (profileRes.data?.company_id) {
          companyId = profileRes.data.company_id;
        }
      }

      const res = await fetch('/api/purchase_orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          company_id: companyId,
          farmer_id: formData.supplier,
          po_number: 'PO-' + Date.now().toString().slice(-6),
          status: 'draft',
          order_date: formData.expectedDate || new Date().toISOString().split('T')[0],
          total: Number(formData.total),
          currency: formData.currency.toUpperCase()
        })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save PO");
      }
      toast.success("PO created");
      nav("/procurement/orders");
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Create Purchase Order"
        breadcrumbs={[{ label: "Procurement" }, { label: "Orders", to: "/procurement/orders" }, { label: "New" }]}
        actions={<>
          <Button variant="outline" size="sm" onClick={() => nav(-1)} disabled={loading}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-1.5" />{loading ? "Saving..." : "Save"}
          </Button>
        </>}
      />
      <div className="space-y-4 max-w-4xl">
        <Section title="Supplier & Terms">
          <FormGrid>
            <FormRow label="Supplier" required>
              <Select value={formData.supplier} onValueChange={(v) => setFormData({ ...formData, supplier: v })}>
                <SelectTrigger><SelectValue placeholder="Select Supplier" /></SelectTrigger>
                <SelectContent>
                  {farmers.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Currency">
              <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="INR">INR</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Expected delivery">
              <Input
                type="date"
                value={formData.expectedDate}
                onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
              />
            </FormRow>
            <FormRow label="Payment terms">
              <Select value={formData.terms} onValueChange={(v) => setFormData({ ...formData, terms: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="n30">Net 30</SelectItem>
                  <SelectItem value="n60">Net 60</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Total Amount">
              <Input
                type="number"
                value={formData.total}
                onChange={(e) => setFormData({ ...formData, total: e.target.value })}
              />
            </FormRow>
          </FormGrid>
        </Section>
      </div>
    </div>
  );
}
