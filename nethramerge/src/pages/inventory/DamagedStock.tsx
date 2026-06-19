import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, RefreshCw, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DamagedStock() {
    const queryClient = useQueryClient();

    const { data, isLoading, refetch } = useQuery<any[]>({
        queryKey: ["damaged_inventory"],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from("inventory_batches")
                .select(`
          id, 
          lot_number, 
          quantity_remaining_kg, 
          grade, 
          damaged_notes,
          status,
          product:products(name, sku),
          warehouse:warehouses(name)
        `)
                .eq("status", "damaged")
                .order("updated_at", { ascending: false });

            if (error) throw error;
            return data || [];
        }
    });

    const handleRestore = async (id: string) => {
        try {
            const { error } = await (supabase as any)
                .from("inventory_batches")
                .update({ status: "pending_qc" })
                .eq("id", id);

            if (error) throw error;
            toast.success("Batch moved back to QC for re-evaluation");
            queryClient.invalidateQueries({ queryKey: ["damaged_inventory"] });
        } catch (err: any) {
            toast.error(err.message || "Failed to restore batch");
        }
    };

    return (
        <div className="p-6">
            <PageHeader
                title="Damaged Stock Quarantine"
                description="Batches flagged for review or disposal"
                breadcrumbs={[{ label: "Inventory" }, { label: "Damaged Stock" }]}
                actions={
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                    </Button>
                }
            />

            <div className="mt-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                    </div>
                ) : !data || data.length === 0 ? (
                    <EmptyState
                        icon={<AlertCircle className="h-12 w-12 text-muted-foreground opacity-20" />}
                        title="Clean Slate"
                        description="No batches are currently flagged as damaged. Good job!"
                    />
                ) : (
                    <DataTable
                        data={data}
                        searchKeys={["lot_number", "product.name"]}
                        columns={[
                            {
                                key: "batch",
                                header: "Lot # / Product",
                                render: (r: any) => (
                                    <div className="flex flex-col">
                                        <span className="font-mono text-xs font-bold text-red-400">{r.lot_number}</span>
                                        <span className="font-semibold text-sm">{r.product?.name}</span>
                                    </div>
                                )
                            },
                            {
                                key: "wh",
                                header: "Location",
                                render: (r: any) => <span className="text-xs text-muted-foreground">{r.warehouse?.name || "—"}</span>
                            },
                            {
                                key: "qty",
                                header: "Damaged Qty (kg)",
                                render: (r: any) => <span className="tabular-nums font-bold text-red-500">{Number(r.quantity_remaining_kg).toLocaleString()}</span>
                            },
                            {
                                key: "notes",
                                header: "Damage Reason / Notes",
                                render: (r: any) => <span className="text-xs italic text-muted-foreground">{r.damaged_notes || "No notes provided"}</span>
                            },
                            {
                                key: "actions",
                                header: "",
                                render: (r: any) => (
                                    <div className="flex gap-2 justify-end">
                                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold" onClick={() => handleRestore(r.id)}>
                                            MOVE TO QC
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10" title="Dispose / Delete">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )
                            },
                        ]}
                    />
                )}
            </div>
        </div>
    );
}
