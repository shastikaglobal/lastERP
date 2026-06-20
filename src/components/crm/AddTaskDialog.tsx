import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CalendarIcon, Loader2 } from "lucide-react";

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddTaskDialog({ open, onOpenChange, onSuccess }: AddTaskDialogProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("To Do");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [leadId, setLeadId] = useState("");

  const [bdes, setBdes] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    if (open && profile?.company_id) {
      fetchBdes();
      fetchLeads();
    }
  }, [open, profile]);

  const fetchBdes = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/employees?company_id=${profile?.company_id || ''}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBdes(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeads = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/leads`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.filter((l: any) => !l.is_deleted));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return toast.error("Please enter a task title");
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/crm-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          title,
          priority,
          status,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          assigned_to: assignedTo && assignedTo !== "unassigned" ? assignedTo : null,
          lead_id: leadId && leadId !== "none" ? leadId : null,
          company_id: profile?.company_id
        })
      });

      if (!res.ok) throw new Error("Failed to create task");
      
      toast.success("Task created successfully");
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setPriority("Medium");
    setStatus("To Do");
    setDueDate("");
    setAssignedTo("");
    setLeadId("");
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) resetForm();
    }}>
      <DialogContent className="sm:max-w-[425px] bg-neutral-900 text-foreground border-border">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Assign a workflow task to a BDE or link it to a lead.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold">Task Title *</label>
            <Input 
              placeholder="e.g. Follow up on Turmeric proposal" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              className="bg-neutral-800 border-border text-xs"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="bg-neutral-800 border-border text-xs">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-border">
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-neutral-800 border-border text-xs">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-border">
                  <SelectItem value="To Do">To Do</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold">Due Date</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="date" 
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="bg-neutral-800 border-border pl-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold">Assign To</label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger className="bg-neutral-800 border-border text-xs">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-border max-h-40">
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {bdes.map(bde => (
                  <SelectItem key={bde.id} value={bde.id}>
                    {bde.full_name || bde.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold">Related Lead (Optional)</label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger className="bg-neutral-800 border-border text-xs">
                <SelectValue placeholder="No related lead" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-border max-h-40">
                <SelectItem value="none">None</SelectItem>
                {leads.map(lead => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="btn-gold text-xs shadow-md">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
