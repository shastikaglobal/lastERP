import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Mail, RefreshCw, CheckCircle2, AlertCircle, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function ZohoIntegration() {
  const { profile } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) fetchAccounts();
  }, [profile?.id]);

  async function fetchAccounts() {
    if (!profile?.id) return;
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/emails/accounts', {
      headers: { 'Authorization': `Bearer ${session?.access_token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setAccounts(data.filter((a: any) => a.user_id === profile.id));
    }
    setLoading(false);
  }

  const handleConnect = () => {
    if (!profile) return;
    
    const clientId = import.meta.env.VITE_ZOHO_CLIENT_ID;
    const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoho-oauth`;
    const state = `${profile.company_id}:${profile.id}:${window.location.origin}`;
    
    const authUrl = `https://accounts.zoho.in/oauth/v2/auth?scope=ZohoMail.messages.ALL,ZohoMail.accounts.READ,ZohoMail.folders.READ&client_id=${clientId}&response_type=code&access_type=offline&redirect_uri=${redirectUri}&state=${state}&prompt=consent`;
    
    window.location.href = authUrl;
  };

  const handleSync = async (accountId: string) => {
    setSyncing(accountId);
    try {
      const { data, error } = await supabase.functions.invoke("sync-zoho-emails", {
        body: { accountId }
      });
      
      if (error) {
        toast.error(`Connection Error: ${error.message}`);
        return;
      }

      if (data?.success === false) {
        toast.error(`Sync Failed: ${data.error}`);
        return;
      }
      
      toast.success(`Synced ${data?.syncCount || 0} messages!`);
    } catch (e: any) {
      toast.error(`Unexpected error: ${e.message}`);
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm("Are you sure you want to disconnect this account?")) return;
    
    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id || null;

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/emails/accounts/${accountId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
        
      if (!res.ok) {
        toast.error(`Failed to disconnect account`);
        return;
      }

      toast.success("Account disconnected (archived)");
      fetchAccounts();
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader 
        title="Zoho Mail Integration" 
        breadcrumbs={[{ label: "System" }, { label: "Integrations" }, { label: "Zoho Mail" }]}
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Connected Accounts
            </CardTitle>
            <CardDescription>
              Manage your Zoho Mail accounts and synchronize your communications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading accounts...</div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <h3 className="font-bold text-lg">No accounts connected</h3>
                <p className="text-muted-foreground text-sm mb-6">Connect your Zoho account to start syncing emails.</p>
                <Button onClick={handleConnect} className="btn-gold">
                  <Plus className="h-4 w-4 mr-2" /> Connect Zoho Account
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between p-4 border rounded-xl bg-card hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-bold">{acc.account_email}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Connected
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSync(acc.id)}
                        disabled={syncing === acc.id}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${syncing === acc.id ? 'animate-spin' : ''}`} />
                        Sync
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(acc.id)} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="pt-4 flex justify-center">
                   <Button onClick={handleConnect} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" /> Add Another Account
                   </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuration Guide</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            <div className="space-y-2">
              <h4 className="font-bold">1. Zoho Developer Console</h4>
              <p className="text-muted-foreground">Register a new Client in the <a href="https://api-console.zoho.in" className="text-blue-600 underline" target="_blank">Zoho API Console</a> as "Server-based Applications".</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold">2. Redirect URI</h4>
              <p className="text-muted-foreground">Add the following URL to your Authorized Redirect URIs:</p>
              <code className="block p-2 bg-muted rounded text-xs truncate">
                {import.meta.env.VITE_SUPABASE_URL}/functions/v1/zoho-oauth
              </code>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold">3. Environment Variables</h4>
              <p className="text-muted-foreground">Add your Client ID and Client Secret to your Supabase project secrets.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
