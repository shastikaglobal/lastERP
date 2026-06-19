import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchBdeProfiles } from "@/lib/bde";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import ScreenMonitor from "./ScreenMonitor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Loader2, Plus, Calendar as CalendarIcon, Trash2, Check, ChevronsUpDown, Search as SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Clock } from "lucide-react";

const EXPORT_COUNTRIES = [
  "Australia", "Thailand", "Indonesia", "Malaysia", "Singapore", "Vietnam", 
  "UAE", "Saudi Arabia", "Qatar", "Kuwait", "Oman", "Bahrain", 
  "UK", "Germany", "France", "Netherlands", "Belgium", 
  "USA", "Canada", "Japan", "South Korea", "China", "India", "Sri Lanka", "Bangladesh", 
  "New Zealand", "South Africa", "Kenya", "Nigeria", "Egypt", 
  "Greece", "Italy", "Spain", "Portugal", "Sweden", "Norway", "Denmark", "Finland", 
  "Poland", "Czech Republic", "Hungary", "Romania", "Bulgaria", "Croatia", "Slovenia", "Slovakia", 
  "Estonia", "Latvia", "Lithuania", "Other"
];

type Lead = {
  id: string;
  company_name: string;
  country?: string | null;
};

type Activity = {
  id: string;
  lead_id: string | null;
  type: string;
  title: string;
  due_date: string | null;
  completed: boolean;
  leads?: { company_name: string };
};

const TYPES = ["call", "meeting", "email", "follow_up"];

