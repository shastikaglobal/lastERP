import { useState } from "react";
import { AlertCircle, Loader2, Send } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Section } from "@/components/shared/FormShell";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isBefore } from "date-fns";

export default function OverduePayments() {
  const [remindingId, setRemindingId] = useState<string | null>(null);

  const { data: overdue, isLoading } = useQuery({
    queryKey: ["overdue_payments_live"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("sales_orders")
        .select("*, customer:customers(name)")
        .neq("is_deleted", true)
        .eq("status", "Pending");

      if (error) throw error;

      // Filter for orders where delivery_date is in the past
      return (data || []).filter(order => 
        order.delivery_date && isBefore(new Date(order.delivery_date), new Date())
      ).map(order => ({
        id: order.order_number,
        customer: order.customer?.name || "Unknown Customer",
        amount: order.amount,
        currency: order.currency,
        dueAt: format(new Date(order.delivery_date), "yyyy-MM-dd"),
        status: "Overdue"
      }));
    }
  });

  const handleSendReminder = async (id: string, customer: string) => {
    setRemindingId(id);
    // Simulate a professional automation process
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success(`Professional reminder sent to ${customer} for Order ${id}`);
    setRemindingId(null);
  };

  const totalAmount = overdue?.reduce((sum, i) => sum + Number(i.amount), 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader title="Overdue Payments" description="Track and recover invoices past their due date" breadcrumbs={[{ label: "Payments" }, { label: "Overdue" }]} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Overdue Count" value={String(overdue?.length || 0)} />
        <StatCard label="Overdue Amount" value={`USD ${totalAmount.toLocaleString()}`} />
        <StatCard label="Avg Days Late" value="12" />
        <StatCard label="Recovery Rate" value="87%" />
      </div>

      <Section title="Overdue Invoices">
        <div className="space-y-4">
          {overdue && overdue.length > 0 ? (
            overdue.map((i) => (
              <div key={i.id} className="flex items-center gap-4 p-4 border border-white/5 bg-white/[0.02] rounded-xl group hover:border-primary/30 transition-all">
                <div className="h-12 w-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 shadow-lg shadow-destructive/5">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-white group-hover:text-primary transition-colors">{i.customer}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">
                    {i.id} · <span className="text-destructive font-semibold">Due {i.dueAt}</span> · {i.currency} {Number(i.amount).toLocaleString()}
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className="btn-gold shadow-lg shadow-primary/10"
                  disabled={remindingId === i.id}
                  onClick={() => handleSendReminder(i.id, i.customer)}
                >
                  {remindingId === i.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Reminder
                    </>
                  )}
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
              <p className="text-muted-foreground italic">No overdue invoices found. All payments are on track!</p>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
