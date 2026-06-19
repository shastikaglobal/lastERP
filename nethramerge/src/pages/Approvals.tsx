import { useEffect, useState } from "react";
import { Loader2, Check, X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useCanManageApprovals } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  requested_role: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
};

// ✅ Removed: bd, marketing | Added: warehouse, shipment
const ROLE_OPTIONS = [
  { slug: "admin", name: "Admin" },
  { slug: "manager", name: "Manager" },
  { slug: "secretary", name: "Secretary" },
  { slug: "hr", name: "HR" },
  { slug: "accounts", name: "Accounts" },
  { slug: "operations", name: "Operations" },
  { slug: "procurement", name: "Procurement" },
  { slug: "warehouse", name: "Warehouse" },
  { slug: "shipment", name: "Shipment" },
  { slug: "qc", name: "QC" },
  { slug: "bde", name: "BDE" },
  { slug: "digital_marketing", name: "Digital Marketing" },
  { slug: "software_dev", name: "Software Dev" },
  { slug: "net_security", name: "Net & Security" },
  { slug: "data_analyst", name: "Data Analyst" },
  { slug: "employee", name: "Employee" },
];

export default function Approvals() {
  const { roleSlugs } = useAuth();
  const canManageApprovals = useCanManageApprovals();
  const slugs = Array.from(roleSlugs).map(s => s.toLowerCase());
  const canAction = slugs.includes("admin") || slugs.includes("manager") || slugs.includes("secretary");
  const showColumns = canAction;
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRoleSel, setPendingRoleSel] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");
      const res = await fetch('/api/employees/all/profiles', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch profiles");
      const data = await res.json();
      setRows(data || []);
    } catch (err: any) {
      toast.error(err.message || "Error fetching profiles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (!canManageApprovals) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-5 animate-in fade-in zoom-in duration-500">
        <div className="h-20 w-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center ring-8 ring-destructive/5">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Access Denied</h2>
          <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
            You do not have the required permissions to view or manage user approvals. Please contact your system administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  const approve = async (r: ProfileRow) => {
    const role = pendingRoleSel[r.id] || r.requested_role || "bde";
    setBusyId(r.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/employees/all/profiles/${r.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ status: 'approved', requested_role: role })
      });
      if (!res.ok) throw new Error("Failed to approve");
      toast.success(`${r.email} approved as ${role}`);
      load();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (r: ProfileRow) => {
    const reason = window.prompt(`Reject ${r.email}? Optional reason:`) ?? null;
    if (reason === null) return;
    setBusyId(r.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/employees/all/profiles/${r.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ status: 'rejected', rejection_reason: reason })
      });
      if (!res.ok) throw new Error("Failed to reject");
      toast.success(`${r.email} rejected`);
      load();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusyId(null);
    }
  };

  const pending = rows.filter((r) => r.status === "pending");
  const approved = rows.filter((r) => r.status === "approved");
  const rejected = rows.filter((r) => r.status === "rejected");

  const changeRole = async (r: ProfileRow) => {
    const role = pendingRoleSel[r.id];
    if (!role) {
      toast.error("Please select a new role first.");
      return;
    }
    if (role === r.requested_role) {
      toast.info("This is already the current role. Select a different one.");
      return;
    }
    setBusyId(r.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/employees/all/profiles/${r.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ requested_role: role })
      });
      if (!res.ok) throw new Error("Failed to change role");
      toast.success(`✅ ${r.full_name || r.email} role changed to ${role.toUpperCase()}`);
      setPendingRoleSel(p => { const n = { ...p }; delete n[r.id]; return n; });
      load();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusyId(null);
    }
  };

  const renderTable = (list: ProfileRow[], showActions = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Requested Role</TableHead>
          <TableHead>Status</TableHead>
          {showActions && <TableHead className="text-right">Action</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.length === 0 && (
          <TableRow>
            <TableCell colSpan={showActions ? 6 : 5} className="text-center text-sm text-muted-foreground py-8">
              No records
            </TableCell>
          </TableRow>
        )}
        {list.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.full_name || "—"}</TableCell>
            <TableCell className="text-sm">{r.email}</TableCell>
            <TableCell className="text-sm">{r.phone || "—"}</TableCell>
            <TableCell>{r.requested_role || <span className="text-muted-foreground text-sm">—</span>}</TableCell>
            <TableCell>
              <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                {r.status}
              </Badge>
            </TableCell>
            {showActions && (
              <TableCell className="text-right">
                {canAction && (
                  <div className="flex items-center justify-end gap-2">
                    <Select
                      value={pendingRoleSel[r.id] || r.requested_role || "bde"}
                      onValueChange={(v) => setPendingRoleSel((p) => ({ ...p, [r.id]: v }))}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((rOpt) => (
                          <SelectItem key={rOpt.slug} value={rOpt.slug}>{rOpt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => approve(r)} disabled={busyId === r.id}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reject(r)} disabled={busyId === r.id}>
                      <X className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="User Approvals"
        description="Approve or reject employee registrations and assign their role."
      />
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="erp-card p-2">
            {renderTable(pending, showColumns)}
          </TabsContent>
          <TabsContent value="approved" className="erp-card p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  {showColumns && <TableHead className="text-right">Change Role</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {approved.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={showColumns ? 5 : 4} className="text-center text-sm text-muted-foreground py-8">
                      No records
                    </TableCell>
                  </TableRow>
                )}
                {approved.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.full_name || "—"}</TableCell>
                    <TableCell className="text-sm">{r.email}</TableCell>
                    <TableCell className="text-sm">{r.phone || "—"}</TableCell>
                    <TableCell><Badge variant="default">{r.status}</Badge></TableCell>
                    {showColumns && (
                      <TableCell className="text-right">
                        {canAction && (
                          <div className="flex items-center justify-end gap-2">
                            <div className="text-xs text-muted-foreground mr-1">
                              Current: <span className="font-semibold text-foreground">{r.requested_role?.toUpperCase() || 'NONE'}</span>
                            </div>
                            <Select
                              value={pendingRoleSel[r.id] || ""}
                              onValueChange={(v) => setPendingRoleSel((p) => ({ ...p, [r.id]: v }))}
                            >
                              <SelectTrigger className="w-36 h-8 text-xs">
                                <SelectValue placeholder="Select new role" />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_OPTIONS.map((rOpt) => (
                                  <SelectItem key={rOpt.slug} value={rOpt.slug}>{rOpt.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => changeRole(r)}
                              disabled={busyId === r.id || !pendingRoleSel[r.id]}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              {pendingRoleSel[r.id] ? `Set ${pendingRoleSel[r.id].toUpperCase()}` : 'Change'}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="rejected" className="erp-card p-2">
            {renderTable(rejected)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}