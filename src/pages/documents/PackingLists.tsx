import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileBox, Package, Loader2, Trash2, Download } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { generatePackingListPDF, generatePackingSlipPDF, generateCartonLabelsPDF } from "@/lib/packing-export";
import { getPackingListPDF } from "@/lib/packing-service";

export default function PackingLists() {
  const navigate = useNavigate();
  const [packingLists, setPackingLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    const fetchPLs = async () => {
      if (!profile?.company_id) return;
      
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const res = await fetch("http://127.0.0.1:8082/api/warehouse/packing_protocols", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error("Failed to fetch from VPS");
        
        let data = await res.json();
        
        // Filter by company_id and sort descending by created_at
        data = data.filter((pl: any) => pl.company_id === profile.company_id);
        data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setPackingLists(data || []);
      } catch (err) {
        console.error("PL load error:", err);
        toast.error("Failed to load packing lists");
      } finally {
        setLoading(false);
      }
    };
    fetchPLs();
  }, [profile?.company_id]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this packing list?")) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(`http://127.0.0.1:8082/api/warehouse/packing_protocols/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Delete failed");
      
      toast.success("Packing list hidden successfully");
      setPackingLists(prev => prev.filter(pl => pl.id !== id));
    } catch (err: any) {
      toast.error("Failed to delete: " + err.message);
    }
  };

  const handleGenerateDocument = async (id: string, type: "list" | "slip" | "labels") => {
    try {
      const data = await getPackingListPDF(id);
      
      switch (type) {
        case "list":
          await generatePackingListPDF(data);
          toast.success("Packing List generated");
          break;
        case "slip":
          await generatePackingSlipPDF(data);
          toast.success("Packing Slip generated");
          break;
        case "labels":
          await generateCartonLabelsPDF(data);
          toast.success("Carton Labels generated");
          break;
      }
    } catch (error: any) {
      console.error("Error generating document:", error);
      toast.error(`Failed to generate document: ${error.message || error}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Packing Lists"
        description="Manage and print shipment packing lists"
        breadcrumbs={[{ label: "Documents" }, { label: "Packing Lists" }]}
      />

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : packingLists.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground italic">
          No packing lists found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packingLists.map((pl) => (
            <Card key={pl.id} className="overflow-hidden border-primary/10 hover:border-primary/30 transition-all">
              <CardHeader className="bg-muted/30 pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <FileBox className="h-5 w-5 text-primary" />
                    <span className="font-mono text-sm font-bold">
                      PKG-{pl.id.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex gap-1 items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(pl.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <StatusBadge status={pl.status} />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Receiving ID</p>
                  <p className="font-bold font-mono">{pl.receiving_id}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Cartons</p>
                    <div className="flex items-center gap-1">
                      <Package className="h-3 w-3 text-primary" />
                      <span className="text-sm font-medium">{pl.carton_count}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Net Weight</p>
                    <p className="text-sm font-medium tabular-nums">{pl.net_weight} kg</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Gross Weight</p>
                    <p className="text-sm font-medium tabular-nums">{pl.gross_weight} kg</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Pallet Config</p>
                    <p className="text-sm font-medium">{pl.pallet_config}</p>
                  </div>
                </div>
                {pl.export_marks && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Export Marks</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-2">{pl.export_marks}</p>
                  </div>
                )}
              </CardContent>

              <CardFooter className="bg-muted/10 border-t p-3 flex gap-2">
                <Button
                  className="flex-1"
                  size="sm"
                  variant="outline"
                  onClick={() => handleGenerateDocument(pl.id, "list")}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Packing List
                </Button>
                <Button
                  className="flex-1"
                  size="sm"
                  variant="outline"
                  onClick={() => handleGenerateDocument(pl.id, "slip")}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Packing Slip
                </Button>
                <Button
                  className="flex-1"
                  size="sm"
                  variant="outline"
                  onClick={() => handleGenerateDocument(pl.id, "labels")}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Labels
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}