export default function LeadActivities() {
  const { syncCounter } = useRealtimeSync();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [type, setType] = useState("call");
  const [leadId, setLeadId] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [hourStr, setHourStr] = useState("12");
  const [minuteStr, setMinuteStr] = useState("00");
  const [ampmStr, setAmpmStr] = useState("AM");
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirm state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { profile: currentUser, roleSlugs } = useAuth();
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [bdeMembers, setBdeMembers] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const isAdminOrManager = useMemo(() => {
    const slugs = Array.from(roleSlugs || []).map(s => s.toLowerCase());
    return slugs.includes('admin') || slugs.includes('manager');
  }, [roleSlugs]);

  const isBDE = useMemo(() => {
    const slugs = Array.from(roleSlugs || []).map(s => s.toLowerCase());
    return slugs.includes('bde');
  }, [roleSlugs]);

  const [reportForm, setReportForm] = useState({
    report_date: format(new Date(), 'yyyy-MM-dd'),
    bde_id: '',
    country: '',
    total_calls: 0,
    calls_attended: 0,
    not_attended_calls: 0,
    linkedin_messages: 0,
    emails_sent: 0,
    new_leads: 0,
    notes: ''
  });

  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isCountryPopoverOpen, setIsCountryPopoverOpen] = useState(false);
  const [isLeadsPopoverOpen, setIsLeadsPopoverOpen] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => l.company_name.toLowerCase().includes(leadSearch.toLowerCase()));
  }, [leads, leadSearch]);

  const availableCountries = useMemo(() => {
    const countries = leads
      .map(l => l.country)
      .filter((c): c is string => !!c && typeof c === 'string');
    return Array.from(new Set(countries)).sort();
  }, [leads]);

  const fetchBdeMembers = async () => {
    try {
      const filtered = await fetchBdeProfiles(supabase);
      setBdeMembers(filtered);
    } catch (err) {
      console.error("Failed to fetch BDE members:", err);
    }
  };

  const fetchData = async () => {
    try {
      const [activitiesRes, leadsRes] = await Promise.all([
        supabase
          .from("activities" as any)
          .select(`id, lead_id, type, title, due_date, completed, leads(company_name)`)
          .neq('is_deleted', true)
          .order("due_date", { ascending: true }),
        supabase
          .from("leads" as any)
          .select("id, company_name, country")
          .neq('is_deleted', true)
          .order("company_name", { ascending: true })
      ]);

      if (activitiesRes.error) throw activitiesRes.error;
      if (leadsRes.error) throw leadsRes.error;

      await fetchBdeMembers();

      setActivities(activitiesRes.data as unknown as Activity[]);
      setLeads(leadsRes.data as unknown as Lead[]);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (isAdminOrManager || isBDE) fetchDailyReports();
  }, [isAdminOrManager, isBDE, currentUser?.id, syncCounter]);

  useEffect(() => {
    const bdeChannel = supabase
      .channel("bde-roles-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, fetchBdeMembers)
      .subscribe();

    return () => {
      supabase.removeChannel(bdeChannel);
    };
  }, []);

  const handleDeleteReport = async () => {
    if (!reportToDelete) return;
    try {
      // Soft-delete the report instead of permanent removal
      const { error } = await supabase.from('bde_daily_reports' as any).update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('id', reportToDelete);
      if (error) throw error;

      // Remove from local state view
      setDailyReports(prev => prev.filter(r => (r as any).id !== reportToDelete));
      toast.success("Report removed from view (soft-deleted)");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete report");
      fetchDailyReports(); // Restore state if server delete failed
    } finally {
      setIsConfirmDeleteOpen(false);
      setReportToDelete(null);
    }
  };



  const fetchDailyReports = async () => {
    if (!currentUser?.id) return;
    setLoadingReports(true);
    try {
      let query = supabase
        .from('bde_daily_reports' as any)
        .select('*')
        .neq('is_deleted', true);
      
      if (!isAdminOrManager && isBDE) {
        query = query.eq('bde_id', currentUser.id);
      }

      const { data, error } = await query.order('report_date', { ascending: false });
      if (error) throw error;

      // Fetch profile names for BDE IDs
      if (data && data.length > 0) {
        const bdeIds = Array.from(new Set((data as any[]).map((r: any) => r.bde_id).filter(Boolean)));
        if (bdeIds.length > 0) {
          const { data: profiles, error: profileError } = await supabase
            .from('profiles' as any)
            .select('id, full_name')
            .in('id', bdeIds);
          
          if (!profileError && profiles) {
            const profileMap = Object.fromEntries(profiles.map((p: any) => [p.id, p]));
            const enriched = (data as any[]).map(r => ({
              ...r,
              profiles: profileMap[r.bde_id] || null
            }));
            setDailyReports(enriched);
          } else {
            setDailyReports(data || []);
          }
        } else {
          setDailyReports(data || []);
        }
      } else {
        setDailyReports(data || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      toast.error("Title is required");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        throw new Error("You must be logged in to create an activity");
      }

      const finalLeadId = leadId && leadId !== "none" ? leadId : null;

      let finalDueDate = null;
      if (dateStr) {
        let hourInt = parseInt(hourStr, 10);
        if (ampmStr === "PM" && hourInt < 12) hourInt += 12;
        if (ampmStr === "AM" && hourInt === 12) hourInt = 0;
        
        const timeString = `${hourInt.toString().padStart(2, '0')}:${minuteStr}:00`;
        finalDueDate = new Date(`${dateStr}T${timeString}`).toISOString();
      }

      const { error } = await supabase.from("activities" as any).insert({
        title,
        type,
        lead_id: finalLeadId,
        due_date: finalDueDate,
        created_by: userId,
      });

      if (error) throw error;
      
      toast.success("Activity created successfully");
      setIsDialogOpen(false);
      setTitle("");
      setType("call");
      setLeadId("");
      setDateStr("");
      setHourStr("12");
      setMinuteStr("00");
      setAmpmStr("AM");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create activity");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleComplete = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("activities" as any)
        .update({ completed: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      setActivities(activities.map(a => a.id === id ? { ...a, completed: !currentStatus } : a));
      toast.success("Status updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  const confirmDelete = (id: string) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      // Soft-delete activity instead of permanent removal
      const { error } = await supabase.from("activities" as any).update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("id", deleteId);
      if (error) throw error;
      toast.success("Activity removed from view (soft-deleted)");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete activity");
    } finally {
      setConfirmOpen(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Activities</h1>
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/crm/dashboard"}>
            View Dashboard
          </Button>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Activity</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Activity</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddActivity} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map(t => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Associated Lead</Label>
                <Select value={leadId} onValueChange={setLeadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lead (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {leads.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date & Time</Label>
                <div className="flex gap-2">
                  <Input type="date" className="flex-1" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
                  <Select value={hourStr} onValueChange={setHourStr}>
                    <SelectTrigger className="w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                        <SelectItem key={h} value={h.toString().padStart(2, '0')}>
                          {h.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={minuteStr} onValueChange={setMinuteStr}>
                    <SelectTrigger className="w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (i * 5)).map((m) => (
                        <SelectItem key={m} value={m.toString().padStart(2, '0')}>
                          {m.toString().padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={ampmStr} onValueChange={setAmpmStr}>
                    <SelectTrigger className="w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Activity
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {isBDE && (
          <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#c8a84b] hover:bg-[#a68a3d] text-black font-bold h-10 px-6 rounded-lg shadow-lg shadow-[#c8a84b]/10">
                <Plus className="mr-2 h-4 w-4" /> Submit Daily Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-neutral-900 border-white/10 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              <DialogHeader>
                <DialogTitle className="text-[#c8a84b]">SUBMIT DAILY REPORT</DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs">Enter your performance metrics for the selected date.</DialogDescription>
              </DialogHeader>
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const payload = {
                    bde_id: reportForm.bde_id,
                    company_id: currentUser?.company_id || null,
                    report_date: reportForm.report_date,
                    country: reportForm.country,
                    total_calls: Number(reportForm.total_calls) || 0,
                    calls_attended: Number(reportForm.calls_attended) || 0,
                    not_attended_calls: Number(reportForm.not_attended_calls) || 0,
                    linkedin_messages: Number(reportForm.linkedin_messages) || 0,
                    emails_sent: Number(reportForm.emails_sent) || 0,
                    new_leads: Number(reportForm.new_leads) || 0,
                    notes: reportForm.notes,
                    attended_names: selectedLeads.join(", ")
                  };

                  if (!payload.bde_id) {
                    toast.error("Please select a BDE Member Name");
                    return;
                  }

                  const { error } = await supabase.from('bde_daily_reports' as any).insert(payload as any);
                  if (error) throw error;
                  toast.success("Daily report submitted successfully");
                  setIsReportModalOpen(false);
                  setReportForm({
                    report_date: format(new Date(), 'yyyy-MM-dd'),
                    bde_id: '',
                    country: '',
                    total_calls: 0,
                    calls_attended: 0,
                    not_attended_calls: 0,
                    linkedin_messages: 0,
                    emails_sent: 0,
                    new_leads: 0,
                    notes: ''
                  });
                  setSelectedLeads([]);
                } catch (err: any) {
                  toast.error(err.message || "Failed to submit report");
                }
              }} className="grid grid-cols-2 gap-4 pt-4">
                <div className="col-span-2 space-y-2">
                  <Label>Report Date</Label>
                  <Input type="date" value={reportForm.report_date} onChange={e => setReportForm({...reportForm, report_date: e.target.value})} required className="bg-black/40 border-white/10 text-white" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>BDE Member Name *</Label>
                  <Select value={reportForm.bde_id} onValueChange={(val) => setReportForm({ ...reportForm, bde_id: val })}>
                    <SelectTrigger className="bg-black/40 border-white/10 text-white">
                      <SelectValue placeholder="Select member..." />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-white/10">
                      {loading ? (
                        <div className="p-2 text-xs text-muted-foreground text-center">Loading members...</div>
                      ) : bdeMembers.length === 0 ? (
                        <div className="p-2 text-xs text-muted-foreground text-center">No BDE members found.</div>
                      ) : (
                        bdeMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id} className="text-white">
                            {member.full_name || 'Unnamed Member'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>New Leads Added</Label>
                  <Input 
                    type="number" 
                    min={0}
                    value={reportForm.new_leads === 0 ? '' : reportForm.new_leads} 
                    onChange={e => setReportForm({...reportForm, new_leads: e.target.value === '' ? 0 : parseInt(e.target.value, 10)})} 
                    className="bg-black/40 border-white/10" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Calls</Label>
                  <Input 
                    type="number" 
                    min={0}
                    value={reportForm.total_calls === 0 ? '' : reportForm.total_calls} 
                    onChange={e => setReportForm({...reportForm, total_calls: e.target.value === '' ? 0 : parseInt(e.target.value, 10)})} 
                    className="bg-black/40 border-white/10" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Calls Attended</Label>
                  <Input 
                    type="number" 
                    min={0}
                    value={reportForm.calls_attended === 0 ? '' : reportForm.calls_attended} 
                    onChange={e => setReportForm({...reportForm, calls_attended: e.target.value === '' ? 0 : parseInt(e.target.value, 10)})} 
                    className="bg-black/40 border-white/10" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Not Attended Calls</Label>
                  <Input 
                    type="number" 
                    min={0}
                    value={reportForm.not_attended_calls === 0 ? '' : reportForm.not_attended_calls} 
                    onChange={e => setReportForm({...reportForm, not_attended_calls: e.target.value === '' ? 0 : parseInt(e.target.value, 10)})} 
                    className="bg-black/40 border-white/10" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn Messages</Label>
                  <Input 
                    type="number" 
                    min={0}
                    value={reportForm.linkedin_messages === 0 ? '' : reportForm.linkedin_messages} 
                    onChange={e => setReportForm({...reportForm, linkedin_messages: e.target.value === '' ? 0 : parseInt(e.target.value, 10)})} 
                    className="bg-black/40 border-white/10" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Emails Sent</Label>
                  <Input 
                    type="number" 
                    min={0}
                    value={reportForm.emails_sent === 0 ? '' : reportForm.emails_sent} 
                    onChange={e => setReportForm({...reportForm, emails_sent: e.target.value === '' ? 0 : parseInt(e.target.value, 10)})} 
                    className="bg-black/40 border-white/10" 
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Leads Name</Label>
                  <Popover open={isLeadsPopoverOpen} onOpenChange={setIsLeadsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between bg-black/40 border-white/10 text-left font-normal h-auto min-h-[40px] py-2"
                      >
                        <div className="flex flex-wrap gap-1 max-w-[300px]">
                          {selectedLeads.length > 0 
                            ? selectedLeads.join(", ")
                            : "Select company..."}
                        </div>
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[360px] p-0 bg-neutral-900 border-white/10" align="start">
                      <div className="p-2 border-b border-white/5">
                        <div className="flex items-center bg-black/20 rounded px-2">
                          <SearchIcon className="h-4 w-4 text-muted-foreground mr-2" />
                          <Input 
                            placeholder="Filter leads..." 
                            className="border-0 bg-transparent focus-visible:ring-0 h-8 text-xs" 
                            value={leadSearch}
                            onChange={e => setLeadSearch(e.target.value)}
                          />
                        </div>
                      </div>
                        <div className="max-h-[300px] overflow-y-auto p-1">
                          {filteredLeads.length === 0 && (
                            <div className="p-4 text-center text-xs text-muted-foreground">No leads found.</div>
                          )}
                          {filteredLeads.map((lead) => (
                            <div
                              key={lead.id}
                              className={`px-2 py-2 hover:bg-[#c8a84b]/10 cursor-pointer rounded text-xs ${selectedLeads.includes(lead.company_name) ? "text-[#c8a84b] font-bold bg-[#c8a84b]/5" : "text-white"}`}
                              onClick={() => {
                                if (selectedLeads.includes(lead.company_name)) {
                                  setSelectedLeads(selectedLeads.filter(s => s !== lead.company_name));
                                } else {
                                  setSelectedLeads([...selectedLeads, lead.company_name]);
                                }
                              }}
                            >
                              {lead.company_name}
                            </div>
                          ))}
                        </div>
                      <div className="p-2 border-t border-white/5 bg-black/20 flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">{selectedLeads.length} selected</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-[10px] text-[#c8a84b]"
                          onClick={() => setSelectedLeads([])}
                        >Clear All</Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Notes</Label>
                  <Textarea 
                    value={reportForm.notes} 
                    onChange={e => setReportForm({...reportForm, notes: e.target.value})} 
                    className="bg-black/40 border-white/10 min-h-[80px]" 
                  />
                </div>
                <Button 
                  type="submit" 
                  className="col-span-2 bg-[#c8a84b] hover:bg-[#a68a3d] text-black font-bold"
                >
                  SUBMIT PERFORMANCE LOG
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Lead / Company</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No activities found.
                </TableCell>
              </TableRow>
            ) : (
              activities.map((activity) => (
                <TableRow key={activity.id} className={activity.completed ? "opacity-60 bg-muted/30" : ""}>
                  <TableCell>
                    <Checkbox 
                      checked={activity.completed} 
                      onCheckedChange={() => toggleComplete(activity.id, activity.completed)} 
                    />
                  </TableCell>
                  <TableCell className={`font-medium ${activity.completed ? "line-through" : ""}`}>
                    {activity.title}
                  </TableCell>
                  <TableCell className="capitalize">{activity.type.replace("_", " ")}</TableCell>
                  <TableCell>{activity.leads?.company_name || "-"}</TableCell>
                  <TableCell>
                    {activity.due_date ? (
                      <div className="flex items-center text-sm">
                        <CalendarIcon className="mr-2 h-3 w-3 text-muted-foreground" />
                        {format(new Date(activity.due_date), "PPp")}
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={activity.completed ? "secondary" : "default"}>
                      {activity.completed ? "Completed" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => confirmDelete(activity.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Activity"
        description="Are you sure you want to delete this activity? This action cannot be undone."
        onConfirm={executeDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteId(null);
        }}
      />

    </div>
  );
}
