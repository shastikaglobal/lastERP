import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section, FormGrid, FormRow } from "@/components/shared/FormShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, User as UserIcon } from "lucide-react";
import { worldCurrencies } from "@/lib/currencies";

export default function Settings() {
  const { profile, roleSlugs } = useAuth();
  const isAdmin = Array.from(roleSlugs).map(s => s.toLowerCase()).includes("admin");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Company state
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("inr");
  const [taxId, setTaxId] = useState("");
  const [timezone, setTimezone] = useState("ist");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Personal Profile
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [dob, setDob] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [systemMode, setSystemMode] = useState("");
  const [city, setCity] = useState("");

  // Document Numbering State
  const [invPrefix, setInvPrefix] = useState("INV-");
  const [qtPrefix, setQtPrefix] = useState("QT-");
  const [soPrefix, setSoPrefix] = useState("SO-");
  const [shPrefix, setShPrefix] = useState("SH-");

  // Email Integration State
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [fromEmail, setFromEmail] = useState("");

  useEffect(() => {
    if (!profile?.company_id) return;
    const fetchCompany = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/settings", {
          headers: {
            "Authorization": `Bearer ${session?.access_token}`
          }
        });
        if (!res.ok) throw new Error("Failed to fetch settings");
        const data = await res.json();
        
        setName(data.name || "Shastika Global Impex Pvt Ltd");
        setCurrency(data.base_currency?.toLowerCase() || "inr");
        setSignatureUrl(data.signature_url || "");
        
        // Document Numbering Setup
        if (data.invoice_prefix !== undefined) setInvPrefix(data.invoice_prefix || "INV-");
        if (data.quotation_prefix !== undefined) setQtPrefix(data.quotation_prefix || "QT-");
        if (data.order_prefix !== undefined) setSoPrefix(data.order_prefix || "SO-");
        if (data.shipment_prefix !== undefined) setShPrefix(data.shipment_prefix || "SH-");

        // Email Setup
        if (data.smtp_host) setSmtpHost(data.smtp_host);
        if (data.smtp_port) setSmtpPort(data.smtp_port);
        if (data.smtp_user) setSmtpUser(data.smtp_user);
        if (data.from_email) setFromEmail(data.from_email);
      } catch (err) {
        console.error("Error loading settings:", err);
        toast.error("Failed to load settings");
      }
      
      if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url);
      }
      if (profile?.dob) setDob(profile.dob);
      if (profile?.joining_date) setJoiningDate(profile.joining_date);
      if (profile?.system_mode) setSystemMode(profile.system_mode);
      if (profile?.city) setCity(profile.city);
      setLoading(false);
    };
    fetchCompany();
  }, [profile?.company_id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.company_id) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `signature-${profile.company_id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      setSignatureUrl(publicUrl);
      toast.success("Signature uploaded successfully!");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments') // Reusing the public 'chat-attachments' bucket
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      // Save to profile
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/employees/${profile.id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ avatar_url: publicUrl })
      });

      if (!res.ok) {
        throw new Error("Failed to update profile avatar on backend");
      }

      setAvatarUrl(publicUrl);
      toast.success("Profile picture updated successfully!");
      // reload auth context if needed, but we rely on realtime or local state
    } catch (err: unknown) {
      const error = err as Error;
      toast.error("Avatar upload failed: " + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!profile?.company_id) return;
    setSaving(true);
    
    // Update company table in backend
    interface CompanyUpdateData {
      name: string;
      base_currency: string;
      signature_url: string;
      invoice_prefix: string;
      quotation_prefix: string;
      order_prefix: string;
      shipment_prefix: string;
      smtp_host: string;
      smtp_port: string;
      smtp_user: string;
      from_email: string;
      smtp_pass?: string;
    }

    const updateData: CompanyUpdateData = {
      name,
      base_currency: currency.toUpperCase(),
      signature_url: signatureUrl,
      invoice_prefix: invPrefix,
      quotation_prefix: qtPrefix,
      order_prefix: soPrefix,
      shipment_prefix: shPrefix,
      smtp_host: smtpHost,
      smtp_port: smtpPort,
      smtp_user: smtpUser,
      from_email: fromEmail
    };
    if (smtpPass) {
      updateData.smtp_pass = smtpPass;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const companyRes = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
      });
      
      if (!companyRes.ok) {
        throw new Error("Failed to save company settings");
      }
      
      // Update personal profile
      const profileUpdate: any = {};
      if (dob) profileUpdate.dob = dob;
      if (joiningDate) profileUpdate.joining_date = joiningDate;
      if (systemMode) profileUpdate.system_mode = systemMode;
      if (city) profileUpdate.city = city;
      
      if (Object.keys(profileUpdate).length > 0) {
        const profileRes = await fetch(`/api/employees/${profile.id}`, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${session?.access_token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(profileUpdate)
        });
        
        if (!profileRes.ok) {
          throw new Error("Failed to save personal profile settings");
        }
      }
      
      toast.success("Settings saved successfully!");
    } catch (err: any) {
      toast.error("Error saving: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
      <PageHeader title="Settings" description="Workspace preferences" breadcrumbs={[{ label: "System" }, { label: "Settings" }]}
        actions={<Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>} />
      <div className="space-y-4 max-w-3xl">
        <Section title="Personal Profile">
          <FormGrid>
            <FormRow label="Profile Picture">
              <div className="flex flex-col gap-3">
                <div className="relative inline-flex cute-card p-5 group w-max border border-white/5">
                  {/* Cuteness Elements */}
                  <span className="flower-decor -top-2 -right-2 text-2xl" style={{ animationDirection: 'reverse' }}>🌸</span>
                  <span className="flower-decor bottom-0 -left-2 text-xl">🌼</span>
                  <span className="butterfly-decor top-1 left-0 text-xl">🦋</span>
                  
                  <div className="relative shrink-0 z-10 avatar-cute">
                    {avatarUrl ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <div className="w-20 h-20 rounded-[1.25rem] overflow-hidden shadow-sm cursor-pointer border border-amber-500/20 bg-amber-500/15">
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-[400px] p-0 overflow-visible bg-transparent border-none shadow-none animate-in zoom-in-75 duration-500 ease-out fill-mode-both">
                          <span className="butterfly-fly-across">🦋</span>
                          <img src={avatarUrl} alt="Avatar" className="w-full h-auto max-h-[80vh] object-contain rounded-2xl drop-shadow-2xl ring-1 ring-white/10 relative z-10" />
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <div className="w-20 h-20 rounded-[1.25rem] bg-amber-500/15 flex items-center justify-center text-amber-500 border border-amber-500/20">
                        <UserIcon className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} className="max-w-xs" />
                  {uploadingAvatar && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </div>
            </FormRow>
            
            <FormRow label="Role">
              <Input value={profile?.requested_role ? (profile.requested_role.charAt(0).toUpperCase() + profile.requested_role.slice(1)) : "Employee"} disabled className="bg-muted/50 cursor-not-allowed" />
              <p className="text-xs text-muted-foreground mt-1">Contact your manager to change your role.</p>
            </FormRow>
            <FormRow label="Date of Birth">
              <Input type="date" value={dob} onChange={e => setDob(e.target.value)} />
            </FormRow>
            <FormRow label="Joining Date">
              <Input type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} />
            </FormRow>
            <FormRow label="City">
              <Input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Mumbai, New York" />
            </FormRow>
            <FormRow label="System Mode">
              <Select value={systemMode || "office"} onValueChange={setSystemMode}>
                <SelectTrigger><SelectValue placeholder="Select working mode" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="wfh">Work from Home</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </FormRow>

          </FormGrid>
        </Section>
        
        {isAdmin && (
          <>
            <Section title="Company">
              <FormGrid>
                <FormRow label="Company name"><Input value={name} onChange={e => setName(e.target.value)} /></FormRow>
                <FormRow label="Tax ID / GSTIN"><Input value={taxId} onChange={e => setTaxId(e.target.value)} placeholder="e.g. 33ABCDE1234F1Z5" /></FormRow>
                <FormRow label="Default currency">
                  <Select value={currency.toLowerCase()} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {worldCurrencies.map(c => (
                        <SelectItem key={c.code.toLowerCase()} value={c.code.toLowerCase()}>
                          {c.code} - {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormRow>
                <FormRow label="Timezone">
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ist">Asia/Kolkata</SelectItem>
                      <SelectItem value="utc">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </FormRow>
                <FormRow label="Digital Seal & Sign">
                  <div className="flex flex-col gap-3">
                    {signatureUrl && (
                      <div className="border rounded-md p-2 bg-white max-w-[200px]">
                        <img src={signatureUrl} alt="Signature" className="w-full h-auto object-contain max-h-24" />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} className="max-w-xs" />
                      {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                    <p className="text-xs text-muted-foreground">Upload your company seal and signature (PNG/JPG). It will appear on all PDFs.</p>
                  </div>
                </FormRow>
              </FormGrid>
            </Section>
            <Section title="Document Numbering">
              <FormGrid>
                <FormRow label="Invoice prefix"><Input value={invPrefix} onChange={e => setInvPrefix(e.target.value)} /></FormRow>
                <FormRow label="Quotation prefix"><Input value={qtPrefix} onChange={e => setQtPrefix(e.target.value)} /></FormRow>
                <FormRow label="Order prefix"><Input value={soPrefix} onChange={e => setSoPrefix(e.target.value)} /></FormRow>
                <FormRow label="Shipment prefix"><Input value={shPrefix} onChange={e => setShPrefix(e.target.value)} /></FormRow>
              </FormGrid>
            </Section>
            
            <Section title="Email Integration (SMTP)">
              <FormGrid>
                <FormRow label="SMTP Host"><Input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" /></FormRow>
                <FormRow label="SMTP Port"><Input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587" /></FormRow>
                <FormRow label="SMTP Username"><Input value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="user@company.com" /></FormRow>
                <FormRow label="SMTP Password"><Input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder="••••••••" /></FormRow>
                <FormRow label="From Email Address"><Input value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="noreply@company.com" /></FormRow>
              </FormGrid>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
