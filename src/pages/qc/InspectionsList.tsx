import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2, ClipboardCheck, Edit } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useCan } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function InspectionsList() {
  const nav = useNavigate();
  const can = useCan();
  const qc = useQueryClient();

  const [editingInspection, setEditingInspection] = useState<any>(null);
  const [moisture, setMoisture] = useState("");
  const [foreign, setForeign] = useState("");
  const [broken, setBroken] = useState("");
  const [grade, setGrade] = useState("A");
  const [result, setResult] = useState("pending");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["qc_inspections"],
    queryFn: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/inventory/qc_inspections/with-batch', {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch inspections');
        return await res.json();
      } catch (err) {
        console.error('Error fetching inspections:', err);
        return [];
      }
    },
  });
  
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (statusFilter === "all") return data;
    return data.filter((item: any) => item.result === statusFilter);
  }, [data, statusFilter]);

  const handleOpenEdit = (inspection: any) => {
    setEditingInspection(inspection);
    setMoisture(inspection.moisture_pct != null ? String(inspection.moisture_pct) : "");
    setForeign(inspection.foreign_matter_pct != null ? String(inspection.foreign_matter_pct) : "");
    setBroken(inspection.broken_pct != null ? String(inspection.broken_pct) : "");
    setGrade(inspection.grade || "A");
    setResult(inspection.result || "pending");
    setNotes(inspection.lab_notes || "");
  };

  const handleSaveEdit = async () => {
    if (!editingInspection) return;
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/inventory/qc_inspections/${editingInspection.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          moisture_pct: moisture ? Number(moisture) : null,
          foreign_matter_pct: foreign ? Number(foreign) : null,
          broken_pct: broken ? Number(broken) : null,
          grade,
          result,
          lab_notes: notes || null
        })
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Failed to update inspection");
      }

      toast.success("Inspection updated successfully!");
      setEditingInspection(null);
      qc.invalidateQueries({ queryKey: ["qc_inspections"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update inspection");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Quality Inspections"
        description="QC grading & lab results"
        breadcrumbs={[{ label: "Quality Control" }, { label: "Inspections" }]}
        actions={
          can("qc.inspect") && (
            <Button size="sm" onClick={() => nav("/qc/inspections/create")}>
              <Plus className="h-4 w-4 mr-1.5" /> New inspection
            </Button>
          )
        }
      />
      {isLoading ? (
        <div className="erp-card flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="h-5 w-5" />}
          title="No inspections yet"
          description="Record QC results for inventory batches awaiting approval."
          action={can("qc.inspect") && <Button size="sm" onClick={() => nav("/qc/inspections/create")}><Plus className="h-4 w-4 mr-1.5" /> New inspection</Button>}
        />
      ) : (
        <DataTable
          data={filteredData}
          searchKeys={["id", "batch_lot_number", "product_name", "result"] as any}
          toolbar={
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium mr-1">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10 text-white">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
          columns={[
            { key: "lot", header: "Lot", render: (r: any) => <span className="font-mono text-xs">{r.batch?.lot_number || "—"}</span> },
            { key: "product", header: "Product", render: (r: any) => <span className="font-medium">{r.batch?.product?.name || "—"}</span> },
            { key: "date", header: "Inspected", render: (r: any) => <span className="text-sm">{new Date(r.inspected_at).toLocaleString()}</span> },
            { key: "moisture", header: "Moisture %", render: (r: any) => <span className="tabular-nums">{r.moisture_pct ?? "—"}</span> },
            { key: "grade", header: "Grade", render: (r: any) => <span className="font-medium">{r.grade || "—"}</span> },
            { key: "result", header: "Result", render: (r: any) => <StatusBadge status={r.result} /> },
            {
              key: "actions",
              header: "Actions",
              render: (r: any) => (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2"
                  onClick={() => handleOpenEdit(r)}
                >
                  <Edit className="h-4 w-4 mr-1" /> Edit
                </Button>
              )
            }
          ]}
        />
      )}

      {editingInspection && (
        <Dialog open={!!editingInspection} onOpenChange={(open) => !open && setEditingInspection(null)}>
          <DialogContent className="max-w-md bg-card border-border text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-primary">
                Edit QC Inspection for Lot {editingInspection.batch?.lot_number || ""}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Moisture %</Label>
                  <Input type="number" step="0.01" value={moisture} onChange={e => setMoisture(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Foreign %</Label>
                  <Input type="number" step="0.01" value={foreign} onChange={e => setForeign(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Broken %</Label>
                  <Input type="number" step="0.01" value={broken} onChange={e => setBroken(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Grade</Label>
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-white/10 text-white">
                      <SelectItem value="A">A — Premium</SelectItem>
                      <SelectItem value="B">B — Standard</SelectItem>
                      <SelectItem value="C">C — Below standard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Result</Label>
                  <Select value={result} onValueChange={setResult}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-white/10 text-white">
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Lab Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Notes from quality lab..." />
              </div>
            </div>
            <DialogFooter className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingInspection(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}