import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meetingToEdit?: any | null;
  defaultMeetingType?: string;
  zohoAccountId?: string | null;
  onSaved?: () => void;
}

const DURATIONS = [
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
];

const MEETING_TYPES = ["Video Call", "Webinar", "Audio Only", "In-Person"];

const emptyForm = () => ({
  title: "",
  description: "",
  meeting_date: new Date().toISOString().split("T")[0],
  meeting_time: "10:00",
  duration_minutes: "60",
  meeting_type: "Video Call",
  participant_name: "",
  participant_company: "none",
  participant_email: "",
  meeting_link: "",
  password: "",
  notes: "",
});

export function ScheduleMeetingModal({ open, onOpenChange, meetingToEdit, defaultMeetingType, zohoAccountId, onSaved }: Props) {
  const { profile } = useAuth();
  const isEditing = !!meetingToEdit;
  const [formData, setFormData] = useState(emptyForm());
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [zohoConnected, setZohoConnected] = useState(false);

  useEffect(() => {
    if (open && profile?.company_id) {
      // Fetch leads for dropdown
      supabase
        .from("leads")
        .select("id, company, name")
        .eq("company_id", profile.company_id)
        .not('is_deleted', 'eq', true)
        .order("company")
        .then(({ data }) => setLeads(data || []));

      // Check zoho connection
      supabase
        .from("zoho_accounts")
        .select("id")
        .eq("user_id", profile.id)
        .limit(1)
        .then(({ data }) => setZohoConnected((data?.length ?? 0) > 0));

      // Pre-fill if editing
      if (meetingToEdit) {
        setFormData({
          title: meetingToEdit.title || "",
          description: meetingToEdit.description || "",
          meeting_date: meetingToEdit.meeting_date || new Date().toISOString().split("T")[0],
          meeting_time: meetingToEdit.meeting_time?.substring(0, 5) || "10:00",
          duration_minutes: String(meetingToEdit.duration_minutes || 60),
          meeting_type: meetingToEdit.meeting_type || "Video Call",
          participant_name: meetingToEdit.participant_name || "",
          participant_company: meetingToEdit.participant_company || "none",
          participant_email: meetingToEdit.participant_email || "",
          meeting_link: meetingToEdit.meeting_link || "",
          password: meetingToEdit.password || "",
          notes: meetingToEdit.notes || "",
        });
      } else {
        setFormData({
          ...emptyForm(),
          meeting_type: defaultMeetingType || "Video Call"
        });
      }
    }
  }, [open, profile?.company_id, meetingToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) return;
    setLoading(true);

    try {
      let finalLink = formData.meeting_link;
      let startUrl = meetingToEdit?.start_url || "";
      let meetingKey = meetingToEdit?.meeting_key || "";
      let zohoSessionId = meetingToEdit?.zoho_session_id || null;

      // Call Zoho Meeting API via edge function for new video call meetings
      const isVideoCall = formData.meeting_type === "Video Call" || formData.meeting_type === "Webinar";
      if (!isEditing && isVideoCall) {
        try {
          const startDateTime = new Date(`${formData.meeting_date}T${formData.meeting_time}`);
          const { data: zohoRes, error: fnErr } = await supabase.functions.invoke("zoho-meeting", {
            body: {
              action: "create",
              meetingData: {
                title: formData.title,
                description: formData.description,
                startTime: startDateTime.toISOString(),
                duration: parseInt(formData.duration_minutes),
                lobby_enabled: true,
              },
            },
          });

          if (fnErr) throw fnErr;

          if (zohoRes?.success && zohoRes.join_url) {
            finalLink = zohoRes.join_url;
            startUrl = zohoRes.start_url || "";
            meetingKey = zohoRes.meeting_key || "";
            zohoSessionId = zohoRes.zoho_session_id || null;
            toast.info(`Zoho Meeting created!`);
          } else if (zohoRes?.join_url) {
            // Fallback link returned from edge function even on Zoho error
            finalLink = zohoRes.join_url;
            if (zohoRes.zoho_error) {
              toast.warning(`Zoho API: ${zohoRes.zoho_error}. Using generated link.`);
            }
          } else {
            // No Zoho account or API error – fall back to generated link
            finalLink = finalLink || ("https://meet.zoho.in/" + Math.random().toString(36).substring(2, 10));
            toast.warning("Zoho not connected. Using generated link.");
          }
        } catch (zohoErr: any) {
          // Don't block meeting creation if Zoho fails
          finalLink = finalLink || ("https://meet.zoho.in/" + Math.random().toString(36).substring(2, 10));
          toast.warning("Zoho API error. Using generated link.");
          console.error("zoho-meeting invoke error:", zohoErr);
        }
      } else if (!isEditing && !finalLink) {
        // Non-video meeting with no link – generate a placeholder
        finalLink = "https://meet.zoho.in/" + Math.random().toString(36).substring(2, 10);
      }

      const payload = {
        company_id: profile.company_id,
        host_id: profile.id,
        host_name: profile.first_name
          ? `${profile.first_name} ${profile.last_name || ""}`.trim()
          : profile.email,
        title: formData.title,
        description: formData.description,
        meeting_date: formData.meeting_date,
        meeting_time: formData.meeting_time,
        duration_minutes: parseInt(formData.duration_minutes),
        meeting_type: formData.meeting_type,
        participant_name: formData.participant_name,
        participant_company: formData.participant_company === "none" ? null : formData.participant_company,
        participant_email: formData.participant_email,
        meeting_link: finalLink,
        start_url: startUrl,
        meeting_key: meetingKey,
        zoho_session_id: zohoSessionId,
        password: formData.password,
        notes: formData.notes,
        status: "Upcoming",
      };

      if (isEditing) {
        const { error } = await supabase.from("meetings").update(payload).eq("id", meetingToEdit.id);
        if (error) throw error;
        toast.success("Meeting updated!");
      } else {
        const { error } = await supabase.from("meetings").insert(payload);
        if (error) throw error;
        toast.success(`Meeting created! Join: ${finalLink}`);
      }

      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save meeting");
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string, val: string) => setFormData(prev => ({ ...prev, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Meeting" : "Schedule Meeting"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">

            <div className="space-y-2 col-span-2">
              <Label>Title *</Label>
              <Input required value={formData.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Q3 Pricing Discussion" />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Description / Agenda</Label>
              <Textarea rows={2} value={formData.description} onChange={e => set("description", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Date *</Label>
              <Input required type="date" value={formData.meeting_date} onChange={e => set("meeting_date", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Time *</Label>
              <Input required type="time" value={formData.meeting_time} onChange={e => set("meeting_time", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={formData.duration_minutes} onValueChange={v => set("duration_minutes", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Meeting Type</Label>
              <Select value={formData.meeting_type} onValueChange={v => set("meeting_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEETING_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Participant Name</Label>
              <Input value={formData.participant_name} onChange={e => set("participant_name", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Participant Company</Label>
              <Select value={formData.participant_company} onValueChange={v => set("participant_company", v)}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- None --</SelectItem>
                  {leads.map(l => (
                    <SelectItem key={l.id} value={l.company || l.name}>{l.company || l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Participant Email</Label>
              <Input type="email" placeholder="buyer@example.com" value={formData.participant_email} onChange={e => set("participant_email", e.target.value)} />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>
                Zoho Meeting Link
                {zohoConnected && !isEditing && formData.meeting_type === "Video Call" && (
                  <span className="ml-2 text-xs text-emerald-500 font-normal">✓ Will auto-create if left empty</span>
                )}
              </Label>
              <Input placeholder="https://meeting.zoho.in/..." value={formData.meeting_link} onChange={e => set("meeting_link", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Password (Optional)</Label>
              <Input placeholder="Meeting password" value={formData.password} onChange={e => set("password", e.target.value)} />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Private Notes</Label>
              <Textarea rows={2} value={formData.notes} onChange={e => set("notes", e.target.value)} />
            </div>

          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEditing ? "Save Changes" : "Schedule Meeting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
