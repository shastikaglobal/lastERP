import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Section, FormGrid, FormRow } from "@/components/shared/FormShell";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { COUNTRIES } from "@/lib/countries";
import { Check, ChevronsUpDown } from "lucide-react";

export default function CreateLead() {
  const nav = useNavigate();
  const { profile } = useAuth();
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
  const [stage, setStage] = useState("New");
  const [source, setSource] = useState("");
  const [product, setProduct] = useState("");
  const [notes, setNotes] = useState("");

  const handleSave = async () => {
    if (!companyName) return toast.error("Please fill in the Company Name");
    if (!contactName) return toast.error("Please fill in the Contact Name");
    if (!email) return toast.error("Please fill in the Email Address");

    if (!profile?.id) {
      return toast.error("User profile not found. Please log in again.");
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("leads").insert({
        company_name: companyName,
        contact_name: contactName,
        email: email,
        phone: phone,
        country: country,
        interested_product: product,
        stage: stage,
        assigned_to: (profile as any).full_name || "Unassigned", // Auto-assign name as text
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (error) throw error;

      toast.success("Lead created successfully");
      nav("/crm/leads");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to create lead");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        title="Create New Lead"
        description="Add a new business opportunity to your CRM pipeline."
        breadcrumbs={[{ label: "CRM" }, { label: "Leads", to: "/crm/leads" }, { label: "New" }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => nav(-1)} disabled={submitting}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save Lead
            </Button>
          </div>
        }
      />

      <div className="space-y-6 mt-6">
        <Section title="Company Information">
          <FormGrid>
            <FormRow label="Company Name" required>
              <Input 
                placeholder="Acme Imports Ltd" 
                value={companyName} 
                onChange={e => setCompanyName(e.target.value)}
              />
            </FormRow>
            <FormRow label="Website">
              <Input 
                placeholder="https://acme.com" 
                value={website} 
                onChange={e => setWebsite(e.target.value)}
              />
            </FormRow>
            <FormRow label="Country" required>
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
                              // CommandItem converts value to lowercase internally sometimes, 
                              // so we match against the original array
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
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Textiles">Textiles</SelectItem>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Auto Parts">Auto Parts</SelectItem>
                  <SelectItem value="Agriculture">Agriculture</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
          </FormGrid>
        </Section>

        <Section title="Primary Contact">
          <FormGrid>
            <FormRow label="Contact Name" required>
              <Input 
                placeholder="Jane Smith" 
                value={contactName} 
                onChange={e => setContactName(e.target.value)}
              />
            </FormRow>
            <FormRow label="Job Title">
              <Input 
                placeholder="Procurement Manager" 
                value={jobTitle} 
                onChange={e => setJobTitle(e.target.value)}
              />
            </FormRow>
            <FormRow label="Email Address" required>
              <Input 
                type="email" 
                placeholder="jane@acme.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
              />
            </FormRow>
            <FormRow label="Phone Number">
              <Input 
                placeholder="+1 555 0100" 
                value={phone} 
                onChange={e => setPhone(e.target.value)}
              />
            </FormRow>
          </FormGrid>
        </Section>

        <Section title="Lead Details">
          <FormGrid>
            <FormRow label="Current Stage">
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
            </FormRow>
            <FormRow label="Source">
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Lead source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                  <SelectItem value="Trade Show">Trade Show</SelectItem>
                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Product of Interest">
              <Input 
                placeholder="e.g. Organic Cashews" 
                value={product} 
                onChange={e => setProduct(e.target.value)}
              />
            </FormRow>
          </FormGrid>
          <div className="mt-6">
            <FormRow label="Internal Notes">
              <Textarea 
                placeholder="Initial conversation details, specific requirements..." 
                rows={4} 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
              />
            </FormRow>
          </div>
        </Section>
        
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => nav(-1)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Create Lead
          </Button>
        </div>
      </div>
    </div>
  );
}
