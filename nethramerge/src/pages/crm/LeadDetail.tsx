import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit, Mail, Phone, Building, Calendar, Package, UserCheck, Loader2, Globe } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Section } from "@/components/shared/FormShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

type Activity = {
  id: string;
  title: string;
  type: string;
  created_at: string;
  completed: boolean;
  profiles?: { full_name: string };
};

type Quotation = {
  id: string;
  quotation_number: string;
  status: string;
  created_at: string;
  amount: number;
  currency: string;
};

type FollowUp = {
  id: string;
  follow_up_date: string;
  note: string;
  assigned_to: string;
  is_notified: boolean;
};

type Lead = {
  id: string;
  company_name: string;
  contact_name: string;
  country: string;
  product_type: string;
  stage: string;
  created_at: string;
  updated_at: string;
  assigned_to: string;
  business_category?: string;
  mobile?: string;
  email?: string;
  website?: string;
  date?: string;
  remark?: string;
};

const EMAIL_SEPARATOR_REGEX = /[;,\n]+/;

const parseEmails = (value?: string | null) =>
  value
    ? value
        .split(EMAIL_SEPARATOR_REGEX)
        .map((email) => email.trim())
        .filter(Boolean)
    : [];

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function LeadDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { profile } = useAuth();

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);

  useEffect(() => {
    async function fetchLeadDetails() {
      if (!id) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const leadRes = await fetch(`/api/leads/${id}`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (!leadRes.ok) throw new Error("Failed to fetch lead");
        const leadData = await leadRes.json();

        setLead(leadData as unknown as Lead);
        setNewProduct(leadData.product_type || "");

        const actsRes = await fetch(`/api/leads/${id}/activities`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (!actsRes.ok) throw new Error("Failed to fetch activities");
        const acts = await actsRes.json();
        
        setActivities(acts as unknown as Activity[]);

        const quotesRes = await fetch(`/api/leads/${id}/quotations`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (!quotesRes.ok) throw new Error("Failed to fetch quotations");
        const quotes = await quotesRes.json();
        
        setQuotations(quotes as unknown as Quotation[]);

        const followUpsRes = await fetch(`/api/leads/${id}/follow-ups`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (!followUpsRes.ok) throw new Error("Failed to fetch follow-ups");
        const followUpsData = await followUpsRes.json();
        setFollowUps(followUpsData as unknown as FollowUp[]);

        const tasksRes = await fetch(`/api/leads/${id}/tasks`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          setTasks(tasksData);
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to load lead details");
      } finally {
        setLoading(false);
      }
    }
    fetchLeadDetails();
  }, [id]);


  const handleUpdateProduct = async () => {
    if (!id || !lead) return;
    setSavingProduct(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ product_type: newProduct })
      });

      if (!res.ok) throw new Error("Failed to update product");
      setLead({ ...lead, product_type: newProduct });
      setEditingProduct(false);
      toast.success("Product of interest updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update product");
    } finally {
      setSavingProduct(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lead) {
    return <div className="p-6">Lead not found</div>;
  }

  const ownerName = lead.assigned_to || "Unassigned";
  const leadEmails = parseEmails(lead.email).filter(isValidEmail);

  return (
    <div>
      <PageHeader
        title={lead.company_name}
        breadcrumbs={[{ label: "CRM" }, { label: "Leads", to: "/crm/leads" }, { label: lead.company_name }]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => nav(-1)}><ArrowLeft className="h-4 w-4 mr-1.5" />Back</Button>
            <Button size="sm" onClick={() => nav("/quotations/create", { state: { lead } })}>
              <UserCheck className="h-4 w-4 mr-1.5" />Create Quote
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Section title="Overview">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-xs text-muted-foreground mb-1">Lead ID</dt><dd className="font-mono text-xs">{lead.id}</dd></div>
              <div><dt className="text-xs text-muted-foreground mb-1">Stage</dt><dd><StatusBadge status={lead.stage} /></dd></div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground mb-1">Product of Interest</dt>
                <dd className="flex items-center gap-2 group">
                  {editingProduct ? (
                    <div className="flex items-center gap-2 w-full max-w-md">
                      <Input 
                        value={newProduct} 
                        onChange={e => setNewProduct(e.target.value)} 
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleUpdateProduct()}
                      />
                      <Button size="sm" onClick={handleUpdateProduct} disabled={savingProduct}>
                        {savingProduct ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {setEditingProduct(false); setNewProduct(lead.product_type || "");}}>Cancel</Button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-base">{lead.product_type || "-"}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditingProduct(true)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </dd>
              </div>
              <div><dt className="text-xs text-muted-foreground mb-1">Owner</dt><dd>{ownerName}</dd></div>
              <div><dt className="text-xs text-muted-foreground mb-1">Country</dt><dd>{lead.country || "-"}</dd></div>
              <div><dt className="text-xs text-muted-foreground mb-1">Mobile</dt><dd>{lead.mobile || "-"}</dd></div>
              <div>
                <dt className="text-xs text-muted-foreground mb-1">Email</dt>
                <dd>
                  {leadEmails.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {leadEmails.map((email) => (
                        <a key={email} href={`mailto:${email}`} className="text-primary hover:underline">
                          {email}
                        </a>
                      ))}
                    </div>
                  ) : (
                    "-"
                  )}
                </dd>
              </div>
              <div><dt className="text-xs text-muted-foreground mb-1">Business Category</dt><dd>{lead.business_category || "-"}</dd></div>
              <div><dt className="text-xs text-muted-foreground mb-1">Website</dt><dd>{lead.website || "-"}</dd></div>
              <div><dt className="text-xs text-muted-foreground mb-1">Created</dt><dd>{lead.date || format(new Date(lead.created_at), "PP")}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-muted-foreground mb-1">Remark</dt><dd className="text-muted-foreground whitespace-pre-wrap">{lead.remark || "-"}</dd></div>
            </dl>
          </Section>
          <Section title="Recent Activity">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No activities recorded yet.</p>
            ) : (
              <ol className="relative border-l border-border ml-2 space-y-4">
                {activities.map((a) => (
                  <li key={a.id} className="ml-4">
                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary border-4 border-background" />
                    <div className={`text-sm font-medium ${a.completed ? "line-through text-muted-foreground" : ""}`}>{a.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.profiles?.full_name || "System"} · {a.type.replace("_", " ")} · {format(new Date(a.created_at), "PPp")}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>
          <Section title="Quotations">
            {quotations.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No quotations connected to this lead yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quotations.map((q) => (
                  <div key={q.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => nav(`/quotations/edit/${q.id}`)}>
                    <div>
                      <div className="font-semibold text-sm text-primary">{q.quotation_number}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(q.created_at), "PP")}</div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div className="font-medium text-sm">{q.currency} {q.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <StatusBadge status={q.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
          <Section title="Follow Ups">
            {followUps.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No follow ups recorded yet.</p>
            ) : (
              <ol className="relative border-l border-border ml-2 space-y-4">
                {followUps.map((f) => (
                  <li key={f.id} className="ml-4">
                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-blue-500 border-4 border-background" />
                    <div className="text-sm font-medium">{f.follow_up_date ? format(new Date(f.follow_up_date), "PP") : "No Date"} - {f.assigned_to || "Unassigned"}</div>
                    <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{f.note || "No note"}</div>
                    {f.is_notified && <span className="text-[10px] text-green-500 font-semibold uppercase mt-1 inline-block">Notified</span>}
                  </li>
                ))}
              </ol>
            )}
          </Section>
          <Section title="Tasks">
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No tasks connected to this lead yet.</p>
            ) : (
              <ol className="relative border-l border-border ml-2 space-y-4">
                {tasks.map((t) => (
                  <li key={t.id} className="ml-4">
                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-amber-500 border-4 border-background" />
                    <div className="text-sm font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Due: {t.due_date ? format(new Date(t.due_date), "PP") : "No Date"} · Status: {t.status}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>
        <div className="space-y-4">
          <Section title="Contact">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>Contact: {lead.contact_name || "-"}</span>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                {leadEmails.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {leadEmails.map((email) => (
                      <a key={email} href={`mailto:${email}`} className="text-primary hover:underline">
                        {email}
                      </a>
                    ))}
                  </div>
                ) : (
                  <span>-</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {lead.mobile ? (
                  <a href={`tel:${lead.mobile}`} className="text-primary hover:underline">{lead.mobile}</a>
                ) : (
                  <span>Not Provided</span>
                )}
              </div>
              {lead.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline"
                  >
                    {lead.website}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Last updated {format(new Date(lead.updated_at || lead.created_at), "PP")}</span>
              </div>
            </div>
          </Section>
          <Section title="Interest">
            <div className={`flex items-center gap-2 text-lg font-semibold ${!lead.product_type ? 'text-muted-foreground italic' : ''}`}>
              <Package className="h-5 w-5 text-muted-foreground" />
              {lead.product_type || "No Product Specified"}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingProduct(true)}>
                <Edit className="h-3 w-3" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Primary product interest</div>
          </Section>
        </div>
      </div>
    </div>
  );
}