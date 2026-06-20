import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, History } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download } from "lucide-react";


export default function StockMovements() {
  const { profile } = useAuth();
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ inbound: 0, outbound: 0 });


  const fetchMovements = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("date", { ascending: false });

      if (error) throw error;
      setMovements(data || []);
      
      const inQty = data?.filter(m => m.direction === 'in').reduce((acc, m) => acc + Number(m.qty), 0) || 0;
      const outQty = data?.filter(m => m.direction === 'out').reduce((acc, m) => acc + Number(m.qty), 0) || 0;
      setStats({ inbound: inQty, outbound: outQty });
    } catch (err: any) {
      toast.error("Failed to load stock movements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [profile?.company_id]);


  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader 
          title="Stock Movements" 
          description="History of all inventory in/out transactions" 
          breadcrumbs={[{ label: "Inventory" }, { label: "Movements" }]} 
        />
        <div className="flex gap-2">
           <Button variant="outline" size="sm" onClick={fetchMovements} disabled={loading}>
             <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
             Refresh
           </Button>
           <Button variant="outline" size="sm" onClick={() => toast.info("Exporting to CSV...")}>
             <Download className="h-4 w-4 mr-2" />
             Export
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-emerald-600 font-bold flex items-center gap-2">
              <ArrowDown className="h-4 w-4" /> Total Inbound
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">{stats.inbound.toLocaleString()} kg</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/5 border-orange-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-orange-600 font-bold flex items-center gap-2">
              <ArrowUp className="h-4 w-4" /> Total Outbound
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700">{stats.outbound.toLocaleString()} kg</div>
          </CardContent>
        </Card>
      </div>
      
      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
        </div>
      ) : movements.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 border border-dashed rounded-xl bg-card/50">
          <History className="h-16 w-16 text-muted-foreground opacity-10 mb-6" />
          <h2 className="text-2xl font-semibold text-muted-foreground/50">No movements recorded</h2>
          <p className="text-muted-foreground mt-2 max-w-sm text-center">Your inventory transaction history will automatically appear here as you receive stock and process shipments.</p>
        </div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          <DataTable
            data={movements}
            searchKeys={["sku", "reference", "warehouse"]}
            columns={[
              { 
                key: "date", 
                header: "Date", 
                render: (r) => <div className="flex flex-col">
                  <span className="font-semibold text-sm">{format(new Date(r.date), "MMM dd, yyyy")}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">{format(new Date(r.date), "HH:mm")}</span>
                </div>
              },
              { 
                key: "sku", 
                header: "Product / SKU", 
                render: (r) => <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${r.direction === 'in' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                  <span className="font-bold text-sm tracking-tight">{r.sku}</span> 
                </div>
              },
              { 
                key: "direction", 
                header: "Type", 
                render: (r) => (
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    r.direction === "in" 
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                    : "bg-orange-500/10 text-orange-600 border border-orange-500/20"
                  }`}>
                    {r.direction === "in" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                    {r.direction === "in" ? "Inbound" : "Outbound"}
                  </div>
                )
              },
              { 
                key: "qty", 
                header: "Quantity", 
                render: (r) => <span className={`tabular-nums font-bold text-lg ${r.direction === 'in' ? 'text-emerald-600' : 'text-orange-600'}`}>
                  {r.direction === 'in' ? '+' : '-'}{Number(r.qty).toLocaleString()}
                  <span className="text-[10px] ml-1 text-muted-foreground font-normal">kg</span>
                </span> 
              },
              { 
                key: "reference", 
                header: "Reference", 
                render: (r) => <div className="flex flex-col">
                  <span className="font-mono text-[11px] font-bold">{r.reference}</span>
                  <span className="text-[10px] text-muted-foreground">{r.warehouse || "Main Warehouse"}</span>
                </div>
              },
            ]}
          />
        </div>
      )}
    </div>

  );
}
