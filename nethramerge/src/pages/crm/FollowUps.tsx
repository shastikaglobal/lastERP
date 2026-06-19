import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchBdeProfiles } from "@/lib/bde";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Check, Bell, Trash2, Edit2, Search } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type FollowUp = {
  id: string;
  lead_id: string;
  company_name: string;
  contact_name?: string | null;
  follow_up_date?: string | null;
  note?: string | null;
  assigned_to?: string | null;
  is_notified: boolean;
  reminder_time?: string | null;
  business_category?: string | null;
  product_type?: string | null;
  country?: string | null;
  mobile?: string | null;
  email?: string | null;
  website?: string | null;
  created_at?: string | null;
};

type LeadOption = {
  id: string;
  company_name: string;
  contact_name?: string | null;
  business_category?: string | null;
  product_type?: string | null;
  country?: string | null;
  mobile?: string | null;
  email?: string | null;
  website?: string | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
};

export default function FollowUps() {
  const { roleSlugs, profile } = useAuth();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [contactMethod, setContactMethod] = useState("WhatsApp");
  const [note, setNote] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [filter, setFilter] = useState<"all" | "mine" | "pending">("all");
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [bdeMembers, setBdeMembers] = useState<any[]>([]);
  const isBdeTeam = roleSlugs.has("bd") || roleSlugs.has("bde") || roleSlugs.has("sales");

  const fetchBdeMembers = async () => {
    try {
      const filtered = await fetchBdeProfiles(supabase);

      setBdeMembers(filtered);
      if (filtered.length > 0 && !assignedTo) {
        setAssignedTo(filtered[0].full_name || "");
      }
    } catch (err) {
      console.error("Failed to fetch BDE members:", err);
    }
  };

  const fetchLeads = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/leads', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch leads");
      
      const data = await res.json();
      setLeads(data.filter((l: any) => !l.is_deleted) as LeadOption[]);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch leads");
    }
  };

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/follow-ups', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch follow-ups");
      const data = await res.json();

      setFollowUps(data as FollowUp[]);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch follow-ups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchFollowUps();
    fetchBdeMembers();

    const channel = supabase
      .channel("follow-ups-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "follow_ups" }, fetchFollowUps)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ─── Reminder checker ────────────────────────────────────────────────────────
  // Request Notification permission on component mount
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  const firedReminders = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      // Use LOCAL date string (not UTC) to avoid timezone drift around midnight
      const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      
      console.log(`[Reminders] Checking at ${now.toLocaleTimeString()}. Today is ${todayStr}. nowMinutes=${nowMinutes}`);
      if (followUps.length > 0) {
        console.log(`[Reminders] Dumping followUps data (count: ${followUps.length}):`);
        console.table(followUps.map(f => ({ id: f.id, company: f.company_name, date: f.follow_up_date, time: f.reminder_time, notified: f.is_notified })));
      }

      followUps.forEach((fu) => {
        if (fu.is_notified) return;                  // already acknowledged
        if (firedReminders.current.has(fu.id)) return; // already alerted this session
        if (!fu.reminder_time) return;               // no time set
        if (!fu.follow_up_date) return;              // no date set

        // API returns UTC ISO strings (e.g. "2026-06-18T18:30:00.000Z" which is June 19 IST).
        // We MUST parse it to a Date object to get the correct LOCAL date.
        const fuDateObj = new Date(fu.follow_up_date);
        const fuDateLocalStr = `${fuDateObj.getFullYear()}-${String(fuDateObj.getMonth()+1).padStart(2,'0')}-${String(fuDateObj.getDate()).padStart(2,'0')}`;

        if (fuDateLocalStr !== todayStr) {
          console.log(`[Reminders] Skipping ${fu.company_name} because date ${fuDateLocalStr} != ${todayStr}`);
          return;
        }

        const [h, m] = fu.reminder_time.split(":").map(Number);
        const reminderMinutes = h * 60 + m;
        console.log(`[Reminders] Checking ${fu.company_name}: time=${fu.reminder_time} (${reminderMinutes} mins) vs now=${nowMinutes} mins`);

        // Fire if: we're within ±2 min of the reminder OR it's already past (overdue)
        const isPastDue = nowMinutes >= reminderMinutes;
        const isWithinWindow = Math.abs(nowMinutes - reminderMinutes) <= 2;

        if (isPastDue || isWithinWindow) {
          firedReminders.current.add(fu.id);

          const displayTime = new Date(`2000-01-01T${fu.reminder_time}`)
            .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });

          const isOverdue = nowMinutes > reminderMinutes + 2;
          const title = isOverdue ? "⚠️ Overdue Follow-Up" : "🔔 Follow-Up Reminder";
          const body = `${fu.company_name}${fu.contact_name ? ` — ${fu.contact_name}` : ""} · ${displayTime}`;

          // Browser Notification
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification(title, { body });
          }

          // Always show toast (whether or not browser notification works)
          toast(title, {
            description: body,
            duration: isOverdue ? 60000 : 30000,
            action: {
              label: "Acknowledge",
              onClick: () => handleAcknowledge(fu.id),
            },
          });
        }
      });
    };

    // Run immediately, then every 30 seconds
    checkReminders();
    const interval = setInterval(checkReminders, 30_000);
    return () => clearInterval(interval);
  }, [followUps]); // re-runs whenever followUps list updates
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSaveFollowUp = async () => {
    if (!selectedLeadId || !followUpDate) {
      toast.error("Please select a lead and a date");
      return;
    }

    const lead = leads.find((item) => item.id === selectedLeadId);
    if (!lead) {
      toast.error("Selected lead is not valid");
      return;
    }

    const assignee = assignedTo;
    
    // <input type="time"> already returns 24h format (HH:MM) — use it directly
    let finalTime: string | null = null;
    if (reminderTime) {
      finalTime = `${reminderTime}:00`; // e.g. "14:30" → "14:30:00"
    }

    const combinedNote = note.trim() 
      ? `${contactMethod}: ${note.trim()}`
      : contactMethod;

    try {
      const payload = {
        lead_id: selectedLeadId,
        company_name: lead.company_name,
        contact_name: lead.contact_name || "",
        follow_up_date: followUpDate,
        reminder_time: finalTime,
        note: combinedNote,
        assigned_to: assignee,
        is_notified: false,
        business_category: lead.business_category,
        product_type: lead.product_type,
        country: lead.country,
        mobile: lead.mobile,
        email: lead.email,
        website: lead.website,
      };

      const { data: { session } } = await supabase.auth.getSession();
      
      if (isEditing && selectedFollowUp) {
        const res = await fetch(`/api/follow-ups/${selectedFollowUp.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to update follow-up");
        toast.success("Follow-up updated successfully");
      } else {
        const res = await fetch(`/api/leads/${selectedLeadId}/follow-ups`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            company_name: lead.company_name,
            contact_name: lead.contact_name,
            follow_up_date: followUpDate,
            reminder_time: finalTime,
            note: combinedNote,
            assigned_to: assignee,
            business_category: lead.business_category,
            product_type: lead.product_type,
            country: lead.country,
            mobile: lead.mobile,
            email: lead.email,
            website: lead.website,
          })
        });
        if (!res.ok) throw new Error("Failed to create follow-up");
        toast.success("Follow-up created successfully");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchFollowUps();
    } catch (error: any) {
      toast.error(error.message || "Failed to save follow-up");
    }
  };

  const resetForm = () => {
    setSelectedLeadId("");
    setFollowUpDate("");
    setReminderTime("");
    setContactMethod("WhatsApp");
    setNote("");
    setAssignedTo(bdeMembers[0]?.full_name || "");
    setIsEditing(false);
    setSelectedFollowUp(null);
  };

  const handleEditOpen = (followUp: FollowUp) => {
    setSelectedFollowUp(followUp);
    setSelectedLeadId(followUp.lead_id);
    setFollowUpDate(followUp.follow_up_date || "");
    setAssignedTo(followUp.assigned_to || (bdeMembers[0]?.full_name || ""));
    
    // Parse note: "Method: Note"
    const noteParts = followUp.note?.split(": ");
    if (noteParts && noteParts.length > 1) {
      setContactMethod(noteParts[0]);
      setNote(noteParts.slice(1).join(": "));
    } else {
      setContactMethod(followUp.note || "WhatsApp");
      setNote("");
    }

    // Parse time — stored in 24h (HH:MM:SS), set directly into input
    const timeStr = followUp.reminder_time || "";
    // input[type=time] wants HH:MM format
    setReminderTime(timeStr ? timeStr.slice(0, 5) : "");
    
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleAcknowledge = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/follow-ups/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ is_notified: true })
      });
      if (!res.ok) throw new Error("Failed to acknowledge follow-up");
      toast.success("Follow-up acknowledged");
      fetchFollowUps();
    } catch (error: any) {
      toast.error(error.message || "Failed to acknowledge follow-up");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/follow-ups/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to delete follow-up");
      toast.success("Follow-up removed from view (soft-deleted)");
      fetchFollowUps();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete follow-up");
    }
  };

  const filteredFollowUps = followUps.filter((item) => {
    // Search filter
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || [
      item.company_name,
      item.contact_name,
      item.assigned_to,
      item.note
    ].some(field => field?.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (filter === "mine") {
      return item.assigned_to === assignedTo;
    }
    if (filter === "pending") {
      return !item.is_notified;
    }
    return true;
  });

  const pendingCount = followUps.filter((item) => !item.is_notified).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Follow-Ups</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track upcoming customer follow-ups, assign owners, and acknowledge reminders.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            className="bg-primary hover:bg-primary/90" 
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New Follow-Up
          </Button>
          <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
            All
          </Button>
          <Button variant={filter === "mine" ? "default" : "outline"} onClick={() => setFilter("mine")}>
            Assigned to Me
          </Button>
          <Button variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>
            Pending ({pendingCount})
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm uppercase tracking-wide text-muted-foreground">Total follow-ups</div>
          <div className="mt-2 text-3xl font-semibold text-foreground">{followUps.length}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm uppercase tracking-wide text-muted-foreground">Pending reminders</div>
          <div className="mt-2 text-3xl font-semibold text-foreground">{pendingCount}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm uppercase tracking-wide text-muted-foreground">Team members</div>
          <div className="mt-2 text-3xl font-semibold text-foreground">{bdeMembers.length}</div>
        </div>
      </div>

      <div className="relative w-full max-w-2xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by lead, contact, assigned to, note..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card border-border focus-visible:ring-primary h-11"
        />
      </div>

      <div className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Reminder Time</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto opacity-20" />
                </TableCell>
              </TableRow>
            ) : filteredFollowUps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
                  No follow-ups found.
                </TableCell>
              </TableRow>
            ) : (
              filteredFollowUps.map((followUp) => (
                <TableRow 
                  key={followUp.id} 
                  className="border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedFollowUp(followUp);
                    setIsDetailsOpen(true);
                  }}
                >
                  <TableCell>{followUp.company_name}</TableCell>
                  <TableCell>{followUp.contact_name || "—"}</TableCell>
                  <TableCell>{formatDate(followUp.follow_up_date)}</TableCell>
                  <TableCell>{followUp.assigned_to || "Unassigned"}</TableCell>
                  <TableCell>
                    {followUp.note ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="text-left cursor-help" onClick={(e) => e.stopPropagation()}>
                            {followUp.note.length > 40 
                              ? `${followUp.note.substring(0, 40)}...` 
                              : followUp.note}
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[300px] bg-slate-900 text-white border-slate-800">
                            <p>{followUp.note}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {followUp.reminder_time ? (
                      <div className="flex items-center gap-1 text-xs text-amber-500 font-medium">
                        <Bell className="h-3 w-3" />
                        {new Date(`2000-01-01T${followUp.reminder_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {!followUp.is_notified && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 text-[10px] uppercase tracking-wider" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcknowledge(followUp.id);
                        }}
                      >
                        <Check className="mr-1 h-3.5 w-3.5" /> Acknowledge
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 text-[10px] uppercase tracking-wider" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditOpen(followUp);
                      }}
                    >
                      <Edit2 className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 text-[10px] uppercase tracking-wider" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(followUp.id);
                      }}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetForm(); }}>
        <DialogContent className="bg-card border-border max-w-lg text-foreground">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Follow-Up" : "Create Follow-Up"}</DialogTitle>
            <DialogDescription className="text-muted-foreground/60 text-xs">
              {isEditing ? "Update details for this follow-up interaction." : "Fill in the details below to schedule a follow-up for a lead."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSaveFollowUp();
            }}
            className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-2"
          >
            <div className="space-y-2">
              <Label className="text-foreground">Lead *</Label>
              <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select a lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.company_name}{lead.contact_name ? ` — ${lead.contact_name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLeadId && leads.find(l => l.id === selectedLeadId) && (
              <div className="p-4 bg-muted/20 rounded-xl border border-border/50 animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/30">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Selected Lead Details</span>
                  <Badge variant="outline" className="text-[10px] bg-background/50">Auto-filled</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  <div className="col-span-full">
                    <div className="text-[10px] text-muted-foreground/60 uppercase font-medium">Company Name</div>
                    <div className="text-sm font-semibold text-foreground">{leads.find(l => l.id === selectedLeadId)?.company_name}</div>
                  </div>

                  <div className="col-span-full">
                    <div className="text-[10px] text-muted-foreground/60 uppercase font-medium">Contact Name</div>
                    <div className="text-sm font-semibold text-foreground">{leads.find(l => l.id === selectedLeadId)?.contact_name || "—"}</div>
                  </div>

                  <div>
                    <div className="text-[10px] text-muted-foreground/60 uppercase font-medium">Business Category</div>
                    <div className="text-xs text-foreground/80">{leads.find(l => l.id === selectedLeadId)?.business_category || "—"}</div>
                  </div>

                  <div>
                    <div className="text-[10px] text-muted-foreground/60 uppercase font-medium">Product Type</div>
                    <div className="text-xs text-foreground/80">{leads.find(l => l.id === selectedLeadId)?.product_type || "—"}</div>
                  </div>

                  <div>
                    <div className="text-[10px] text-muted-foreground/60 uppercase font-medium">Country</div>
                    <div className="text-xs text-foreground/80">{leads.find(l => l.id === selectedLeadId)?.country || "—"}</div>
                  </div>

                  <div>
                    <div className="text-[10px] text-muted-foreground/60 uppercase font-medium">Mobile</div>
                    <div className="text-xs text-foreground/80">{leads.find(l => l.id === selectedLeadId)?.mobile || "—"}</div>
                  </div>

                  <div>
                    <div className="text-[10px] text-muted-foreground/60 uppercase font-medium">Email</div>
                    <div className="text-xs text-foreground/80 truncate">{leads.find(l => l.id === selectedLeadId)?.email || "—"}</div>
                  </div>

                  <div>
                    <div className="text-[10px] text-muted-foreground/60 uppercase font-medium">Website</div>
                    <div className="text-xs text-foreground/80 truncate">{leads.find(l => l.id === selectedLeadId)?.website || "—"}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-foreground">Follow-Up Date *</Label>
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                required
                className="bg-background border-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Reminder Time</Label>
              <Input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="bg-background border-input w-full"
              />
              <p className="text-xs text-muted-foreground">Leave blank for no reminder. Use 24-hour format (e.g. 14:30 = 2:30 PM).</p>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Assigned To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Choose assignee" />
                </SelectTrigger>
                <SelectContent>
                  {bdeMembers.map((member) => (
                    <SelectItem key={member.id} value={member.full_name}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Contact Method *</Label>
              <Select value={contactMethod} onValueChange={setContactMethod}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select contact method" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Phone Call">Phone Call</SelectItem>
                  <SelectItem value="WhatsApp & Email">WhatsApp & Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Note (Optional)</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any additional notes..."
                className="bg-background border-input"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                Save Follow-Up
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="bg-gray-900 border-l border-gray-700 text-white w-full sm:max-w-[384px] overflow-y-auto shadow-2xl">
          <SheetHeader className="mb-6 border-b border-white/10 pb-4">
            <SheetTitle className="text-white text-xl">Follow-Up Details</SheetTitle>
          </SheetHeader>
          
          {selectedFollowUp && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{selectedFollowUp.company_name}</h2>
                <p className="text-slate-400 text-sm flex items-center gap-2">
                  <Badge variant="outline" className="border-white/20 text-white/70 bg-white/5">
                    {selectedFollowUp.is_notified ? "Acknowledged" : "Pending"}
                  </Badge>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <DetailItem label="Contact Name" value={selectedFollowUp.contact_name} />
                                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Follow-Up Date" value={formatDate(selectedFollowUp.follow_up_date)} />
                  <DetailItem label="Reminder Time" value={selectedFollowUp.reminder_time ? new Date(`2000-01-01T${selectedFollowUp.reminder_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : undefined} />
                </div>

                <DetailItem label="Assigned To" value={selectedFollowUp.assigned_to} />
                
                <div className="bg-white/5 p-4 rounded-lg border border-white/10 space-y-3 mt-2">
                  <div className="border-b border-white/10 pb-2 mb-1">
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Contact Activity</span>
                  </div>
                  <DetailItem 
                    label="Contact Method" 
                    value={selectedFollowUp.note?.split(": ")[0]} 
                  />
                  <DetailItem 
                    label="Internal Note" 
                    value={selectedFollowUp.note?.includes(": ") ? selectedFollowUp.note.split(": ").slice(1).join(": ") : "—"} 
                  />
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Lead Information</span>
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem label="Business Category" value={selectedFollowUp.business_category} />
                    <DetailItem label="Product Type" value={selectedFollowUp.product_type} />
                    <DetailItem label="Country" value={selectedFollowUp.country} />
                    <DetailItem label="Mobile" value={selectedFollowUp.mobile} />
                  </div>
                  <DetailItem label="Email" value={selectedFollowUp.email} />
                  <DetailItem label="Website" value={selectedFollowUp.website} />
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DetailItem({ label, value }: { label: string, value?: string | null }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">{label}</div>
      <div className="text-sm font-medium text-slate-200">{value || "—"}</div>
    </div>
  );
}
