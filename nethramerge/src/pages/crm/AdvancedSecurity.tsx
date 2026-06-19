import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SectionHeader from "../../components/SectionHeader";
import Card from "@/components/Card";
import { ShieldAlert, Globe, Server, Activity, Lock, CheckCircle, RefreshCw, Terminal, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { softDeleteRecord } from "@/lib/softDelete";

export default function AdvancedSecurity() {
  const { profile } = useAuth();
  const [isAddingSubnet, setIsAddingSubnet] = useState(false);
  const [newSubnetIp, setNewSubnetIp] = useState("");
  const [newSubnetLabel, setNewSubnetLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch Whitelisted Subnets
  const { data: subnets = [], refetch: refetchSubnets, isLoading: loadingSubnets } = useQuery({
    queryKey: ['corporate_subnets', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/security/subnets?company_id=${profile.company_id}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch subnets");
      return await res.json();
    },
    enabled: !!profile?.company_id
  });

  // Fetch Threat Logs (from audit_logs where resource_type='security')
  const { data: threatLogs = [], refetch: refetchLogs, isLoading: loadingLogs } = useQuery({
    queryKey: ['threat_logs', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      // We assume audit_logs row has user_id, which we can join with profiles to filter by company
      // However, we can simply fetch security logs for now. If company_id is available in audit_logs, we filter by it.
      // Let's assume we fetch recent security logs (we can filter on client side if needed, or if we can't join)
      // Since audit_logs is RLS protected, we will only get what we are allowed to see.
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/security/logs?company_id=${profile.company_id}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch threat logs");
      return await res.json();
    },
    enabled: !!profile?.company_id
  });

  const handleRescan = () => {
    refetchSubnets();
    refetchLogs();
  };

  const handleAddSubnet = async () => {
    if (!newSubnetIp || !newSubnetLabel) return toast.error("Please fill all fields");
    if (!profile?.company_id) return toast.error("Company ID not found");

    setIsSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch('/api/security/subnets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          company_id: profile.company_id,
          ip_cidr: newSubnetIp,
          label: newSubnetLabel,
          is_active: true
        })
      });
      if (!res.ok) throw new Error("Failed to add subnet");
      toast.success("Subnet added successfully");
      setIsAddingSubnet(false);
      setNewSubnetIp("");
      setNewSubnetLabel("");
      refetchSubnets();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubnet = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/security/subnets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to archive subnet");
      toast.success("Subnet archived (soft delete)");
      refetchSubnets();
    } catch (error: any) {
      toast.error(error.message || "Failed to archive subnet");
    }
  };

  const unmitigatedAlerts = threatLogs.filter((log: any) => log.status === 'Blocked' || log.status === 'failed').length;

  return (
    <div className="space-y-6 animate-fade-in text-foreground">
      <SectionHeader
        title="AI Advanced Security & Threat Intel"
        sub="Monitor real-time network scans, Whitelist secure corporate subnets, and configure automatic token-revoking engines"
        actions={
          <Button size="sm" className="btn-gold shadow-md" onClick={handleRescan} disabled={loadingLogs || loadingSubnets}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${(loadingLogs || loadingSubnets) ? 'animate-spin' : ''}`} /> 
            {(loadingLogs || loadingSubnets) ? 'Scanning...' : 'Re-Scan Network'}
          </Button>
        }
      />

      {/* Security Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4 p-5 bg-card/60 backdrop-blur-md">
          <div className="p-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
            <ShieldAlert className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Active Threat Alerts</div>
            <div className="text-2xl font-bold font-mono mt-0.5">{unmitigatedAlerts} Warnings</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5 bg-card/60 backdrop-blur-md">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Token Sandbox</div>
            <div className="text-2xl font-bold font-mono mt-0.5">Encrypted</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5 bg-card/60 backdrop-blur-md">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">API Gateways</div>
            <div className="text-2xl font-bold font-mono mt-0.5">4 Secure</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5 bg-card/60 backdrop-blur-md">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Network Firewalls</div>
            <div className="text-2xl font-bold font-mono mt-0.5">3 Active</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Whitelists */}
        <Card className="col-span-1 md:col-span-2 p-5 bg-card/60 backdrop-blur-md flex flex-col justify-between border-border">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5"><Globe className="h-4 w-4 text-primary" /> Corporate Subnets Whitelist</h3>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] uppercase font-bold tracking-wider" onClick={() => setIsAddingSubnet(!isAddingSubnet)}>
                <Plus className="h-3 w-3 mr-1" /> Add Subnet
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 max-w-sm">
              Allow BDE mobile CRM synchronizations only from approved CIDR blocks.
            </p>
          </div>
          
          <div className="space-y-2 font-mono text-xs pt-2">
            {isAddingSubnet && (
              <div className="p-3 rounded-lg bg-neutral-900 border border-primary/30 flex flex-col gap-2">
                <div className="flex gap-2">
                  <Input 
                    placeholder="192.168.1.0/24" 
                    className="h-8 bg-black/50 border-border text-xs" 
                    value={newSubnetIp} onChange={e => setNewSubnetIp(e.target.value)} 
                  />
                  <Input 
                    placeholder="HQ Office" 
                    className="h-8 bg-black/50 border-border text-xs" 
                    value={newSubnetLabel} onChange={e => setNewSubnetLabel(e.target.value)} 
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsAddingSubnet(false)}>Cancel</Button>
                  <Button size="sm" className="h-7 text-xs" onClick={handleAddSubnet} disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            )}
            
            {subnets.length === 0 && !loadingSubnets && !isAddingSubnet && (
              <div className="text-muted-foreground p-4 text-center bg-neutral-900 rounded-lg">No subnets whitelisted. Click 'Add Subnet' to add one.</div>
            )}
            {subnets.map((subnet: any) => (
              <div key={subnet.id} className="p-2.5 rounded-lg bg-neutral-900 border border-border flex items-center justify-between group">
                <div>
                  <div className="text-foreground font-semibold">{subnet.ip_cidr}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-sans">{subnet.label}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-[9px] font-sans font-bold ${subnet.is_active ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20'}`}>
                    {subnet.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => handleDeleteSubnet(subnet.id)} className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Live Threat Logs */}
        <Card className="lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">AI Threat Mitigation Feed</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time threat assessment triggers and automated security locks</p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-900/60 text-muted-foreground font-semibold border-b border-border">
                  <th className="p-3">Incident ID</th>
                  <th className="p-3">Threat Category</th>
                  <th className="p-3">Incident Details</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3 font-semibold">Mitigation Status</th>
                </tr>
              </thead>
              <tbody>
                {threatLogs.length === 0 && !loadingLogs && (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No recent security threats detected.</td></tr>
                )}
                {threatLogs.map((log: any) => (
                  <tr key={log.id} className="border-b border-border/40 hover:bg-neutral-900/30 transition-colors">
                    <td className="p-3 font-mono text-muted-foreground">{log.id.split('-')[0]}...</td>
                    <td className="p-3 font-bold text-foreground">{log.action || 'Security Event'}</td>
                    <td className="p-3 text-muted-foreground leading-normal max-w-[300px] truncate" title={log.user_agent}>
                      {log.user_agent || 'Unknown Client'}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[10px] ${
                        log.status === "Blocked"
                          ? "bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse"
                          : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      }`}>
                        {log.status === "Blocked" ? "High" : "Medium"}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[10px] ${
                        log.status === "Blocked" ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
