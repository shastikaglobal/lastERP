import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2, Sprout, Pencil, Trash2, UserCheck } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useCan } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FormGrid, FormRow } from "@/components/shared/FormShell";

type Farmer = {
  id: string;
  code: string | null;
  full_name: string;
  phone: string | null;
  village: string | null;
  district: string | null;
  state: string | null;
  primary_crops: string[] | null;
  is_active: boolean;
  created_at: string;
};

export default function FarmersList() {
  const nav = useNavigate();
  const can = useCan();
  const qc = useQueryClient();
  const canConvert = can("farmers.manage");
  
  const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null);
  const [deletingFarmer, setDeletingFarmer] = useState<Farmer | null>(null);
  const [busy, setBusy] = useState(false);
  const [editForm, setEditForm] = useState({
    code: "",
    full_name: "",
    phone: "",
    village: "",
    district: "",
    state: "",
    primary_crops: "",
    is_active: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["farmers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farmers")
        .select("id, code, full_name, phone, village, district, state, primary_crops, is_active, created_at")
        .neq("is_deleted", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Farmer[];
    },
  });

  const handleEditClick = (e: React.MouseEvent, f: Farmer) => {
    e.stopPropagation();
    setEditingFarmer(f);
    setEditForm({
      code: f.code || "",
      full_name: f.full_name || "",
      phone: f.phone || "",
      village: f.village || "",
      district: f.district || "",
      state: f.state || "",
      primary_crops: (f.primary_crops || []).join(", "),
      is_active: f.is_active,
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFarmer) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("farmers").update({
        code: editForm.code || null,
        full_name: editForm.full_name,
        phone: editForm.phone || null,
        village: editForm.village || null,
        district: editForm.district || null,
        state: editForm.state || null,
        primary_crops: editForm.primary_crops ? editForm.primary_crops.split(",").map(s => s.trim()).filter(Boolean) : null,
        is_active: editForm.is_active,
      }).eq("id", editingFarmer.id);
      
      if (error) throw error;
      toast.success("Farmer updated successfully");
      qc.invalidateQueries({ queryKey: ["farmers"] });
      setEditingFarmer(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingFarmer) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('farmers')
        .update({ is_active: false, is_deleted: true })
        .eq('id', deletingFarmer.id);
      
      if (error) throw error;
      toast.success("Farmer deleted successfully");
      qc.invalidateQueries({ queryKey: ["farmers"] });
      setDeletingFarmer(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "code", header: "Code", render: (r: Farmer) => <span className="font-mono text-xs text-muted-foreground">{r.code || "—"}</span> },
    { key: "name", header: "Farmer", render: (r: Farmer) => <span className="font-medium">{r.full_name}</span> },
    { key: "phone", header: "Phone", render: (r: Farmer) => <span className="text-sm text-muted-foreground">{r.phone || "—"}</span> },
    { key: "loc", header: "Location", render: (r: Farmer) => <span className="text-sm">{[r.village, r.district, r.state].filter(Boolean).join(", ") || "—"}</span> },
    { key: "crops", header: "Crops", render: (r: Farmer) => <span className="text-xs text-muted-foreground">{(r.primary_crops || []).join(", ") || "—"}</span> },
    { key: "status", header: "Status", render: (r: Farmer) => <StatusBadge status={r.is_active ? "Active" : "Inactive"} /> },
    {
      key: "actions",
      header: "Action",
      className: "text-right",
      render: (r: Farmer) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={(e) => handleEditClick(e, r)}
            title="Edit Farmer"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          
          <Button
            size="xs"
            variant="secondary"
            onClick={(event) => {
              event.stopPropagation();
              nav(`/farmers/convert?id=${r.id}`);
            }}
            title="Convert to Customer"
          >
            <UserCheck className="h-4 w-4 mr-1 lg:hidden" />
            <span className="hidden lg:inline">Convert to Customer</span>
          </Button>
          
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); setDeletingFarmer(r); }}
            title="Delete Farmer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Farmers"
        description="Master database of farmer suppliers"
        breadcrumbs={[{ label: "Farmers" }]}
        actions={
          can("farmers.create") && (
            <Button size="sm" onClick={() => nav("/farmers/create")}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Farmer
            </Button>
          )
        }
      />

      {isLoading ? (
        <div className="erp-card flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<Sprout className="h-5 w-5" />}
          title="No farmers yet"
          description="Add your first farmer supplier to start procuring produce."
          action={
            can("farmers.create") && (
              <Button size="sm" onClick={() => nav("/farmers/create")}>
                <Plus className="h-4 w-4 mr-1.5" /> Add Farmer
              </Button>
            )
          }
        />
      ) : (
        <DataTable
          data={data}
          searchKeys={["full_name", "code", "village", "district"]}
          onRowClick={(r) => nav(`/farmers/${r.id}`)}
          columns={columns}
        />
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingFarmer} onOpenChange={(o) => !o && setEditingFarmer(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Farmer</DialogTitle>
              <DialogDescription>Update details for {editingFarmer?.full_name}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <FormGrid cols={2}>
                <FormRow label="Code"><Input value={editForm.code} onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))} /></FormRow>
                <FormRow label="Full Name" required><Input required value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} /></FormRow>
                <FormRow label="Phone"><Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></FormRow>
                <FormRow label="Crops"><Input value={editForm.primary_crops} onChange={e => setEditForm(f => ({ ...f, primary_crops: e.target.value }))} placeholder="Comma separated" /></FormRow>
                <FormRow label="Village"><Input value={editForm.village} onChange={e => setEditForm(f => ({ ...f, village: e.target.value }))} /></FormRow>
                <FormRow label="District"><Input value={editForm.district} onChange={e => setEditForm(f => ({ ...f, district: e.target.value }))} /></FormRow>
                <FormRow label="State"><Input value={editForm.state} onChange={e => setEditForm(f => ({ ...f, state: e.target.value }))} /></FormRow>
                <FormRow label="Status">
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={editForm.is_active ? "true" : "false"}
                    onChange={(e) => setEditForm(f => ({ ...f, is_active: e.target.value === "true" }))}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </FormRow>
              </FormGrid>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingFarmer(null)} disabled={busy}>Cancel</Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deletingFarmer} onOpenChange={(o) => !o && setDeletingFarmer(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Farmer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the farmer <strong>{deletingFarmer?.full_name}</strong>? This action will hide them from the list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setDeletingFarmer(null)} disabled={busy}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
