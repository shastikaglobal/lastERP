import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section } from "@/components/shared/FormShell";
import { toast } from "sonner";
import Approvals from "@/pages/Approvals";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const SECTION_MAPPING: Record<string, string[]> = {
  "DASHBOARDS": ["Executive & Activities", "Sales Analytics", "Shipment Analytics", "Financial Overview", "Employee Productivity", "Roles & Permissions"],
  "FARMERS": ["Farmers List", "Create Farmer"],
  "CRM": ["Dashboard", "Leads", "Pipelines", "Follow-Ups", "Communication", "Client Acquisition", "Successful Conversation", "Client Success", "Customer Database", "Task", "Report", "Mail Box"],
  "REVENUE & PERFORMANCE ANALYTICS": ["Performance", "Revenue Analytics"],
  "MOBILE CRM": ["Mobile Login", "Push Notifications", "Call Logging", "GPS Tracking", "IP Tracking", "Device Authorization"],
  "PROCUREMENT": ["Dashboard", "Purchase Orders", "Suppliers"],
  "WAREHOUSE & INVENTORY": ["Dashboard", "Receiving Goods", "Available Stock Management", "Reserved Stock Tracking", "Export Ready Inventory", "Batch-wise Stock Tracking", "Damaged Stock Management", "Expiry Monitoring", "Multi-Warehouse Management", "Packing Management", "Inspection", "New Inspection", "Approvals", "WH Quality Control", "Container Loading", "Dispatch", "Shipment Register", "Create Shipment", "Container Tracking", "Delivery Status", "Barcodes", "Generate QR", "Scan", "Quotations", "Create Quotation", "Convert to Order", "Orders", "Create Order", "Status Tracking", "Fulfillment", "Invoices", "Packing Lists", "Certificate of Origin", "Document Viewer"],
  "REPORTS & ANALYTICS": ["Stock Summary", "Batch Tracking", "Dispatch Report", "Container Loading", "Damage/Wastage", "Inventory Aging", "Export Ready Stock"],
  "FINANCE": ["Payment Register", "Overdue", "Multi-Currency Ledger", "Financial Reports"],
  "TALLY": ["Tally Module", "Counts"],
  "ACCOUNTS": ["Journal Entry", "Ledger", "Trial Balance"],
  "REPORTS": ["GST Reports", "P&L Statement", "Balance Sheet"],
  "MASTERS": ["Parties", "Chart of Accounts"],
  "HR & EMPLOYEES": ["Directory", "Attendance", "Salary Report", "Face Attendance", "Register Face"],
  "SYSTEM": ["Notifications", "Activity Logs", "Subscriptions", "Settings", "Zoho Integration", "System Reset"]
};

// Flatten subsections for easy looping inside rows
const allSubsections = Object.entries(SECTION_MAPPING).flatMap(([section, subs]) => 
  subs.map(sub => ({ section, sub }))
);

type Profile = { 
  id: string; 
  full_name: string | null; 
  email: string | null; 
  employeeRole?: string; // from employees table
};

