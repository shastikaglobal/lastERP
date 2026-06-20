import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Mail, ShieldCheck, Server, AlertCircle, CheckCircle2, 
  HelpCircle, ExternalLink, Info, Loader2, User, Key, 
  AtSign, Zap, Activity as ActivityIcon, Inbox, Send, Download, RefreshCw,
  Search, User2, Clock, MessageSquare, ChevronRight, Filter
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

type EmailActivity = {
  id: string;
  lead_id: string;
  title: string;
  type: string;
  content: string;
  created_at: string;
  leads?: {
    company_name: string;
    contact_name: string;
    email: string;
  };
};

const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="bg-card/50 rounded-2xl border p-6 h-full">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      {title}
    </h3>
    {children}
  </div>
);

const FormRow = ({ label, children, required }: { label: string, children: React.ReactNode, required?: boolean }) => (
  <div className="space-y-2">
    <label className="text-sm font-medium">{label} {required && <span className="text-primary">*</span>}</label>
    {children}
  </div>
);

export default function EmailIntegration() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [emails, setEmails] = useState<EmailActivity[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Configuration States
  const [smtpHost, setSmtpHost] = useState("smtppro.zoho.in");
  const [smtpPort, setSmtpPort] = useState("465");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [imapHost, setImapHost] = useState("imappro.zoho.in");
  const [imapPort, setImapPort] = useState("993");
  const [imapUser, setImapUser] = useState("");
  const [imapPass, setImapPass] = useState("");
  const [apiKey, setApiKey] = useState("");

  const fetchData = async () => {
    if (!profile?.company_id) return;

    // 1. Fetch Company Config — handle missing api_key column gracefully
    try {
      const { data: comp, error } = await supabase.from("companies").select("*").eq("id", profile.company_id).single();
      if (error) throw error;
      if (comp) {
        setSmtpHost(comp.smtp_host || "smtppro.zoho.in");
        setSmtpPort(comp.smtp_port || "465");
        setSmtpUser(comp.smtp_user || "");
        setFromEmail(comp.from_email || "");
        setImapHost(comp.imap_host || "imappro.zoho.in");
        setImapPort(String(comp.imap_port || "993"));
        setImapUser(comp.imap_user || "");
        setApiKey(comp.api_key || "");
      }
    } catch (err: any) {
      console.warn("Failed to select companies.* — falling back to select known columns:", err?.message);
      // Fallback: select only known columns (avoid referencing missing api_key)
      const { data: comp2, error: err2 } = await supabase
        .from("companies")
        .select("id, smtp_host, smtp_port, smtp_user, from_email, imap_host, imap_port, imap_user")
        .eq("id", profile.company_id)
        .single();
      if (err2) {
        console.error("Failed to fetch company config:", err2.message || err2);
        // leave defaults in place
      } else if (comp2) {
        setSmtpHost(comp2.smtp_host || "smtppro.zoho.in");
        setSmtpPort(comp2.smtp_port || "465");
        setSmtpUser(comp2.smtp_user || "");
        setFromEmail(comp2.from_email || "");
        setImapHost(comp2.imap_host || "imappro.zoho.in");
        setImapPort(String(comp2.imap_port || "993"));
        setImapUser(comp2.imap_user || "");
        // api_key column missing — keep apiKey state empty
        setApiKey("");
      }
    }

    // 2. Fetch Recent Email Activities
    const { data: emailData } = await supabase
      .from("activities")
      .select(`
        id, lead_id, title, type, content, created_at,
        leads:lead_id(company_name, contact_name, email)
      `)
      .eq("type", "email")
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (emailData) setEmails(emailData as unknown as EmailActivity[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // 1. Live Subscriptions for instant UI updates
    const channel = supabase
      .channel('live-emails')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
          filter: `type=eq.email`
        },
        () => {
          console.log("New email activity detected, refreshing...");
          fetchData();
        }
      )
      .subscribe();

    // 2. Auto-Sync with Server every 2 minutes
    const syncInterval = setInterval(() => {
      console.log("Auto-syncing with mail server...");
      handleSyncAll(true); // Silent sync
    }, 120000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(syncInterval);
    };
  }, [profile?.company_id]);

  const handleSyncAll = async (silent = false) => {
    if (!profile?.company_id) return;
    if (!silent) setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-emails", {
        body: { companyId: profile?.company_id }
      });
      if (error) throw error;
      if (!silent) {
        if (data?.count > 0) {
          toast.success(`Synced ${data.count} new emails!`);
        } else {
          toast.success(data?.message || "Inbox synced. No new emails.");
        }
      }
      fetchData();
    } catch (e: any) {
      if (!silent) toast.error("Sync Failed: " + e.message);
    } finally {
      if (!silent) setSyncing(false);
    }
  };


  const handleSave = async () => {
    if (!profile?.company_id) return;
    setSaving(true);
    const updateData: any = { 
      smtp_host: smtpHost, smtp_port: smtpPort, smtp_user: smtpUser, from_email: fromEmail,
      imap_host: imapHost, imap_port: parseInt(imapPort), imap_user: imapUser,
      api_key: apiKey
    };
    if (smtpPass) updateData.smtp_pass = smtpPass;
    if (imapPass) updateData.imap_pass = imapPass;

    const { error } = await supabase.from("companies").update(updateData).eq("id", profile.company_id);
    setSaving(false);
    if (error) {
      // Detect common schema/cache error when api_key column is missing
      const msg = error.message || String(error);
      if (msg.toLowerCase().includes("api_key") || msg.toLowerCase().includes("column \"api_key\"")) {
        toast.error("Save failed: 'api_key' column missing in database. Run the migration file supabase/migrations/20260522120000_add_api_key_to_companies.sql on your DB.");
      } else {
        toast.error("Error: " + msg);
      }
    } else {
      toast.success("Configuration saved.");
    }
  };

  const filteredEmails = emails.filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.leads?.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.leads?.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      <PageHeader
        title="Email Command Center"
        description="Live view of all business communications across your leads and customers."
        breadcrumbs={[{ label: "CRM" }, { label: "Live Email" }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSyncAll} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sync Inbox
            </Button>
            <Button onClick={() => nav("/crm/leads")} className="btn-gold">
              New Outreach
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="live" className="mt-8">
        <TabsList className="bg-muted/50 p-1 mb-6">
          <TabsTrigger value="live" className="gap-2"><Inbox className="h-4 w-4" /> Live Inbox</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2"><ShieldCheck className="h-4 w-4" /> Server Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="live">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar / Filters */}
            <div className="lg:col-span-1 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search messages..." 
                  className="pl-9 bg-card/50" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="bg-card/50 border rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                  <Filter className="h-3 w-3" /> Quick Filters
                </h4>
                <div className="space-y-1">
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs font-medium bg-primary/5 text-primary">All Communications</Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs font-medium hover:bg-muted">Inbound Replies</Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs font-medium hover:bg-muted">Outbound Sent</Button>
                </div>
              </div>
            </div>

            {/* Email List */}
            <div className="lg:col-span-3 space-y-3">
              {filteredEmails.length === 0 ? (
                <Card className="border-dashed py-24 text-center bg-muted/5">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                  <p className="text-muted-foreground">No emails found in history.</p>
                </Card>
              ) : (
                filteredEmails.map(email => (
                  <Card key={email.id} className="hover:border-primary/40 transition-all cursor-pointer group shadow-sm" onClick={() => nav(`/crm/leads/${email.lead_id}`)}>
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className={`mt-1 p-2 rounded-lg ${email.title.includes('Sent') ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                        {email.title.includes('Sent') ? <Send className="h-4 w-4" /> : <Inbox className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                            {email.leads?.company_name || "Unknown Company"}
                          </h4>
                          <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(email.created_at), "MMM d, HH:mm")}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 truncate">
                          {email.title}
                        </p>
                        <div 
                          className="text-xs text-muted-foreground line-clamp-2 leading-relaxed opacity-80"
                          dangerouslySetInnerHTML={{ __html: email.content.substring(0, 200) }}
                        />
                        <div className="mt-3 flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                           <span className="flex items-center gap-1"><User2 className="h-3 w-3" /> {email.leads?.contact_name}</span>
                           <span className="flex items-center gap-1"><AtSign className="h-3 w-3" /> {email.leads?.email}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 self-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Section title="Outbound (SMTP)">
                <div className="space-y-4">
                  <FormRow label="SMTP Host"><Input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} /></FormRow>
                  <FormRow label="SMTP Port"><Input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} /></FormRow>
                  <FormRow label="Username"><Input value={smtpUser} onChange={e => setSmtpUser(e.target.value)} /></FormRow>
                  <FormRow label="Password"><Input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} /></FormRow>
                </div>
              </Section>
              <Section title="Inbound (IMAP)">
                <div className="space-y-4">
                  <FormRow label="IMAP Host"><Input value={imapHost} onChange={e => setImapHost(e.target.value)} /></FormRow>
                  <FormRow label="IMAP Port"><Input value={imapPort} onChange={e => setImapPort(e.target.value)} /></FormRow>
                  <FormRow label="Username"><Input value={imapUser} onChange={e => setImapUser(e.target.value)} /></FormRow>
                  <FormRow label="Password"><Input type="password" value={imapPass} onChange={e => setImapPass(e.target.value)} /></FormRow>
                </div>
              </Section>
              <Section title="API Configuration">
                <div className="space-y-4">
                  <FormRow label="API Key">
                    <Input type="password" placeholder="Enter API Key (e.g. Resend or Zoho)" value={apiKey} onChange={e => setApiKey(e.target.value)} />
                  </FormRow>
                </div>
              </Section>
           </div>
           <div className="mt-8 flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="btn-gold px-8">
                {saving ? "Saving..." : "Save Configuration"}
              </Button>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
