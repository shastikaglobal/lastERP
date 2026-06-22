import { Plus, Mail, Phone, Loader2, Search, Copy, CheckCircle2, MapPin, Calendar, Briefcase, Monitor } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/shared/FormShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth, useIsAdminOrManager } from "@/hooks/useAuth";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  requested_role: string | null;
  status: "pending" | "approved" | "rejected";
  is_active: boolean;
  avatar_url: string | null;
  biometric_id: string | null;
  dob?: string | null;
  joining_date?: string | null;
  system_mode?: string | null;
  city?: string | null;
};

const ROLE_NAMES: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  bde: "BDE",
  software_dev: "Software Developer",
  net_security: "Network & Security",
  data_analyst: "Data Analyst",
  secretary: "Secretary",
};


export default function EmployeeDirectory() {
  const { onlineUsers, roleSlugs, user, activeMinutes, idleMinutes, profile } = useAuth();
  const isAdminOrManager = useIsAdminOrManager();
  const isAdmin = Array.from(roleSlugs).map(s => s.toLowerCase()).includes("admin");
  const isShastikaGlobal = profile?.email === "shastikaglobal11@gmail.com";
  const [employees, setEmployees] = useState<ProfileRow[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const response = await fetch('/api/employees', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) throw new Error("Failed to fetch employees");
      const empls = await response.json();
      setEmployees(empls || []);
      
      // If admin, also fetch today's sessions (still using Supabase realtime for now until session module is migrated)
      if (isAdmin) {
        const todayStartsAt = new Date();
        todayStartsAt.setHours(0, 0, 0, 0);
        
        const { data: sessData } = await (supabase
          .from("user_sessions" as any) as any)
          .select("*")
          .or(`login_time.gte.${todayStartsAt.toISOString()},logout_time.is.null`)
          .order("login_time", { ascending: false });
        
        if (sessData) setSessions(sessData);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();

    const profileChannel = supabase
      .channel('public:profiles')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          setEmployees(prev => 
            prev.map(emp => emp.id === payload.new.id ? { ...emp, ...payload.new } : emp)
          );
        }
      )
      .subscribe();

    const sessionChannel = supabase
      .channel('public:user_sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_sessions' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSessions(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setSessions(prev => 
              prev.map(sess => sess.id === payload.new.id ? payload.new : sess)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [isAdmin]);

  const handleCopyLink = () => {
    const link = `${window.location.origin}/auth`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Registration link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSessionTime = (isoString: string | null) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();
    
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    if (isToday) return `Today ${timeStr}`;
    if (isYesterday) return `Yesterday ${timeStr}`;
    return `${date.toLocaleDateString()} ${timeStr}`;
  };

  const getSessionStats = (userId: string) => {
    const userSessions = sessions.filter(s => s.user_id === userId);
    if (userSessions.length === 0) return null;

    // Get the latest session to determine current status
    const latestSession = userSessions[0];
    const lastLogin = latestSession.login_time;
    const lastLogout = userSessions.find(s => s.logout_time)?.logout_time || null;
    const lastActivity = latestSession.last_activity;
    
    // Aggregation for today
    const stats = userSessions.reduce((acc, curr) => {
      acc.active += curr.active_minutes || 0;
      acc.idle += curr.idle_minutes || 0;
      return acc;
    }, { active: 0, idle: 0 });

    const formatMins = (totalMinutes: number) => {
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    // Determine status (Active, Idle, Offline)
    let status: "Active" | "Idle" | "Offline" = "Offline";
    
    // An open session has no logout_time
    const hasOpenSession = !latestSession.logout_time;
    
    if (hasOpenSession) {
      if (lastActivity) {
        const lastActiveDate = new Date(lastActivity);
        const diff = (new Date().getTime() - lastActiveDate.getTime()) / 60000;
        status = diff < 5 ? "Active" : "Idle";
      } else {
        // If no activity tracked yet but session is open, assume Active
        status = "Active";
      }
    }

    return { 
      lastLogin, 
      lastLogout,
      status,
      hasOpenSession,
      activeStr: formatMins(stats.active),
      idleStr: formatMins(stats.idle),
      workStr: formatMins(stats.active) // Work Time = active_minutes
    };
  };

  const handleForceLogout = async (userId: string, employeeName: string) => {
    const openSession = sessions.find(s => s.user_id === userId && !s.logout_time);
    
    try {
      const response = await fetch('http://127.0.0.1:8082/force-logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, sessionId: openSession?.id })
      });
      
      const data = await response.json();
      
      if (data.success && (data.updatedSession || data.updatedAttendance)) {
        toast.success(`Force logged out ${employeeName || 'user'}`);
      } else {
        toast.error("No active session or attendance found to punch out");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to connect to sync server for force logout");
    }
  };

  const handleSendPasswordReset = async (id: string, email: string | null) => {
    if (!isShastikaGlobal) {
      toast.error("Only shastikaglobal11 is authorized to reset passwords.");
      return;
    }
    if (!email) {
      toast.error("User does not have an email address");
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const response = await fetch(`/api/employees/${id}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to trigger reset password");
      }

      toast.success(result.message || "Password reset link sent to shastikaglobal11@gmail.com");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    }
  };

  const handleDeleteAccount = async (userId: string, fullName: string | null) => {
    if (!window.confirm(`Are you sure you want to deactivate ${fullName || 'this user'}? This will only archive the account and keep the data for auditing.`)) {
      return;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const response = await fetch(`/api/employees/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error("Failed to archive user");

      toast.success(`${fullName || 'User'} has been archived.`);
      setEmployees(prev => prev.filter(e => e.id !== userId));
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to archive user.");
    }
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-in fade-in zoom-in duration-300">
      <PageHeader 
        title="Employee Directory" 
        description="All team members across departments" 
        breadcrumbs={[{ label: "Employees" }]}
        actions={
          isAdminOrManager ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Invite New Employee</DialogTitle>
                  <DialogDescription>
                    For security reasons, new employees must create their own credentials. Share the registration link with them to get started.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col space-y-4 py-4">
                  <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground border border-border/50">
                    <ol className="list-decimal list-inside space-y-2">
                      <li>Copy the registration link below.</li>
                      <li>Send the link to the new employee.</li>
                      <li>They will create an account and verify their email.</li>
                      <li>Once registered, go to the <strong>User Approvals</strong> tab to approve them and assign their role.</li>
                    </ol>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input 
                      readOnly 
                      value={`${window.location.origin}/auth`} 
                      className="flex-1 bg-muted/50 cursor-copy"
                      onClick={handleCopyLink}
                    />
                    <Button size="icon" onClick={handleCopyLink} variant="secondary">
                      {copied ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <DialogFooter className="sm:justify-start">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Close
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : undefined
        }  
      />

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading directory...
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
          No employees found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((e, index) => {
            const initials = e.full_name
              ? e.full_name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
              : "?";
            const roleName = e.requested_role ? (ROLE_NAMES[e.requested_role] || e.requested_role) : "Employee";
            const stats = isAdmin ? getSessionStats(e.id) : null;
            const isOnline = onlineUsers.includes(e.id);
            const sessionStatus = stats?.status || "Offline";
            const currentStatus = (isOnline && sessionStatus === 'Offline') ? 'Active' : sessionStatus;

            const isCurrentUser = user && user.id === e.id;
            const formatMins = (totalMinutes: number) => {
              const hours = Math.floor(totalMinutes / 60);
              const mins = totalMinutes % 60;
              return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
            };

            const displayActiveStr = isCurrentUser ? formatMins(activeMinutes) : (stats?.activeStr || "-");
            const displayIdleStr = isCurrentUser ? formatMins(idleMinutes) : (stats?.idleStr || "-");
            const displayWorkStr = isCurrentUser ? formatMins(activeMinutes) : (stats?.workStr || "0m");

            return (
              <div 
                key={e.id} 
                className="group relative animate-bubbly h-full"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="h-full cute-card p-5 flex flex-col relative">
                  
                  {/* Cuteness Elements */}
                  <span className="flower-decor -top-3 -right-3 text-3xl" style={{ animationDirection: 'reverse' }}>🌸</span>
                  <span className="flower-decor bottom-10 -left-4 text-2xl">🌼</span>
                  <span className="butterfly-decor top-4 left-3 text-2xl">🦋</span>
                  
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0 z-10 avatar-cute">
                      <Dialog>
                        <DialogTrigger asChild>
                          <div className="h-16 w-16 rounded-[1.25rem] bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold text-2xl overflow-hidden shadow-sm cursor-pointer border border-amber-500/20">
                            {e.avatar_url ? (
                              <img src={e.avatar_url} alt={e.full_name || "Avatar"} className="h-full w-full object-cover" />
                            ) : (
                              initials
                            )}
                          </div>
                        </DialogTrigger>
                      {e.avatar_url && (
                        <DialogContent className="max-w-[400px] p-0 overflow-visible bg-transparent border-none shadow-none animate-in zoom-in-75 duration-500 ease-out fill-mode-both">
                          <span className="butterfly-fly-across">🦋</span>
                          <img src={e.avatar_url} alt={e.full_name || "Avatar"} className="w-full h-auto max-h-[80vh] object-contain rounded-2xl drop-shadow-2xl ring-1 ring-white/10 relative z-10" />
                        </DialogContent>
                      )}
                    </Dialog>
                    {isAdminOrManager && (
                      <span className={`absolute -bottom-1 -right-1 block h-4 w-4 rounded-full border-2 border-[#0a0a0a] shadow-sm ${
                        currentStatus === 'Active' ? 'bg-green-500' : 
                        currentStatus === 'Idle' ? 'bg-yellow-500' : 'bg-gray-600'
                      }`} title={currentStatus} />
                    )}
                  </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="font-bold text-[15px] truncate text-gray-100" title={e.full_name || "Unknown"}>
                        {e.full_name || "Unknown"}
                      </div>
                      {isAdminOrManager && !e.is_active && <StatusBadge status="Inactive" />}
                    </div>
                    <div className="text-[10px] font-black text-amber-500/80 bg-amber-500/5 inline-flex px-2 py-0.5 rounded border border-amber-500/10 mb-3 uppercase tracking-wider">
                      {roleName}
                    </div>
                    
                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center gap-2.5 text-gray-400 group">
                        <Mail className="h-3.5 w-3.5 shrink-0 group-hover:text-amber-500 transition-colors" />
                        <span className="truncate" title={e.email || "N/A"}>{e.email || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-gray-400 group">
                        <Phone className="h-3.5 w-3.5 shrink-0 group-hover:text-amber-500 transition-colors" />
                        <span>{e.phone || "N/A"}</span>
                      </div>
                      {e.city && (
                        <div className="flex items-center gap-2.5 text-gray-400 group">
                          <MapPin className="h-3.5 w-3.5 shrink-0 group-hover:text-amber-500 transition-colors" />
                          <span className="truncate" title={e.city}>{e.city}</span>
                        </div>
                      )}
                      {e.system_mode && (
                        <div className="flex items-center gap-2.5 text-gray-400 group">
                          <Monitor className="h-3.5 w-3.5 shrink-0 group-hover:text-amber-500 transition-colors" />
                          <span className="capitalize">{e.system_mode === 'wfh' ? 'Work from Home' : e.system_mode}</span>
                        </div>
                      )}
                      {e.joining_date && (
                        <div className="flex items-center gap-2.5 text-gray-400 group">
                          <Briefcase className="h-3.5 w-3.5 shrink-0 group-hover:text-amber-500 transition-colors" />
                          <span>Joined: {new Date(e.joining_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {e.dob && (
                        <div className="flex items-center gap-2.5 text-gray-400 group">
                          <Calendar className="h-3.5 w-3.5 shrink-0 group-hover:text-amber-500 transition-colors" />
                          <span>DOB: {new Date(e.dob).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                        <div className="grid grid-cols-2 gap-3 mb-2">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-black text-gray-500 tracking-tighter">Last Login</label>
                            <p className="text-[11px] font-bold text-gray-200">{stats ? formatSessionTime(stats.lastLogin) : "-"}</p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-black text-gray-500 tracking-tighter">Last Logout</label>
                            <p className="text-[11px] font-bold text-gray-200">{stats ? formatSessionTime(stats.lastLogout) : "-"}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-black text-gray-500 tracking-tighter">Active Time</label>
                            <p className="text-[11px] font-bold text-green-500">{displayActiveStr}</p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-black text-gray-500 tracking-tighter">Idle Time</label>
                            <p className="text-[11px] font-bold text-yellow-500">{displayIdleStr}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between bg-white/5 rounded-xl p-2.5 px-3 border border-white/5">
                          <div className="flex items-center gap-2">
                             <div className={`h-1.5 w-1.5 rounded-full ${
                               currentStatus === 'Active' ? 'bg-green-500 animate-pulse' : 
                               currentStatus === 'Idle' ? 'bg-yellow-500' : 'bg-red-500'
                             }`} />
                             <div className="flex flex-col">
                               <span className="text-[10px] font-black uppercase text-gray-400">
                                 {currentStatus}
                               </span>
                               {stats?.hasOpenSession && (
                                 <button
                                   onClick={() => handleForceLogout(e.id, e.full_name || 'User')}
                                   className="text-[8px] uppercase font-bold text-rose-500 hover:text-rose-400 hover:underline text-left transition-colors mt-0.5"
                                 >
                                   Force Log Out
                                 </button>
                               )}
                             </div>
                          </div>
                          <div className="text-right">
                             <span className="text-[9px] uppercase font-black text-gray-500 block leading-none mb-0.5">Work Time</span>
                             <span className="text-[11px] font-black text-amber-500">{displayWorkStr}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {isAdmin && (
                      <div className="mt-4 pt-4 border-t border-white/5 opacity-50 hover:opacity-100 transition-opacity">
                        <div className="flex justify-between items-center mb-3">
                          {isShastikaGlobal && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-[10px] h-7 px-2 border-white/10 hover:bg-white/5"
                              onClick={() => handleSendPasswordReset(e.id, e.email)}
                            >
                              Send Password Reset
                            </Button>
                          )}
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-[10px] h-7 px-2 border-rose-500/30 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
                            onClick={() => handleDeleteAccount(e.id, e.full_name)}
                          >
                            Remove Account
                          </Button>
                        </div>
                        <div className="text-[10px] uppercase font-bold text-gray-500 mb-1.5 flex justify-between items-center px-1">
                           <span>eSSL ID</span>
                           <span className="text-[9px] font-normal lowercase opacity-50 italic">biometric reference</span>
                        </div>
                        <Input
                          size={1}
                          className="h-8 text-xs bg-[#1a1a1a] border-white/5 font-mono text-amber-500"
                          placeholder="Machine ID..."
                          defaultValue={e.biometric_id || ""}
                          onBlur={async (event) => {
                            const val = event.target.value.trim();
                            if (val !== (e.biometric_id || "")) {
                              try {
                                const { data: { session } } = await supabase.auth.getSession();
                                if (!session) throw new Error("No active session");
                                
                                const response = await fetch(`/api/employees/${e.id}`, {
                                  method: 'PUT',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${session.access_token}`
                                  },
                                  body: JSON.stringify({ biometric_id: val || null })
                                });
                                
                                if (!response.ok) throw new Error("Failed to update ID");
                                toast.success(`Updated ID for ${e.full_name}`);
                              } catch (err) {
                                toast.error("Failed to update ID");
                              }
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

