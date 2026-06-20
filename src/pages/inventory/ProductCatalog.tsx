import { useNavigate } from "react-router-dom";
import { Plus, Loader2, PackageOpen, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function ProductCatalog() {
  const nav = useNavigate();
  const queryClient = useQueryClient();

  const { profile } = useAuth();

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete this product? This will hide it from the app.")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to delete product");
      toast.success("Product hidden successfully");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product");
    }
  };

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/products", {
        headers: { "Authorization": `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json() as Promise<any[]>;
    },
  });
  return (
    <div>
      <PageHeader title="Product Catalog" description="All export-ready products" breadcrumbs={[{ label: "Inventory" }, { label: "Products" }]}
        actions={<Button size="sm" onClick={() => nav("/inventory/products/create")}><Plus className="h-4 w-4 mr-1.5" />New Product</Button>} />
      {isLoading ? (
        <div className="erp-card flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !products || products.length === 0 ? (
        <EmptyState
          icon={<PackageOpen className="h-5 w-5" />}
          title="No products found"
          description="You haven't added any products to your catalog yet."
          action={
            <Button size="sm" className="btn-gold" onClick={() => nav("/inventory/products/create")}>
              <Plus className="h-4 w-4 mr-1.5" /> New Product
            </Button>
          }
        />
      ) : (
        <DataTable
          data={products}
          searchKeys={["sku", "name", "category"]}
          columns={[
            { key: "sku", header: "SKU", render: (r) => <span className="font-mono text-xs">{r.sku}</span> },
            { key: "name", header: "Product", render: (r) => <span className="font-medium">{r.name}</span> },
            { key: "category", header: "Category", render: (r) => <span className="text-sm text-muted-foreground">{r.category || "—"}</span> },
            { key: "uom", header: "UOM", render: (r) => <span className="text-xs">{r.unit || r.uom || "—"}</span> },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.is_active ? "active" : "inactive"} /> },
            { 
              key: "actions", 
              header: "", 
              render: (r) => (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDelete(e, r.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) 
            },
          ]}
        />
      )}
    </div>
  );
}
