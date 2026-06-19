import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Coins, Edit } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DEFAULT_RATES: Record<string, number> = {
  "USD": 83.50,
  "EUR": 90.65,
  "GBP": 105.78,
  "JPY": 0.55,
  "INR": 1.000,
  "CAD": 61.20,
};

const CURRENCY_NAMES: Record<string, string> = {
  "USD": "US Dollar",
  "EUR": "Euro",
  "GBP": "British Pound",
  "JPY": "Japanese Yen",
  "INR": "Indian Rupee",
  "CAD": "Canadian Dollar",
};

export default function Ledger() {
  const { profile } = useAuth();
  
  const [rates, setRates] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem("ledger_exchange_rates");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to parse exchange rates from localStorage", e);
    }
    return DEFAULT_RATES;
  });

  const [editingCurrency, setEditingCurrency] = useState<string | null>(null);
  const [editingRateValue, setEditingRateValue] = useState("");

  const { data: ledger, isLoading } = useQuery({
    queryKey: ["currency_ledger_live", profile?.company_id, rates],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("amount, currency")
        .neq("is_deleted", true)
        .eq("company_id", profile.company_id)
        .eq("status", "Completed");

      if (error) throw error;

      // Group by currency
      const balances: Record<string, number> = {
        "USD": 0, "EUR": 0, "GBP": 0, "JPY": 0, "INR": 0, "CAD": 0
      };

      (data || []).forEach(p => {
        if (balances[p.currency] !== undefined) {
          balances[p.currency] += Number(p.amount);
        } else {
          balances[p.currency] = Number(p.amount);
        }
      });

      return Object.entries(balances).map(([code, bal]) => ({
        id: code,
        name: CURRENCY_NAMES[code] || code,
        rate: rates[code] || 1.0,
        balance: bal
      })).filter(item => item.balance >= 0); // Show all even if 0 for professional look
    }
  });

  const handleOpenEdit = (code: string, currentRate: number) => {
    setEditingCurrency(code);
    setEditingRateValue(String(currentRate));
  };

  const handleSaveRate = () => {
    if (!editingCurrency) return;
    const num = Number(editingRateValue);
    if (isNaN(num) || num <= 0) {
      toast.error("Please enter a valid rate greater than 0");
      return;
    }

    const updatedRates = { ...rates, [editingCurrency]: num };
    setRates(updatedRates);
    localStorage.setItem("ledger_exchange_rates", JSON.stringify(updatedRates));
    setEditingCurrency(null);
    toast.success(`Exchange rate for ${editingCurrency} updated successfully!`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader title="Multi-Currency Ledger" description="Real-time balances converted to Indian Rupee (INR)" breadcrumbs={[{ label: "Payments" }, { label: "Ledger" }]} />
      
      {!ledger || ledger.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-white/10 rounded-xl">
          <Coins className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
          <h3 className="text-lg font-medium">No ledger data available</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
            Register your first completed payment to see currency balances here.
          </p>
        </div>
      ) : (
        <DataTable
          data={ledger}
          searchKeys={["id", "name"]}
          columns={[
            { key: "id", header: "Code", render: (r) => <span className="font-mono font-bold text-primary">{r.id}</span> },
            { key: "name", header: "Currency", render: (r) => <span className="font-medium text-white">{r.name}</span> },
            { key: "rate", header: "Rate (INR)", render: (r) => <span className="tabular-nums text-muted-foreground font-mono">1.00 = ₹{r.rate.toFixed(2)}</span> },
            { key: "bal", header: "Balance", render: (r) => <span className="tabular-nums font-bold text-white">{r.id} {r.balance.toLocaleString()}</span> },
            { key: "inr", header: "INR Equivalent", render: (r) => <span className="tabular-nums font-bold text-gradient-gold text-lg">₹{(r.balance * r.rate).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> },
            {
              key: "actions",
              header: "Actions",
              render: (r) => (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2"
                  onClick={() => handleOpenEdit(r.id, r.rate)}
                >
                  <Edit className="h-4 w-4 mr-1" /> Edit Rate
                </Button>
              )
            }
          ]}
        />
      )}

      {editingCurrency && (
        <Dialog open={!!editingCurrency} onOpenChange={(open) => !open && setEditingCurrency(null)}>
          <DialogContent className="max-w-md bg-card border-border text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-primary">Edit Exchange Rate ({editingCurrency})</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Rate to INR (₹)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={editingRateValue}
                  onChange={e => setEditingRateValue(e.target.value)}
                  placeholder="e.g. 83.50"
                />
              </div>
            </div>
            <DialogFooter className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingCurrency(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveRate}>
                Save Rate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
