import { useState, useEffect } from "react";
import { Check, X, Loader2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/shared/FormShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function QuotationApprovals() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchPending = async () => {
    try {
      const { data, error } = await supabase
        .from("quotations")
        .select(`
          *,
          customers (name)
        `)
        .in("status", ["Pending", "In Review"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPending(data || []);
    } catch (err: any) {
      console.error("Error fetching pending quotations:", err);
      toast.error("Failed to load pending approvals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async (id: string, newStatus: "Approved" | "Rejected") => {
    setActionId(id);
    try {
      const { error } = await supabase
        .from("quotations")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      
      setPending(prev => prev.filter(q => q.id !== id));
      toast.success(`Quotation ${newStatus.toLowerCase()} successfully`);
    } catch (err: any) {
      console.error(`Error ${newStatus.toLowerCase()} quotation:`, err);
      toast.error(`Failed to ${newStatus.toLowerCase()} quotation`);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      <PageHeader 
        title="Approval Workflow" 
        description="Quotations awaiting your sign-off" 
        breadcrumbs={[{ label: "Quotations", to: "/quotations" }, { label: "Approvals" }]} 
      />
      
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Section title={`${pending.length} pending approvals`}>
          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed border-border rounded-lg text-muted-foreground">
              <AlertCircle className="h-10 w-10 mb-2 opacity-20" />
              <p>No quotations awaiting approval</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((q) => (
                <div key={q.id} className="flex items-center justify-between gap-3 p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                      {q.currency}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{q.customers?.name || "Unknown Customer"}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {q.quotation_number} · {q.currency} {Number(q.total_amount || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={q.status} />
                    <div className="flex items-center gap-2 ml-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive hover:bg-destructive/5"
                        disabled={actionId === q.id}
                        onClick={() => handleAction(q.id, "Rejected")}
                      >
                        {actionId === q.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5 mr-1" />}
                        Reject
                      </Button>
                      <Button 
                        size="sm"
                        disabled={actionId === q.id}
                        onClick={() => handleAction(q.id, "Approved")}
                      >
                        {actionId === q.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
