import { useState, useEffect } from "react";
import { Check, X, Loader2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/shared/FormShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function QuotationApprovals() {
  const { profile } = useAuth();
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchPending = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/quotations', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch quotations");
      
      const data = await res.json();
      
      // Filter for "Pending" or "In Review" status and match company_id
      const pendingQuots = (data || []).filter((q: any) => 
        ["Pending", "In Review"].includes(q.status) && 
        q.is_deleted !== true &&
        (!profile?.company_id || q.company_id === profile.company_id)
      );
      
      setPending(pendingQuots);
    } catch (err: any) {
      console.error("Error fetching pending quotations:", err);
      toast.error("Failed to load pending approvals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, [profile?.company_id]);

  const handleAction = async (id: string, newStatus: "Approved" | "Rejected") => {
    setActionId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/quotations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          quotation: { status: newStatus }
        })
      });

      if (!res.ok) throw new Error(await res.text() || `Failed to update quotation to ${newStatus}`);
      
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
                        {q.quotation_number} · {q.currency} {Number(q.amount || 0).toLocaleString()}
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
