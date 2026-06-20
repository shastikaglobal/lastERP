import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Lead = {
  id: string;
  company_name: string;
  contact_name: string;
  country: string;
  interested_product: string;
  product_type?: string | null;
  stage: string;
};

const STAGES = [
  { id: "New", label: "New", color: "bg-slate-500" },
  { id: "Contacted", label: "Contacted", color: "bg-blue-400" },
  { id: "Qualified", label: "Qualified", color: "bg-purple-500" },
  { id: "Proposal", label: "Proposal", color: "bg-orange-500" },
  { id: "Negotiation", label: "Negotiation", color: "bg-yellow-500" },
  { id: "Nurturing", label: "Nurturing", color: "bg-cyan-500" },
  { id: "Won", label: "Won", color: "bg-emerald-500" },
  { id: "Lost", label: "Lost", color: "bg-rose-500" }
];

export default function LeadPipeline() {
  const { roleSlugs } = useAuth();
  const canEditStage = ["admin", "manager", "bde"].some((r) => roleSlugs.has(r));
  const [leads, setLeads] = useState<Lead[]>([]);

  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");
      const res = await fetch('/api/leads', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch pipeline data");
      const data = await res.json();
      const activeLeads = (data || []).filter((l: any) => !l.is_deleted);
      setLeads(activeLeads as Lead[]);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch pipeline data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    
    // Add realtime subscription for leads
    const channel = supabase
      .channel('pipeline-leads-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateLeadStage = async (id: string, newStage: string) => {
    // Optimistic update
    const previousLeads = [...leads];
    setLeads(leads.map(lead => lead.id === id ? { ...lead, stage: newStage } : lead));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ stage: newStage })
      });

      if (!res.ok) throw new Error("Failed to update stage");
      toast.success("Stage updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update stage");
      setLeads(previousLeads); // Rollback
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Sales Pipeline</h1>
      
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max h-full">
          {STAGES.map((stage) => {
            const stageLeads = leads.filter((l) => {
              const s = l.stage?.toLowerCase() ?? "";
              if (stage.id === "Won") {
                return s === "won" || s === "client successfully acquired";
              }
              // Use includes to match stages like "Proposal" or "Nurturing" even if stored with extra text or spacing
              return s.includes(stage.id.toLowerCase());
            });
            
            return (
              <div key={stage.id} className="w-80 flex flex-col bg-muted/30 rounded-lg border border-border/50">
                <div className="p-3 border-b flex items-center justify-between bg-card rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                    <h3 className="font-semibold">{stage.label}</h3>
                  </div>
                  <Badge variant="secondary">{stageLeads.length}</Badge>
                </div>
                
                <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[200px]">
                  {stageLeads.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-md">
                      No leads
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <Card key={lead.id} className="shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-base font-semibold">{lead.company_name}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                          <div className="text-sm text-muted-foreground space-y-1">
                            {lead.contact_name && <div>👤 {lead.contact_name}</div>}
                            {lead.country && <div>🌍 {lead.country}</div>}
                            {(lead.interested_product || lead.product_type) && <div>📦 {lead.interested_product || lead.product_type}</div>}
                          </div>
                          
                          {canEditStage ? (
                            <Select
                              value={lead.stage === "Client Successfully Acquired" ? "Won" : lead.stage}
                              onValueChange={(val) => updateLeadStage(lead.id, val)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STAGES.map((s) => (
                                  <SelectItem key={s.id} value={s.id} className="text-xs">
                                    Move to {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="secondary" className="w-full justify-center text-[10px] h-6">
                              {lead.stage === "Client Successfully Acquired" ? "Won" : lead.stage}
                            </Badge>
                          )}

                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
