import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SectionHeader from "../../components/SectionHeader";
import Card from "@/components/Card";
import { UserPlus, Star, BarChart3, TrendingUp, Search, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function ClientAcquisition() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  // channels are fetched locally in fetchData for resolving source names
  const [loading, setLoading] = useState(true);

  // New Channel State (removed modal UI)

  const [totalLeads, setTotalLeads] = useState(0);
  const [convertedClients, setConvertedClients] = useState(0);
  const [avgAcquisitionRate, setAvgAcquisitionRate] = useState("0%");
  const [totalPipeValue, setTotalPipeValue] = useState("$0");
  const [convertedList, setConvertedList] = useState<any[]>([]);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newInquirySource, setNewInquirySource] = useState("");
  const [newAssignedBde, setNewAssignedBde] = useState("");
  const [newAcquisitionDate, setNewAcquisitionDate] = useState("");
  const [newProductInterested, setNewProductInterested] = useState("");

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch (err) {
        console.warn('Error removing supabase channel:', err);
      }
    };
  }, []);

  async function getCompanyId() {
    if (profile?.company_id) return profile.company_id;

    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session?.user?.id) return null;

    const userId = data.session.user.id;
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single();

    if (profileError || !profileData) return null;
    return profileData.company_id || null;
  }

  async function fetchData() {
    setLoading(true);

    const companyId = await getCompanyId();
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const authHeader = { 'Authorization': `Bearer ${session.access_token}` };
      const [leadsRes, convertedRes] = await Promise.all([
        fetch(`/api/leads?company_id=${companyId}`, { headers: authHeader }),
        fetch(`/api/leads/converted?company_id=${companyId}`, { headers: authHeader })
      ]);

      if (!leadsRes.ok) {
        const errorText = await leadsRes.text();
        throw new Error(`Failed to fetch leads (${leadsRes.status}): ${errorText}`);
      }
      if (!convertedRes.ok) {
        const errorText = await convertedRes.text();
        throw new Error(`Failed to fetch converted clients (${convertedRes.status}): ${errorText}`);
      }

      const leads = await leadsRes.json();
      const converted = await convertedRes.json();

      const tLeads = leads.length;
      const tClients = converted.length;
      const tRevenue = converted.reduce((sum: number, item: any) => sum + Number(item.deal_value || 0), 0);

      setTotalLeads(tLeads);
      setConvertedClients(tClients);

      const overallRate = tLeads > 0 ? ((tClients / tLeads) * 100).toFixed(1) + "%" : "0.0%";
      setAvgAcquisitionRate(overallRate);

      let formattedRev = `$${tRevenue.toLocaleString()}`;
      if (tRevenue >= 1000000) {
        formattedRev = `$${(tRevenue / 1000000).toFixed(2)}M`;
      } else if (tRevenue >= 1000) {
        formattedRev = `$${(tRevenue / 1000).toFixed(1)}K`;
      }
      setTotalPipeValue(formattedRev);
      setConvertedList(converted);
    } catch (err: any) {
      console.error("Fetch client acquisition data error:", err);
      toast.error(err.message || "Failed to load acquisition data");
    } finally {
      setLoading(false);
    }
  };

  // channel deletion UI removed

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      <SectionHeader
        title="Client Acquisition & Funnels"
        sub="Trace customer generation channels, review marketing ROI, and analyze channel conversion ratios"
        actions={
          <div className="flex gap-2">
            <Button size="sm" className="btn-gold shadow-md" onClick={() => navigate('/crm/reports')}>
              <BarChart3 className="h-4 w-4 mr-1.5" /> Funnel Reports
            </Button>
            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-black shadow-md" onClick={() => setIsAddClientOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1.5" /> Add Client
            </Button>
          </div>
        }
      />

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4 p-5 bg-card/60 backdrop-blur-md">
          <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">New Leads Acquired</div>
            <div className="text-2xl font-bold font-mono mt-0.5">{totalLeads}</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5 bg-card/60 backdrop-blur-md">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Converted Buyers</div>
            <div className="text-2xl font-bold font-mono mt-0.5">{convertedClients} Clients</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5 bg-card/60 backdrop-blur-md">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Acquisition Rate</div>
            <div className="text-2xl font-bold font-mono mt-0.5">{avgAcquisitionRate}</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5 bg-card/60 backdrop-blur-md">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Star className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Pipe Value</div>
            <div className="text-2xl font-bold font-mono mt-0.5">{totalPipeValue}</div>
          </div>
        </Card>
      </div>

      {/* Acquisition Channels Register removed per request */}

      <Card className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Converted / Acquired Clients</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Detailed list of converted clients and deal details</p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-900/60 text-muted-foreground font-semibold border-b border-border">
                <th className="p-3">Client Name</th>
                <th className="p-3">Country</th>
                <th className="p-3">Inquiry Source</th>
                <th className="p-3">Assigned BDE</th>
                <th className="p-3">Acquisition Date</th>
                <th className="p-3">Product Interested</th>
                <th className="p-3">Deal Value</th>
                <th className="p-3">Conversion Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">Loading clients...</td></tr>
              ) : convertedList.length === 0 ? (
                <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No converted clients found.</td></tr>
              ) : (
                convertedList.map((c, idx) => (
                  <tr key={c.id || idx} className="border-b border-border/40 hover:bg-neutral-900/30 transition-colors">
                    <td className="p-3 font-semibold text-foreground">{c.client_name}</td>
                    <td className="p-3 font-mono text-muted-foreground">{c.country}</td>
                    <td className="p-3 font-mono text-muted-foreground">{c.source}</td>
                    <td className="p-3 font-mono text-muted-foreground">{c.assigned_bde}</td>
                    <td className="p-3 font-mono text-muted-foreground">{c.acquisition_date ? new Date(c.acquisition_date).toLocaleDateString() : '-'}</td>
                    <td className="p-3 font-mono text-muted-foreground">{c.product_interested}</td>
                    <td className="p-3 font-mono text-emerald-500 font-bold">{`$${(c.deal_value || 0).toLocaleString()}`}</td>
                    <td className="p-3 font-mono text-primary font-semibold">{c.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={isAddClientOpen} onOpenChange={(open) => {
        setIsAddClientOpen(open);
        if (!open) {
          setNewClientName("");
          setNewCountry("");
          setNewInquirySource("");
          setNewAssignedBde("");
          setNewAcquisitionDate("");
          setNewProductInterested("");
        }
      }}>
        <DialogContent className="bg-card border-border max-w-xl text-foreground">
          <DialogHeader>
            <DialogTitle>Add Converted Client</DialogTitle>
            <DialogDescription className="text-muted-foreground/60 text-sm">
              Enter client acquisition details and save to add them immediately to the converted clients list.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (isSavingClient) return;
              if (!newClientName || !newCountry || !newInquirySource || !newAssignedBde || !newAcquisitionDate || !newProductInterested) {
                toast.error('Please complete all fields before saving.');
                return;
              }

              setIsSavingClient(true);
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) throw new Error('Authentication required');

                const res = await fetch('/api/crm/leads/add-client', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({
                    company_name: newClientName,
                    country: newCountry,
                    inquiry_source: newInquirySource,
                    assigned_bde: newAssignedBde,
                    acquisition_date: newAcquisitionDate,
                    product_interested: newProductInterested,
                  }),
                });

                if (!res.ok) {
                  const errText = await res.text();
                  let message = 'Failed to add client';
                  try {
                    const parsed = JSON.parse(errText);
                    message = parsed.error || message;
                  } catch {
                    if (errText) message = errText;
                  }
                  throw new Error(message);
                }

                const created = await res.json();
                const nextTotalLeads = totalLeads + 1;
                const nextConvertedClients = convertedClients + 1;
                setConvertedList((prev) => [{
                  ...created,
                  client_name: created.client_name || created.company_name || newClientName,
                  acquisition_date: created.acquisition_date || created.date || null,
                  product_interested: created.product_interested || created.interested_product,
                  status: created.status || 'Won',
                  deal_value: 0,
                }, ...prev]);
                setTotalLeads(nextTotalLeads);
                setConvertedClients(nextConvertedClients);
                setAvgAcquisitionRate(`${((nextConvertedClients / nextTotalLeads) * 100).toFixed(1)}%`);
                setIsAddClientOpen(false);
                toast.success('Converted client added successfully');
              } catch (error: any) {
                toast.error(error.message || 'Failed to add client');
              } finally {
                setIsSavingClient(false);
              }
            }}
            className="space-y-4 pt-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Company or buyer name" />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={newCountry} onChange={(e) => setNewCountry(e.target.value)} placeholder="Country" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inquiry Source</Label>
                <Input value={newInquirySource} onChange={(e) => setNewInquirySource(e.target.value)} placeholder="e.g. Website, Referral" />
              </div>
              <div className="space-y-2">
                <Label>Assigned BDE</Label>
                <Input value={newAssignedBde} onChange={(e) => setNewAssignedBde(e.target.value)} placeholder="Sales rep name" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Acquisition Date</Label>
                <Input type="date" value={newAcquisitionDate} onChange={(e) => setNewAcquisitionDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Product Interested</Label>
                <Input value={newProductInterested} onChange={(e) => setNewProductInterested(e.target.value)} placeholder="Product or category" />
              </div>
            </div>

            <DialogFooter className="pt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setIsAddClientOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingClient} className="w-full sm:w-auto text-black bg-[#e3b341] hover:bg-[#dca100]">
                {isSavingClient ? 'Saving...' : 'Save Client'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
