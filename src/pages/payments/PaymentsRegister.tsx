import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Save, Receipt } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

export default function PaymentsRegister() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [partyName, setPartyName] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Wire Transfer");
  const [ref, setRef] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [orderId, setOrderId] = useState<string | null>(null);

  const { data: allPayments, isLoading } = useQuery({
    queryKey: ["payments_live", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      const { data: { session: __session_1 } } = await supabase.auth.getSession();
      const pRes = await fetch(`/api/finance/payments?company_id=${profile.company_id}`, {
        headers: { 'Authorization': `Bearer ${__session_1?.access_token}` }
      });
      const pData = pRes.ok ? await pRes.json() : [];

      const { data: { session: __session_2 } } = await supabase.auth.getSession();
      const eRes = await fetch(`/api/finance/export_orders?company_id=${profile.company_id}&payment_status=unpaid`, {
        headers: { 'Authorization': `Bearer ${__session_2?.access_token}` }
      });
      const eData = eRes.ok ? await eRes.json() : [];

      const formattedPayments = (pData || []).map(p => ({
        id: p.payment_number || p.id.split('-')[0].toUpperCase(),
        party: p.payer_name || p.customer || p.notes || "Unknown",
        ref: p.reference_number || "Direct",
        method: p.method,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        date: p.received_at ? format(new Date(p.received_at), "yyyy-MM-dd") : "—"
      }));

      const formattedOrders = (eData || []).map(e => ({
        id: e.order_number,
        party: e.customer_name || "Unknown",
        ref: e.order_number,
        method: "Pending",
        amount: e.total_amount,
        currency: e.currency,
        status: "Unpaid",
        date: e.created_at ? format(new Date(e.created_at), "yyyy-MM-dd") : "—"
      }));

      return [...formattedPayments, ...formattedOrders];
    },
    enabled: !!profile?.company_id
  });

  const { data: unpaidOrders = [] } = useQuery({
    queryKey: ["unpaid_export_orders", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data: { session: __session_3 } } = await supabase.auth.getSession();
      const res = await fetch(`/api/finance/export_orders?company_id=${profile.company_id}&payment_status=unpaid`, {
        headers: { 'Authorization': `Bearer ${__session_3?.access_token}` }
      });
      if (!res.ok) throw new Error("Fetch export orders failed");
      return await res.json();
    },
    enabled: !!profile?.company_id && isDialogOpen
  });

  const handleAddPayment = async () => {
    if (!partyName || !amount) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const payNum = `PAY-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;

      const { data: { session: __session_4 } } = await supabase.auth.getSession();
      const res = await fetch('/api/finance/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${__session_4?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company_id: profile?.company_id,
          payment_number: payNum,
          payer_name: partyName,
          customer: partyName,
          amount: Number(amount),
          currency,
          method,
          status: 'Completed',
          reference_number: ref,
          received_at: new Date().toISOString(),
          created_by: profile?.id
        })
      });

      if (!res.ok) throw new Error("Insert payment failed");

      if (orderId) {
        await fetch(`/api/finance/export_orders/${orderId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${__session_4?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ payment_status: 'paid' })
        });
      }

      toast.success("Payment registered successfully");
      setIsDialogOpen(false);
      setOrderId(null);
      setPartyName("");
      setAmount("");
      setRef("");
      queryClient.invalidateQueries({ queryKey: ["payments_live"] });
      queryClient.invalidateQueries({ queryKey: ["export_orders"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to register payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOrderSelect = (id: string) => {
    setOrderId(id);
    const order = unpaidOrders.find(o => o.id === id);
    if (order) {
      setPartyName(order.customer_name);
      setAmount(order.total_amount.toString());
      setCurrency(order.currency);
      setRef(order.order_number);
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Payment Register"
        description="All incoming and outstanding payments"
        breadcrumbs={[{ label: "Payments" }]}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-gold">
                <Plus className="mr-2 h-4 w-4" /> Add Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="erp-card border-white/10 max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full" />
                  Register Payment
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Link to Export Order (Optional)</Label>
                  <Select value={orderId || "none"} onValueChange={(val) => val === "none" ? setOrderId(null) : handleOrderSelect(val)}>
                    <SelectTrigger className="bg-white/5">
                      <SelectValue placeholder="Select an unpaid order" />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      <SelectItem value="none">Manual Entry (No Order)</SelectItem>
                      {unpaidOrders.map(o => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.order_number} — {o.customer_name} ({o.currency} {o.total_amount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Payer Name (Party) *</Label>
                  <Input placeholder="e.g. Osaka Electronics" value={partyName} onChange={(e) => setPartyName(e.target.value)} className="bg-white/5" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-white/5" />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="bg-white/5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card">
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="AED">AED (د.إ)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select value={method} onValueChange={setMethod}>
                      <SelectTrigger className="bg-white/5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card">
                        <SelectItem value="Wire Transfer">Wire Transfer</SelectItem>
                        <SelectItem value="LC">Letter of Credit (LC)</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Check">Check</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reference # / Order #</Label>
                    <Input placeholder="INV-2026-..." value={ref} onChange={(e) => setRef(e.target.value)} className="bg-white/5" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button className="btn-gold" onClick={handleAddPayment} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Register
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
        </div>
      ) : !allPayments || allPayments.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-white/10 rounded-xl">
          <Receipt className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
          <h3 className="text-lg font-medium">No payments recorded</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
            There are no live payments or pending export orders in your database.
          </p>
        </div>
      ) : (
        <DataTable
          data={allPayments}
          searchKeys={["id", "party", "ref"]}
          columns={[
            { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs font-bold text-primary">{r.id}</span> },
            { key: "party", header: "Party", render: (r) => <span className="font-medium">{r.party}</span> },
            { key: "ref", header: "Reference", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.ref}</span> },
            { key: "method", header: "Method", render: (r) => <span className="text-sm">{r.method}</span> },
            { key: "amount", header: "Amount", render: (r) => <span className="font-bold tabular-nums text-white">{r.currency} {Number(r.amount).toLocaleString()}</span> },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "date", header: "Date", render: (r) => <span className="text-xs text-muted-foreground">{r.date}</span> },
          ]}
        />
      )}
    </div>
  );
}
