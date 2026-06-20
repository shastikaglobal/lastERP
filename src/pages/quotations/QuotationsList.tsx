import { useNavigate } from "react-router-dom";
import { Plus, Download, Loader2, FileText, Printer, Trash2, Bell } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { exportQuotationsToPDF } from "@/lib/quotation-export";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface QuotationItem {
  id: string;
  product?: {
    name: string;
    sku: string;
    unit: string;
  };
  quantity: number;
  unit_price: number;
  total_price: number;
  hsn_code: string;
}

interface Quotation {
  id: string;
  quotation_number: string;
  amount: number;
  currency: string;
  status: string;
  valid_until?: string;
  created_at: string;
  customer?: {
    name: string;
    address?: string;
  };
  customer_name?: string;
  items_count?: number;
  items?: QuotationItem[];
  validUntil?: string;
  createdAt?: string;
}

export default function QuotationsList() {
  const nav = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: quotations = [], isLoading } = useQuery<Quotation[]>({
    queryKey: ['quotations', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/quotations', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch quotations");
      
      const data = await res.json();

      return (data || []).map((q: any) => ({
        ...q,
        id: q.id,
        quotation_number: q.quotation_number,
        customer_name: q.customers?.name || q.customer_name || 'Unknown',
        items_count: q.items?.length || 0,
        items: q.items || [],
        amount: q.amount,
        currency: q.currency,
        status: q.status,
        validUntil: q.valid_until ? new Date(q.valid_until).toLocaleDateString() : 'N/A',
        createdAt: new Date(q.created_at).toLocaleDateString(),
      }));
    },
    enabled: !!profile?.company_id
  });

  // Removed realtime subscription since we moved to the local API


  const handleRowDownload = async (e: React.MouseEvent, quotation: Quotation) => {
    e.stopPropagation();
    setDownloadingId(quotation.id);
    
    try {
      const formatted = {
        ...quotation,
        customer_name: quotation.customer?.name || quotation.customer_name || "Unknown"
      };

      exportQuotationsToPDF([formatted], false);
      toast.success(`Quotation ${quotation.quotation_number} downloaded`);
    } catch (err) {
      console.error("Error downloading quotation:", err);
      toast.error("Failed to download quotation");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleExport = () => {
    if (quotations.length === 0) {
      toast.error("No data to export");
      return;
    }
    
    try {
      const formattedData = quotations.map((q: Quotation) => ({
        ...q,
        customer_name: q.customer?.name || q.customer_name || "Unknown"
      }));
      exportQuotationsToPDF(formattedData, true);
      toast.success("PDF file downloaded");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to generate PDF");
    }
  };

  const handleDelete = async (e: React.MouseEvent, quotation: Quotation) => {
    e.stopPropagation();
    if (!window.confirm(`Delete quotation ${quotation.quotation_number}? This cannot be undone.`)) return;
    setDeletingId(quotation.id);
    try {
      // Soft-delete the quotation via API
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/quotations/${quotation.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!res.ok) throw new Error("Failed to delete quotation");
      toast.success(`Quotation ${quotation.quotation_number} removed from view (soft-deleted)`);
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete quotation");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <PageHeader 
        title="Quotations" 
        description="Manage all customer price quotes" 
        breadcrumbs={[{ label: "Quotations" }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => nav("/quotations/approvals")}>
              <Bell className="h-4 w-4 mr-1.5" />Approvals
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading}>
              <Download className="h-4 w-4 mr-1.5" />Export
            </Button>
            <Button size="sm" onClick={() => nav("/quotations/create")}>
              <Plus className="h-4 w-4 mr-1.5" />New Quotation
            </Button>
          </div>
        }
      />
      
      <DataTable
        data={quotations}
        isLoading={isLoading}
        searchKeys={["quotation_number", "customer_name"]}
        onRowClick={(r) => nav(`/quotations/${r.id}`)}
        columns={[
          { 
            key: "quotation_number", 
            header: "ID", 
            render: (r) => (
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-primary/50" />
                <span className="font-mono text-xs font-bold text-primary">{r.quotation_number}</span>
              </div>
            ) 
          },
          { key: "customer_name", header: "Customer", render: (r) => <span className="font-medium">{r.customer_name}</span> },
          { key: "items_count", header: "Items", render: (r) => <span className="tabular-nums">{r.items_count}</span> },
          { key: "amount", header: "Total Amount", render: (r) => <span className="font-medium tabular-nums">{r.currency} {Number(r.amount).toLocaleString()}</span> },
          { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          { key: "validUntil", header: "Valid Until", render: (r) => <span className="text-xs text-muted-foreground">{r.validUntil}</span> },
          { key: "createdAt", header: "Created", render: (r) => <span className="text-xs text-muted-foreground">{r.createdAt}</span> },
          { 
            key: "actions", 
            header: "", 
            render: (r) => (
              <div className="flex gap-1 justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-[#1A5276]"
                  onClick={(e) => {
                    e.stopPropagation();
                    nav(`/quotations/${r.id}/report`);
                  }}
                  title="View Report"
                >
                  <Printer className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={(e) => handleRowDownload(e, r)}
                  disabled={downloadingId === r.id}
                  title="Download PDF"
                >
                  {downloadingId === r.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => handleDelete(e, r)}
                  disabled={deletingId === r.id}
                  title="Delete Quotation"
                >
                  {deletingId === r.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )
          },
        ]}
      />
    </div>
  );
}
