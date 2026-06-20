import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Section, FormGrid, FormRow } from "@/components/shared/FormShell";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { COUNTRIES } from "@/lib/countries";
import { useAuth } from "@/hooks/useAuth";


export default function EditLead() {
  const { id } = useParams();
  const { roleSlugs } = useAuth();
  const isAdmin = roleSlugs.has("admin");
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [openCountry, setOpenCountry] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");
  const [contactName, setContactName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState("");
  const [source, setSource] = useState("");
  const [product, setProduct] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function fetchLead() {
      if (!id) return;
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        toast.error("Failed to load lead");
        nav("/crm/leads");
        return;
      }

      if (data) {
        setCompanyName(data.company_name || "");
        setWebsite(data.website || "");
        setCountry(data.country || "");
        setIndustry(data.industry || "");
        setContactName(data.contact_name || "");
        setJobTitle(data.job_title || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setStage(data.stage || "New");
        setSource(data.source || "");
        setProduct(data.interested_product || "");
        setNotes(data.notes || "");
      }
      setLoading(false);
    }
    fetchLead();
  }, [id, nav]);

  const handleUpdate = async () => {
    if (!companyName || !contactName || !email) {
      return toast.error("Please fill in required fields");
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("leads")
        .update({
          company_name: companyName,
          website,
          country,
          industry,
          contact_name: contactName,
          job_title: jobTitle,
          email,
          phone,
          stage,
          source,
          interested_product: product,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Lead updated successfully");
      nav(`/crm/leads/${id}`);
    } catch (error: any) {
      toast.error(error.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
      <PageHeader
        title={`Edit ${companyName}`}
        breadcrumbs={[{ label: "CRM" }, { label: "Leads", to: "/crm/leads" }, { label: companyName, to: `/crm/leads/${id}` }, { label: "Edit" }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => nav(-1)} disabled={submitting}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />Cancel
            </Button>
            <Button size="sm" className="btn-gold" onClick={handleUpdate} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save Changes
            </Button>
          </div>
        }
      />

      <div className="space-y-6 mt-6">
        <Section title="Company Information">
          <FormGrid>
            <FormRow label="Company Name" required>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} />
            </FormRow>
            <FormRow label="Website">
              <Input value={website} onChange={e => setWebsite(e.target.value)} />
            </FormRow>
            <FormRow label="Country">
              <Popover open={openCountry} onOpenChange={setOpenCountry}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCountry}
                    className="w-full justify-between font-normal bg-card text-left px-3 h-10 border-input shadow-none"
                  >
                    {country ? country : <span className="text-muted-foreground">Select country</span>}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search country..." />
                    <CommandList>
                      <CommandEmpty>No country found.</CommandEmpty>
                      <CommandGroup>
                        {COUNTRIES.map((c) => (
                          <CommandItem
                            key={c}
                            value={c}
                            onSelect={(currentValue) => {
                              const original = COUNTRIES.find(x => x.toLowerCase() === currentValue.toLowerCase()) || currentValue;
                              setCountry(original === country ? "" : original);
                              setOpenCountry(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                country === c ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {c}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </FormRow>
            <FormRow label="Industry">
              <Input value={industry} onChange={e => setIndustry(e.target.value)} />
            </FormRow>
          </FormGrid>
        </Section>

        <Section title="Lead Details">
          <FormGrid>
            <FormRow label="Current Stage">
              {isAdmin ? (
                <Select value={stage} onValueChange={setStage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Contacted">Contacted</SelectItem>
                    <SelectItem value="Qualified">Qualified</SelectItem>
                    <SelectItem value="Proposal">Proposal</SelectItem>
                    <SelectItem value="Negotiation">Negotiation</SelectItem>
                    <SelectItem value="Nurturing">Nurturing</SelectItem>
                    <SelectItem value="Won">Won</SelectItem>
                    <SelectItem value="Lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary" className="h-10 px-4 text-sm font-bold">{stage}</Badge>
              )}
            </FormRow>

            <FormRow label="Product of Interest">
              <Input value={product} onChange={e => setProduct(e.target.value)} />
            </FormRow>
          </FormGrid>
        </Section>
      </div>
    </div>
  );
}
