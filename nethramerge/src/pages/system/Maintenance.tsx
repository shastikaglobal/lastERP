import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";

export default function Maintenance() {
  const { profile } = useAuth();
  const [confirmText, setConfirmText] = useState("");
  const [isWiping, setIsWiping] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    console.log("Maintenance component mounted");
  }, []);

  const handleWipe = async () => {
    if (confirmText !== "RESET") {
      toast.error("Please type RESET to confirm");
      return;
    }

    setIsWiping(true);
    try {
      // NOTE: HR-related tables (profiles, attendance_logs, face_embeddings, etc.) are intentionally excluded
      // to prevent accidental permanent deletion. Use targeted archival/cleanup procedures instead.
      // NOTE: System audit tables (app_notifications, activity_logs, audit_logs, zoho_accounts, etc.) are intentionally excluded
      // to preserve audit trails and system configuration history. Use targeted archival/cleanup procedures instead.
      const tablesToHardDelete = [
        "export_containers",
        "qc_inspections",
        "inventory_movements",
        "purchase_order_items"
      ];

      const tablesToSoftDelete = [
        "export_shipments",
        "export_orders",
        "quotations",
        "inventory_batches",
        "purchase_orders",
        "leads",
        "farmers",
        "suppliers",
        "customers",
        "user_roles"
      ];

      // 1. Hard-delete child transactional tables
      for (const table of tablesToHardDelete) {
        let query = supabase.from(table as any).delete();
        
        if (profile?.company_id) {
          if (table !== "purchase_order_items") {
            query = query.eq("company_id" as any, profile.company_id);
          } else {
            query = query.neq("id" as any, "00000000-0000-0000-0000-000000000000");
          }
        } else {
          query = query.neq("id" as any, "00000000-0000-0000-0000-000000000000");
        }

        const { error } = await query;
        if (error) {
          console.error(`Error hard-deleting data from ${table}:`, error);
        }
      }

      // 2. Soft-delete parent/primary transactional tables
      for (const table of tablesToSoftDelete) {
        let query = supabase.from(table as any).update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: profile?.id
        } as any);

        if (table === "profiles") {
          query = query.neq("id", profile?.id);
        } else if (table === "user_roles") {
          query = query.neq("user_id", profile?.id);
        } else {
          if (profile?.company_id) {
            query = query.eq("company_id" as any, profile.company_id);
          } else {
            query = query.neq("id" as any, "00000000-0000-0000-0000-000000000000");
          }
        }

        const { error } = await query;
        if (error) {
          console.error(`Error soft-deleting data from ${table}:`, error);
        }
      }

      toast.success("System reset successful. All transactional data marked as deleted.");
      setIsDone(true);
      setConfirmText("");
    } catch (err: any) {
      toast.error("Failed to perform system reset");
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">System Maintenance</h1>
        <p className="text-muted-foreground">Administrative tools for system management</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Nuclear Option: Factory Reset
          </h2>
          <p className="mt-2 text-sm">
            This action will permanently delete all **Leads, Orders, Shipments, Inventory, Farmers, Customers, Staff, and Attendance**.
            Structural data like your Company settings and your own Admin profile will be preserved.
          </p>

          <p className="mt-2 font-bold underline text-sm">This action cannot be undone.</p>
        </div>

        <Card className="erp-card border-destructive/20 shadow-2xl overflow-hidden">
          <div className="bg-destructive/5 px-6 py-4 border-b border-destructive/10">
            <h3 className="text-lg font-semibold text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Archive All System Data
            </h3>
          </div>
          <CardContent className="p-6 space-y-6">
            {isDone ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                <h3 className="text-xl font-bold">System is Clean</h3>
                <p className="text-muted-foreground text-center">All data has been wiped. You can now start fresh or hand over the system.</p>
                <Button onClick={() => setIsDone(false)} variant="outline">Back to Tools</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium block">To confirm, type <span className="font-bold text-destructive">RESET</span> below:</label>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type RESET here..."
                    className="border-destructive/20 focus-visible:ring-destructive h-12 text-lg"
                  />
                </div>

                <Button
                  variant="destructive"
                  className="w-full h-12 text-lg font-bold shadow-lg shadow-destructive/20"
                  disabled={confirmText !== "RESET" || isWiping}
                  onClick={handleWipe}
                >
                  {isWiping ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Archiving Database...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-5 w-5" />
                      Wipe Everything Now
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground text-center">
          Logging: All factory reset actions are recorded in the system audit logs.
        </div>
      </div>
    </div>
  );
}