export default function RolesPermissions() {
  const { profile, roleSlugs, session } = useAuth();
  const slugs = Array.from(roleSlugs).map(s => s.toLowerCase());
  const canManageRoles = slugs.includes("admin") || slugs.includes("manager") || slugs.includes("secretary");
  const isAdmin = slugs.includes("admin");

  const [loading, setLoading] = useState(true);

  // --- Dynamic Matrix State ---
  const [users, setUsers] = useState<Profile[]>([]);
  const [dynamicAccessMap, setDynamicAccessMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (session?.access_token) {
      loadData();
    }
  }, [session?.access_token]);

  // Subscribe to Supabase realtime changes on user_permissions to refresh UI
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel('sidebar-permissions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_permissions' }, (payload) => {
          console.log('Realtime permission change detected, re-fetching...', payload);
          setTimeout(() => loadData(), 500);
        })
        .subscribe();
    } catch (err) {
      console.warn('Could not subscribe to realtime permissions:', err);
    }
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [session?.access_token]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('Fetching users from /api/employees/all/profiles...');
      // --- Fetching Users ---
      const usersRes = await fetch('/api/employees/all/profiles', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      if (!usersRes.ok) {
        console.error('Failed to load users:', await usersRes.text());
        throw new Error('Failed to load users from /api/employees/all/profiles');
      }
      const dbUsers = await usersRes.json();
      console.log('Fetched users count:', dbUsers?.length);

      console.log('Fetching employees for role mapping...');
      // Fetch employees to map roles
      const employeesRes = await fetch('/api/employees', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      if (!employeesRes.ok) {
         console.warn('Failed to load employees, continuing without mapping:', await employeesRes.text());
      }
      const dbEmployees = employeesRes.ok ? await employeesRes.json() : [];

      const mappedUsers = (dbUsers || []).map((u: any) => {
        return {
          ...u,
          employeeRole: u.requested_role || "User"
        };
      });
      setUsers(mappedUsers);

      console.log('Fetching permissions from /api/user-permissions...');
      // --- Fetching Access ---
      const permsRes = await fetch('/api/user-permissions', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      if (!permsRes.ok) {
        console.error('Failed to load permissions:', await permsRes.text());
        throw new Error('Failed to load permissions from /api/user-permissions');
      }
      const dpData = await permsRes.json();
      console.log('Fetched permissions data:', dpData?.length);

      const newDynamicMap: Record<string, boolean> = {};
      if (dpData) {
        dpData.forEach((p: any) => {
          if (Array.isArray(p.permissions)) {
            p.permissions.forEach((perm: any) => {
              if (perm.has_access) {
                newDynamicMap[`${p.id}_${perm.section}`] = true;
              }
            });
          }
        });
      }
      setDynamicAccessMap(newDynamicMap);
      console.log('Roles list init done.');

    } catch (e: any) {
      console.error('loadData error in RolesPermissions:', e);
      toast.error("Error loading data: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const [savingBulk, setSavingBulk] = useState(false);

  const toggleDynamicAccess = async (userId: string, subsection: string) => {
    if (!isAdmin) {
      toast.error("Only Administrators can modify user permissions.");
      return;
    }
    
    const currentVal = !!dynamicAccessMap[`${userId}_${subsection}`];
    const newVal = !currentVal;
    
    setDynamicAccessMap(prev => ({
      ...prev,
      [`${userId}_${subsection}`]: newVal
    }));

    try {
      const saveRes = await fetch('/api/user-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          section: subsection,
          has_access: newVal,
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok || saveData.error) {
        throw new Error(saveData.error || 'Failed to save permission');
      }
      toast.success(`Permission ${newVal ? 'granted' : 'revoked'} for ${subsection}`);
    } catch (err: any) {
      console.error('Save permission error:', err);
      // Revert UI automatically if failure happens
      setDynamicAccessMap(prev => ({
        ...prev,
        [`${userId}_${subsection}`]: currentVal
      }));
      toast.error("Failed to update user permission: " + err.message);
    }
  };

  const toggleSectionForAll = async (sectionName: string, subs: string[]) => {
    if (!isAdmin) {
      toast.error("Only Administrators can modify user permissions.");
      return;
    }
    
    // Check if any are missing. If so, we grant all. If all granted, we revoke all.
    let anyMissing = false;
    users.forEach(u => {
      subs.forEach(sub => {
        if (!dynamicAccessMap[`${u.id}_${sub}`]) anyMissing = true;
      });
    });

    const newVal = anyMissing; // if any missing, select all (true). else unselect all (false).
    
    // Optimistically update UI
    setDynamicAccessMap(prev => {
      const next = { ...prev };
      users.forEach(u => {
        subs.forEach(sub => {
          next[`${u.id}_${sub}`] = newVal;
        });
      });
      return next;
    });

    setSavingBulk(true);
    toast.info(`Applying ${newVal ? 'grant' : 'revoke'} to all users for ${sectionName}...`);

    try {
      const promises: Promise<any>[] = [];
      users.forEach(u => {
        subs.forEach(sub => {
          promises.push(
            fetch('/api/user-permissions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({
                user_id: u.id,
                section: sub,
                has_access: newVal,
              }),
            })
          );
        });
      });

      await Promise.all(promises);
      toast.success(`Successfully applied bulk permissions for ${sectionName}.`);
    } catch (err: any) {
      toast.error("Bulk update encountered an error. Reload to verify state.");
    } finally {
      setSavingBulk(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    const r = (role || 'USER').toUpperCase();
    if (r.includes('ADMIN')) return 'bg-red-500/15 text-red-500 border-red-500/30';
    if (r.includes('EMPLOYEE')) return 'bg-blue-500/15 text-blue-500 border-blue-500/30';
    return 'bg-slate-500/15 text-slate-500 border-slate-500/30';
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <PageHeader 
          title="Roles & Permissions" 
          description="Manage systemic role defaults and specific user access." 
          breadcrumbs={[{ label: "Employees" }, { label: "Roles" }]} 
        />
        <Approvals />
      </div>

      {canManageRoles && (
        <>
          <div className="border-t border-border" />
          
          <Section className="p-0 overflow-hidden border border-border shadow-md rounded-xl bg-card">
            <div className="p-6 pb-4 bg-card border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">User Content Permissions</h3>
                <p className="text-sm text-muted-foreground mt-1">Directly grant access to specific navigation modules per user. Changes auto-save securely.</p>
              </div>
              {savingBulk && (
                <div className="flex items-center gap-2 text-sm text-amber-500 font-medium bg-amber-500/10 px-4 py-2 rounded-full">
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving Bulk Changes...
                </div>
              )}
            </div>
            
            <div className="overflow-auto max-h-[70vh] relative custom-scrollbar bg-card">
              <table className="w-full text-sm whitespace-nowrap border-collapse">
                <thead className="sticky top-0 z-30">
                  {/* --- SECTION HEADER ROW --- */}
                  <tr>
                    <th 
                      rowSpan={2} 
                      className="text-left text-xs uppercase tracking-wider font-extrabold text-muted-foreground px-6 py-4 sticky left-0 z-40 bg-card border-b border-r border-border align-bottom shadow-[4px_0_12px_rgba(0,0,0,0.08)]"
                      style={{ minWidth: 260 }}
                    >
                      User Profile
                    </th>
                    {Object.entries(SECTION_MAPPING).map(([section, subs]) => (
                      <th 
                        key={section} 
                        colSpan={subs.length} 
                        className="p-0 border-b border-r border-border"
                      >
                        <div className="flex flex-col h-full bg-primary/10">
                          <div className="flex items-center justify-between px-4 py-3 gap-4">
                            <span className="text-[12px] uppercase tracking-[0.1em] font-extrabold text-primary">
                              {section}
                            </span>
                            <button 
                              onClick={() => toggleSectionForAll(section, subs)}
                              disabled={savingBulk}
                              className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-primary/80 hover:text-primary bg-background/50 hover:bg-background px-2.5 py-1 rounded border border-primary/20 transition-all disabled:opacity-50"
                            >
                              <div className="h-3 w-3 rounded-sm border border-primary/50 flex items-center justify-center">
                                <Check className="h-2 w-2 opacity-50" />
                              </div>
                              Select All
                            </button>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                  {/* --- SUBSECTION HEADER ROW --- */}
                  <tr>
                    {Object.entries(SECTION_MAPPING).map(([section, subs]) => 
                      subs.map(sub => (
                        <th 
                          key={`${section}-${sub}`} 
                          className="text-center text-[11px] uppercase tracking-wider font-semibold text-foreground/80 px-5 py-3 border-b border-r border-border bg-muted/30 backdrop-blur-sm"
                        >
                          {sub}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                     <tr>
                        <td colSpan={allSubsections.length + 1} className="py-12 text-center text-muted-foreground bg-accent/10 italic">
                          No users found. Ensure the users API is running correctly.
                        </td>
                     </tr>
                  ) : (
                    users.map((u, i) => (
                      <tr key={u.id} className={`border-b last:border-0 border-border transition-colors group ${i % 2 === 0 ? 'bg-background' : 'bg-muted/10'} hover:bg-primary/5`}>
                        <td className="px-6 py-4 sticky left-0 z-20 border-r border-border shadow-[4px_0_12px_rgba(0,0,0,0.05)] bg-inherit transition-colors">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="text-[15px] font-bold text-foreground tracking-tight">{u.full_name || 'Unnamed Employee'}</span>
                            <span className={`px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest border ${getRoleBadge(u.employeeRole)}`}>
                              {u.employeeRole || 'USER'}
                            </span>
                          </div>
                        </td>
                        {allSubsections.map(({ section, sub }) => {
                          const hasAccess = dynamicAccessMap[`${u.id}_${sub}`];
                          return (
                            <td 
                              key={`${section}-${sub}`} 
                              className={`text-center px-4 py-3 select-none border-r border-border/40 transition-colors ${isAdmin && !savingBulk ? 'cursor-pointer hover:bg-primary/10' : 'cursor-default opacity-60'}`}
                              onClick={() => { if(!savingBulk) toggleDynamicAccess(u.id, sub); }}
                            >
                              <div className={`mx-auto flex h-6 w-6 items-center justify-center rounded-[6px] border transition-all duration-200 ${hasAccess ? 'bg-amber-500 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] scale-110' : 'border-input bg-background/50 group-hover:border-amber-500/40'}`}>
                                {hasAccess && <Check className="h-4 w-4 text-white stroke-[3.5]" />}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
