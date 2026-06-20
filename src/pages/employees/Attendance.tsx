import { PageHeader } from "@/components/shared/PageHeader";
import { Section } from "@/components/shared/FormShell";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, differenceInDays, addDays, parseISO, startOfMonth } from "date-fns";
import { Loader2, Fingerprint, CheckCircle, Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EsslUploader } from "./EsslUploader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const generateDateArray = (startStr: string, endStr: string) => {
  try {
    const start = parseISO(startStr);
    const end = parseISO(endStr);
    const daysCount = differenceInDays(end, start) + 1;
    if (daysCount <= 0 || daysCount > 100) return [];
    return Array.from({ length: daysCount }, (_, i) => {
      return format(addDays(start, i), 'yyyy-MM-dd');
    });
  } catch (e) {
    return [];
  }
};

const salaryMap: Record<string, number> = {
  'Gayathri': 12000,
  'Jayasri S': 12000,
  'karunya': 12000,
  'Kaviya': 12000,
  'Lakshmana Gokul': 30000,
  'Madhumitha': 12000,
  'Nethra Sree': 8000,
  'Preethi M': 30000,
  'sathpreethika': 12000,
  'Swathi Swathi': 8000,
  'Vemula Navya Lahari': 12000,
  'Aditi': 12000,
  'uma parameshwari': 17000
};

const getEmpSalary = (fullName: string) => {
  if (!fullName) return 0;
  const name = fullName.trim().toLowerCase();
  for (const [key, value] of Object.entries(salaryMap)) {
    if (key.trim().toLowerCase() === name) {
      return value;
    }
  }
  return 0;
};

// Grace period and shift duration helper
const getLateMinutes = (clockInStr: string, deadlineStr: string | null) => {
  const deadline = deadlineStr || '08:00:00';
  const [dHours, dMinutes, dSeconds = 0] = deadline.split(':').map(Number);
  const punchDate = new Date(clockInStr);

  const deadlineDate = new Date(punchDate);
  deadlineDate.setHours(dHours, dMinutes, dSeconds, 0);

  if (punchDate.getTime() <= deadlineDate.getTime()) {
    return 0;
  }

  const diffMs = punchDate.getTime() - deadlineDate.getTime();
  return Math.floor(diffMs / (1000 * 60));
};

const getEmployeeMonthStats = (
  empId: string,
  monthStr: string, // 'yyyy-MM'
  emp: any,
  allLogs: Record<string, Record<string, any>>, // employee_id -> date -> log
  upToDateStr?: string // optional target date to calculate up to (e.g. endDate or today)
) => {
  const empLogs = allLogs[empId] || {};
  const monthlySalary = Number(emp.monthly_salary) || getEmpSalary(emp.full_name) || 0;
  const isPreethi = emp.full_name?.toLowerCase().includes("preethi");
  const perDay = isPreethi ? Math.round(monthlySalary / 22) : Math.floor(monthlySalary / 30); // 22 for Preethi, 30 for others
  const halfDay = Math.round(perDay / 2);
  const deadline = emp.punch_deadline || (emp.full_name?.toLowerCase().startsWith("preethi") ? "10:00:00" : "08:00:00");

  let calculationEnd: Date;
  if (upToDateStr && upToDateStr.startsWith(monthStr)) {
    calculationEnd = parseISO(upToDateStr);
  } else {
    // End of the month
    const [year, month] = monthStr.split('-').map(Number);
    calculationEnd = new Date(year, month, 0);
  }

  // Start of month
  const [year, month] = monthStr.split('-').map(Number);
  const calculationStart = new Date(year, month - 1, 1);

  // Generate all dates in the month up to calculationEnd
  const days: string[] = [];
  let curr = calculationStart;
  while (curr <= calculationEnd) {
    days.push(format(curr, 'yyyy-MM-dd'));
    curr = addDays(curr, 1);
  }

  let paidLeavesUsed = 0;
  let unpaidLeavesUsed = 0;
  const excusedPermissionsUsed = 0; // cumulative excused late minutes
  let totalCut = 0;

  const dailyDetails: Record<string, {
    status: 'present' | 'late_on_time' | 'late_cut' | 'paid_leave' | 'unpaid_leave' | 'absent';
    cut: number;
    isExcused: boolean;
    minutesLate: number;
    explanation: string;
  }> = {};

  days.forEach(dateStr => {
    const log = empLogs[dateStr];

    const systemStartStr = emp.joining_date || '2026-06-01';
    if (dateStr < systemStartStr) {
      const d = new Date(dateStr);
      const isSunday = d.getDay() === 0 || (isPreethi && d.getDay() === 6);

      dailyDetails[dateStr] = {
        status: 'absent',
        cut: 0,
        isExcused: false,
        minutesLate: 0,
        explanation: 'Not Joined'
      };
      return;
    }

    if (log && log.status === 'on_leave') {
      paidLeavesUsed++;
      if (paidLeavesUsed <= 1) {
        dailyDetails[dateStr] = {
          status: 'paid_leave',
          cut: 0,
          isExcused: false,
          minutesLate: 0,
          explanation: 'Paid Leave (Within monthly 1-day limit)'
        };
      } else {
        totalCut += perDay;
        unpaidLeavesUsed++;
        dailyDetails[dateStr] = {
          status: 'unpaid_leave',
          cut: perDay,
          isExcused: false,
          minutesLate: 0,
          explanation: 'Unpaid Leave (Monthly 1-day paid leave limit exceeded)'
        };
      }
      return;
    }

    const isWfh = emp.system_mode === 'wfh' || emp.full_name?.toLowerCase().includes("vemula") || emp.full_name?.toLowerCase().includes("aditi");

    if (isWfh) {
      dailyDetails[dateStr] = {
        status: 'present',
        cut: 0,
        isExcused: false,
        minutesLate: 0,
        explanation: 'Work from Home'
      };
      return;
    }

    if (log) {
      if (log.clock_in) {
        const minutesLate = getLateMinutes(log.clock_in, deadline);
        const isLate = minutesLate >= 2;

        if (isLate) {
          if (log.is_excused) {
            dailyDetails[dateStr] = {
              status: 'present',
              cut: 0,
              isExcused: true,
              minutesLate,
              explanation: `Late (Admin Excused)`
            };
          } else {
            totalCut += halfDay;
            dailyDetails[dateStr] = {
              status: 'late_cut',
              cut: halfDay,
              isExcused: false,
              minutesLate,
              explanation: 'Late (No permission)'
            };
          }
        } else {
          dailyDetails[dateStr] = {
            status: 'present',
            cut: 0,
            isExcused: false,
            minutesLate,
            explanation: 'On Time'
          };
        }
      } else {
        // Absent (log exists but no clock_in and not on_leave)
        const d = new Date(dateStr);
        const isSunday = d.getDay() === 0 || (isPreethi && d.getDay() === 6);
        const isFuture = dateStr > format(new Date(), 'yyyy-MM-dd');
        const isPenaltyFree = isSunday || isFuture;

        if (!isPenaltyFree) {
          totalCut += perDay;
        }
        dailyDetails[dateStr] = {
          status: isSunday ? 'present' : 'absent',
          cut: isPenaltyFree ? 0 : perDay,
          isExcused: false,
          minutesLate: 0,
          explanation: isSunday ? 'Weekend (Holiday)' : (isFuture ? 'Pending' : 'Absent (No clock in)')
        };
      }
    } else {
      // Absent / No record
      const d = new Date(dateStr);
      const isSunday = d.getDay() === 0 || (isPreethi && d.getDay() === 6);
      const isFuture = dateStr > format(new Date(), 'yyyy-MM-dd');
      const isPenaltyFree = isSunday || isFuture;

      if (!isPenaltyFree) {
        totalCut += perDay;
      }
      dailyDetails[dateStr] = {
        status: isSunday ? 'present' : 'absent',
        cut: isPenaltyFree ? 0 : perDay,
        isExcused: false,
        minutesLate: 0,
        explanation: isSunday ? 'Weekend (Holiday)' : (isFuture ? 'Pending' : 'Absent (No record)')
      };
    }
  });

  return {
    paidLeavesUsed,
    unpaidLeavesUsed,
    excusedPermissionsUsed,
    totalCut,
    dailyDetails
  };
};

export default function Attendance() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, any>>({});
  const [myTodayStatus, setMyTodayStatus] = useState<any>(null);
  const [punching, setPunching] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Dynamic Date States
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [preset, setPreset] = useState("this_month");

  // Settings Modal States
  const [settingsEmp, setSettingsEmp] = useState<any | null>(null);
  const [settingsSalary, setSettingsSalary] = useState<string>("0");
  const [settingsDeadline, setSettingsDeadline] = useState<string>("08:00");
  const [savingSettings, setSavingSettings] = useState(false);

  // Manual Time Entry States
  const [enteringTimeEmpId, setEnteringTimeEmpId] = useState<string | null>(null);
  const [enteringTimeType, setEnteringTimeType] = useState<"in" | "out">("in");
  const [manualTime, setManualTime] = useState<string>("09:00");
  const [savingManualTime, setSavingManualTime] = useState(false);

  const daysInRange = useMemo(() => {
    return generateDateArray(startDate, endDate);
  }, [startDate, endDate]);

  // Dynamic Summary calculations for the active endDate
  const summaryStats = useMemo(() => {
    const total = employees.length;
    let onTime = 0;
    let late = 0;
    let totalCut = 0;
    const todayStr = endDate;

    employees.forEach(emp => {
      const stats = getEmployeeMonthStats(emp.id, todayStr.substring(0, 7), emp, attendanceData, todayStr);
      const detail = stats.dailyDetails[todayStr];

      if (detail) {
        totalCut += detail.cut;
        if (detail.status === 'paid_leave' || detail.status === 'present') {
          onTime++;
        } else if (detail.status === 'late_cut') {
          late++;
        }
      }
    });

    return {
      total,
      onTime,
      late,
      totalCut
    };
  }, [employees, attendanceData, endDate]);

  const openSettings = (emp: any) => {
    try {
      setSettingsEmp(emp);
      setSettingsSalary(String(emp.monthly_salary ?? getEmpSalary(emp.full_name) ?? 0));
      const defaultDeadline = emp.full_name?.toLowerCase().startsWith("preethi") ? "10:00:00" : "08:00:00";
      const deadlineStr = typeof emp.punch_deadline === 'string' && emp.punch_deadline ? emp.punch_deadline : defaultDeadline;
      setSettingsDeadline(String(deadlineStr).slice(0, 5));
    } catch (e) {
      console.error("Error in openSettings:", e);
      // Fallback
      setSettingsEmp(emp);
      setSettingsSalary("0");
      setSettingsDeadline("08:00");
    }
  };

  const saveSettings = async () => {
    if (!settingsEmp) return;
    setSavingSettings(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      // Save to VPS database (source of truth for attendance)
      const response = await fetch(`/api/employees/${settingsEmp.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          monthly_salary: Number(settingsSalary) || 0,
          punch_deadline: settingsDeadline + ":00"
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update settings');
      }

      // Also update Supabase (best effort sync)
      try {
        await supabase
          .from('profiles')
          .update({
            monthly_salary: Number(settingsSalary) || 0,
            punch_deadline: settingsDeadline + ":00"
          })
          .eq('id', settingsEmp.id);
      } catch { /* ignore supabase sync error */ }

      toast.success("Settings updated successfully!");
      setSettingsEmp(null);
      await loadData(startDate, endDate);
    } catch (e: any) {
      toast.error(e.message || "Failed to update settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveManualTime = async (emp: any) => {
    if (!manualTime) return;
    setSavingManualTime(true);
    const todayStr = endDate;
    try {
      const timeIso = new Date(`${todayStr}T${manualTime}`).toISOString();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) throw new Error("No active session found");

      const existingLog = attendanceData[emp.id]?.[todayStr];
      const payload: any = {
        employee_id: emp.id,
        date: todayStr,
      };

      if (enteringTimeType === "out") {
        payload.check_in = existingLog?.clock_in;
        payload.check_out = timeIso;
      } else {
        payload.check_in = timeIso;
        payload.check_out = existingLog?.clock_out || null;
      }

      const response = await fetch('/api/attendance/manual-time', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save attendance');
      }

      toast.success("Attendance saved successfully!");
      setEnteringTimeEmpId(null);
      await loadData(startDate, endDate);
    } catch (e: any) {
      toast.error(e.message || "Failed to save attendance");
    } finally {
      setSavingManualTime(false);
    }
  };

  const handleMarkOnLeave = async (emp: any) => {
    const todayStr = endDate;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session found");

      const response = await fetch('/api/attendance/mark-leave', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          employee_id: emp.id,
          date: todayStr
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to mark leave');
      }

      toast.success("Marked as Paid Leave");
      await loadData(startDate, endDate);
    } catch (e: any) {
      toast.error(e.message || "Failed to mark leave");
    }
  };

  const handleMarkOD = async (emp: any) => {
    const todayStr = endDate;
    try {
      const clockInTime = new Date(`${todayStr}T08:00:00`).toISOString();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) throw new Error("No active session found");

      const response = await fetch('/api/attendance/mark-od', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          employee_id: emp.id,
          date: todayStr,
          check_in: clockInTime,
          od_reason: 'Field Trip (OD)'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to mark OD');
      }

      toast.success("Marked as OD / Field Trip");
      await loadData(startDate, endDate);
    } catch (e: any) {
      toast.error(e.message || "Failed to mark OD");
    }
  };

  const handleToggleExcused = async (logId: string, checked: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session found");

      const response = await fetch('/api/attendance/toggle-excused', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          id: logId,
          is_excused: checked
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update permission');
      }

      toast.success(checked ? "Excused status applied (No salary cut)" : "Removed excused status");
      await loadData(startDate, endDate);
    } catch (e: any) {
      toast.error(e.message || "Failed to update permission");
    }
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session found");

      const response = await fetch('/api/attendance/delete-log', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          id: logId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to clear record');
      }

      toast.success("Record cleared");
      await loadData(startDate, endDate);
    } catch (e: any) {
      toast.error(e.message || "Failed to clear record");
    }
  };

  const downloadReport = () => {
    const todayStr = endDate;

    // CSV Header
    const headers = [
      "Employee Name",
      "Role",
      "Bio ID",
      "Punch Deadline",
      "Punch In Time",
      "Status",
      "Explanation",
      "Monthly Salary",
      "Per Day Salary",
      "Cut Amount (INR)"
    ];

    const rows = employees.map(emp => {
      const log = attendanceData[emp.id]?.[todayStr];
      const monthlySalary = Number(emp.monthly_salary) || getEmpSalary(emp.full_name) || 0;
      const isPreethi = emp.full_name?.toLowerCase().includes("preethi");
      const perDay = Math.round(monthlySalary / (isPreethi ? 22 : 26)); // 22 for Preethi, 26 for others
      const deadline = emp.punch_deadline || (emp.full_name?.toLowerCase().startsWith("preethi") ? "10:00:00" : "08:00:00");

      const stats = getEmployeeMonthStats(emp.id, todayStr.substring(0, 7), emp, attendanceData, todayStr);
      const detail = stats.dailyDetails[todayStr] || { status: 'absent', cut: perDay, explanation: 'Absent', isExcused: false, minutesLate: 0 };

      let punchInTime = "—";
      if (log && log.clock_in) {
        punchInTime = format(new Date(log.clock_in), 'hh:mm a');
      }

      let displayStatus = "Absent";
      if (detail.status === 'paid_leave') displayStatus = "Paid Leave";
      else if (detail.status === 'unpaid_leave') displayStatus = "Unpaid Leave";
      else if (detail.status === 'present') {
        if (log?.notes === 'Field Trip (OD)') {
          displayStatus = "Field Trip (OD)";
        } else {
          displayStatus = log?.is_manual ? "Manual (On Time)" : (detail.isExcused ? "Late (Excused)" : "On Time");
        }
      } else if (detail.status === 'late_cut') {
        displayStatus = log?.is_manual ? "Manual (Late)" : "Late";
      }

      return [
        emp.full_name,
        emp.requested_role?.replace('_', ' ') || 'Employee',
        emp.biometric_id || '—',
        deadline.slice(0, 5),
        punchInTime,
        displayStatus,
        detail.explanation,
        monthlySalary,
        perDay,
        detail.cut
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_report_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadData = async (startVal: string, endVal: string) => {
    setLoading(true);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);

    // Fetch approved profiles via local API
    const { data: { session: empSession } } = await supabase.auth.getSession();
    let profiles = [];
    try {
      const empRes = await fetch('/api/employees', {
        headers: { 'Authorization': `Bearer ${empSession?.access_token}` }
      });
      if (!empRes.ok) {
        toast.error("Failed to load employees");
        setLoading(false);
        return;
      }
      profiles = await empRes.json();
    } catch (err) {
      console.error("Fetch API Error (Employees):", err);
      toast.error("Network error: Cannot reach the backend API. Are you connected to the office network?");
      setLoading(false);
      return;
    }
    const profErr = null;

    // Exclude owners
    const filtered = (profiles || []).filter(p =>
      !p.full_name?.toLowerCase().includes("lakshmana gokul")
    );

    // Deduplicate by full_name — prefer entry with a biometric_id if one exists
    const seen = new Map<string, any>();
    filtered.forEach(p => {
      const key = (p.full_name || '').trim().toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, p);
      } else if (p.biometric_id && !seen.get(key)?.biometric_id) {
        // Upgrade to the one that has a biometric_id
        seen.set(key, p);
      }
    });
    const deduplicated = Array.from(seen.values());
    setEmployees(deduplicated);

    const myProfile = profiles?.find(p => p.id === user?.id);
    if (myProfile?.company_id) setCompanyId(myProfile.company_id);

    // Fetch attendance logs within dynamic range expanded to full calendar month boundaries
    const firstDayOfMonth = format(startOfMonth(parseISO(startVal)), 'yyyy-MM-dd');
    const endOfMonthDate = new Date(parseISO(endVal));
    const nextMonth = new Date(endOfMonthDate.getFullYear(), endOfMonthDate.getMonth() + 1, 1);
    const lastDayOfMonth = format(subDays(nextMonth, 1), 'yyyy-MM-dd');

    // Fetch from VPS API instead of Supabase
    const { data: { session } } = await supabase.auth.getSession();
    let logs: any[] = [];
    let logsErr = null;

    if (session) {
      try {
        const response = await fetch(`/api/attendance?start=${firstDayOfMonth}&end=${lastDayOfMonth}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (!response.ok) throw new Error('Network response was not ok');
        logs = await response.json();
      } catch (err) {
        logsErr = err;
        console.error("Fetch API Error:", err);
      }
    }

    if (!logsErr && logs) {
      const grouped: Record<string, any> = {};
      logs.forEach(log => {
        if (!grouped[log.employee_id]) grouped[log.employee_id] = {};
        grouped[log.employee_id][log.date] = log;

        // Check my status today
        if (log.employee_id === user?.id && log.date === format(new Date(), 'yyyy-MM-dd')) {
          setMyTodayStatus(log);
        }
      });
      setAttendanceData(grouped);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData(startDate, endDate);

    // Subscribe to realtime updates via Supabase Broadcast (from VPS server)
    const channel = supabase
      .channel('global_data_sync')
      .on(
        'broadcast',
        { event: 'data_changed' },
        (payload) => {
          if (payload.payload?.table === 'attendance_logs' || payload.payload?.table === 'face_attendance') {
            loadData(startDate, endDate);
          }
        }
      )
      .subscribe();

    // Fallback poll for updates from VPS database every 30 seconds
    const pollInterval = setInterval(() => {
      loadData(startDate, endDate);
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [startDate, endDate]);

  const handlePresetChange = (value: string) => {
    if (value === "custom") {
      setPreset(value);
      return;
    }
    setPreset(value);
    const today = new Date();
    let newStart = subDays(today, 13);
    let newEnd = today;

    if (value === "today") {
      newStart = today;
      newEnd = today;
    } else if (value === "yesterday") {
      newStart = subDays(today, 1);
      newEnd = subDays(today, 1);
    } else if (value === "7days") {
      newStart = subDays(today, 6);
      newEnd = today;
    } else if (value === "14days") {
      newStart = subDays(today, 13);
      newEnd = today;
    } else if (value === "30days") {
      newStart = subDays(today, 29);
      newEnd = today;
    } else if (value === "this_month") {
      newStart = startOfMonth(today);
      newEnd = today;
    }

    setStartDate(format(newStart, 'yyyy-MM-dd'));
    setEndDate(format(newEnd, 'yyyy-MM-dd'));
  };

  const handleStartDateChange = (val: string) => {
    if (!val) return;
    setPreset("custom");

    try {
      const start = parseISO(val);
      const end = parseISO(endDate);
      const diff = differenceInDays(end, start);
      if (diff < 0) {
        setStartDate(val);
        setEndDate(val);
      } else if (diff >= 31) {
        toast.warning("Date range limited to maximum 31 days. Adjusted End Date.");
        setStartDate(val);
        setEndDate(format(addDays(start, 30), 'yyyy-MM-dd'));
      } else {
        setStartDate(val);
      }
    } catch (e) {
      setStartDate(val);
    }
  };

  const handleEndDateChange = (val: string) => {
    if (!val) return;
    setPreset("custom");

    try {
      const start = parseISO(startDate);
      const end = parseISO(val);
      const diff = differenceInDays(end, start);
      if (diff < 0) {
        setEndDate(val);
        setStartDate(val);
      } else if (diff >= 31) {
        toast.warning("Date range limited to maximum 31 days. Adjusted Start Date.");
        setEndDate(val);
        setStartDate(format(subDays(end, 30), 'yyyy-MM-dd'));
      } else {
        setEndDate(val);
      }
    } catch (e) {
      setEndDate(val);
    }
  };

  const handlePunch = async () => {
    if (!userId) return toast.error("User ID missing");

    setPunching(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session found");

      const response = await fetch('/api/attendance/punch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to record attendance');
      }

      const resData = await response.json();
      toast.success(resData.type === 'in' ? "Successfully Punched In!" : "Successfully Punched Out!");
      await loadData(startDate, endDate); // Reload
    } catch (e: any) {
      toast.error(e.message || "Failed to record attendance");
    } finally {
      setPunching(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in zoom-in duration-300">
      <PageHeader
        title="Attendance"
        description="Track team presence and punch in for the day"
        breadcrumbs={[{ label: "Employees" }, { label: "Attendance" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={downloadReport} variant="outline" size="sm">
              Download Report
            </Button>
            <EsslUploader employees={employees} onUploadComplete={() => loadData(startDate, endDate)} />
          </div>
        }
      />

      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Employees</span>
          <span className="text-2xl font-bold mt-1">{summaryStats.total}</span>
        </div>
        <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-emerald-600 dark:text-emerald-400">On Time</span>
          <span className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{summaryStats.onTime}</span>
        </div>
        <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-amber-500">Late</span>
          <span className="text-2xl font-bold mt-1 text-amber-500">{summaryStats.late}</span>
        </div>
        <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-rose-500">Total Salary Cut</span>
          <span className="text-2xl font-bold mt-1 text-rose-500">₹{summaryStats.totalCut.toLocaleString()}</span>
        </div>
      </div>

      {/* Date Range Selector Toolbar */}
      <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Presets:</span>
          <Select value={preset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[140px] h-9 bg-background">
              <SelectValue placeholder="Select preset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="14days">Last 14 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">From:</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-[140px] h-9 bg-background text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">To:</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="w-[140px] h-9 bg-background text-sm"
            />
          </div>
        </div>
      </div>

      {/* Live Team Presence Dashboard */}
      <div className="space-y-3 bg-card p-6 rounded-xl border shadow-sm">
        <div>
          <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Team Presence ({endDate === format(new Date(), 'yyyy-MM-dd') ? 'Today' : format(parseISO(endDate), 'MMM dd, yyyy')})
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Biometric punch status of employees for {endDate === format(new Date(), 'yyyy-MM-dd') ? 'today' : format(parseISO(endDate), 'MMM dd, yyyy')}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading status...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {employees.map((emp) => {
              const todayStr = endDate;
              const log = attendanceData[emp.id]?.[todayStr];
              const stats = getEmployeeMonthStats(emp.id, todayStr.substring(0, 7), emp, attendanceData, todayStr);
              const detail = stats.dailyDetails[todayStr] || { status: 'absent', cut: 0, explanation: '', isExcused: false, minutesLate: 0 };

              let statusBadge = (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                  Not Synced
                </span>
              );

              if (log) {
                if (log.status === 'on_leave') {
                  if (detail.status === 'paid_leave') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        Paid Leave
                      </span>
                    );
                  } else {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        Unpaid Leave
                      </span>
                    );
                  }
                } else if (log.notes === 'Field Trip (OD)') {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Field Trip (OD)
                    </span>
                  );
                } else if (log.is_manual) {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Manual
                    </span>
                  );
                } else if (log.clock_out) {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Punched Out
                    </span>
                  );
                } else if (log.clock_in) {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 animate-pulse">
                      Punched In
                    </span>
                  );
                }
              }

              const initials = emp.full_name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase() || "?";

              return (
                <div key={emp.id} className="bg-background hover:bg-muted/10 transition-all duration-300 p-4 rounded-lg border flex flex-col justify-between space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold truncate text-foreground flex-1">{emp.full_name}</h4>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground transition-colors p-1"
                          onClick={() => openSettings(emp)}
                          title="Settings"
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate capitalize">
                        {emp.requested_role?.replace('_', ' ') || 'Employee'}
                        {emp.biometric_id && ` • Bio ID: ${emp.biometric_id}`}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/50 flex flex-col space-y-1 text-[11px] flex-1 justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        {statusBadge}
                      </div>
                      {log?.clock_in && log.status !== 'on_leave' && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">In:</span>
                            <span className="font-medium text-foreground">{format(new Date(log.clock_in), 'hh:mm a')}</span>
                          </div>
                          {(() => {
                            const deadline = emp.punch_deadline || (emp.full_name?.toLowerCase().startsWith("preethi") ? "10:00:00" : "08:00:00");
                            const minutesLate = getLateMinutes(log.clock_in, deadline);
                            const isLate = minutesLate >= 2;

                            if (isLate) {
                              const monthlySalary = Number(emp.monthly_salary) || getEmpSalary(emp.full_name) || 0;
                              const perDay = Math.round(monthlySalary / 26);
                              const halfDay = Math.round(perDay / 2);
                              const isExcused = log.is_excused;

                              return (
                                <div className="flex flex-col items-end mt-1">
                                  <div className={`${isExcused ? 'text-emerald-500 dark:text-emerald-400 line-through' : 'text-rose-500'} text-[10px] font-semibold mt-0.5`}>
                                    ⚠ Half Day Cut: ₹{halfDay}
                                  </div>
                                  <label className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={!!log.is_excused}
                                      onChange={(e) => handleToggleExcused(log.id, e.target.checked)}
                                      className="h-3 w-3 rounded border-border text-primary focus:ring-primary bg-background"
                                    />
                                    Excused (Told Admin)
                                  </label>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </>
                      )}
                      {log?.clock_out && log.status !== 'on_leave' && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Out:</span>
                          <span className="font-medium text-foreground">{format(new Date(log.clock_out), 'hh:mm a')}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 pt-2 border-t border-border/30">
                      {log?.status === 'on_leave' && (
                        <div className="flex flex-col items-end">
                          {detail.status === 'unpaid_leave' && (
                            <div className="text-rose-500 text-[10px] font-semibold mb-1">
                              ⚠ Unpaid Leave Cut: ₹{detail.cut}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteLog(log.id)}
                            className="text-[10px] font-semibold text-rose-500 hover:underline"
                          >
                            Cancel Paid Leave
                          </button>
                        </div>
                      )}
                      {log && log.status !== 'on_leave' && !log.clock_out && (
                        <div className="flex items-center justify-between w-full mt-1 gap-2">
                          {emp.id === userId ? (
                            <button
                              type="button"
                              onClick={handlePunch}
                              disabled={punching}
                              className="text-[10px] font-semibold bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded transition-colors disabled:opacity-50 flex items-center justify-center flex-1"
                            >
                              {punching && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                              Punch Out
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              setEnteringTimeEmpId(emp.id);
                              setEnteringTimeType("out");
                              setManualTime("17:00");
                            }}
                            className="text-[10px] font-semibold text-primary hover:underline flex-1 text-right"
                          >
                            Enter Out Time
                          </button>
                        </div>
                      )}
                      {log && log.status !== 'on_leave' && log.is_manual && (
                        <div className="mt-1 pt-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleDeleteLog(log.id)}
                            className="text-[10px] font-semibold text-rose-500 hover:underline"
                          >
                            Clear Manual Time
                          </button>
                        </div>
                      )}
                      {!log && (
                        <div className="flex items-center justify-between w-full flex-wrap gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => handleMarkOnLeave(emp)}
                            className="text-[10px] font-semibold text-purple-600 hover:underline"
                          >
                            Mark Paid Leave
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkOD(emp)}
                            className="text-[10px] font-semibold text-blue-500 hover:underline"
                          >
                            Mark OD (Field Trip)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEnteringTimeEmpId(emp.id);
                              setEnteringTimeType("in");
                              setManualTime("09:00");
                            }}
                            className="text-[10px] font-semibold text-primary hover:underline"
                          >
                            Enter Time
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEnteringTimeEmpId(emp.id);
                              setEnteringTimeType("out");
                              setManualTime("18:00");
                            }}
                            className="text-[10px] font-semibold text-amber-600 hover:underline"
                          >
                            Enter Out Time
                          </button>
                        </div>
                      )}
                      {enteringTimeEmpId === emp.id && (
                        <div className="flex items-center gap-1.5 w-full mt-2 pt-2 border-t border-border/30">
                          <Input
                            type="time"
                            value={manualTime}
                            onChange={(e) => setManualTime(e.target.value)}
                            className="h-7 text-[10px] py-0 px-1 w-24 bg-background"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveManualTime(emp)}
                            disabled={savingManualTime}
                            className="text-[10px] font-semibold px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/95 transition-colors disabled:opacity-50"
                          >
                            {savingManualTime ? "..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEnteringTimeEmpId(null)}
                            className="text-[10px] font-semibold px-2 py-1 rounded border hover:bg-muted/50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {/* Monthly statistics summary */}
                      <div className="pt-2 mt-2 border-t border-border/30 flex items-center justify-between text-[9px] text-muted-foreground font-medium">
                        <span>This Month:</span>
                        <span>
                          {stats.paidLeavesUsed}/1 Paid Leave • {stats.excusedPermissionsUsed}m Permission
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {employees.length === 0 && (
              <div className="col-span-full text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
                No employees available.
              </div>
            )}
          </div>
        )}
      </div>

      <Section>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading records...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left text-xs uppercase font-medium text-muted-foreground px-3 py-2">Employee</th>
                <th className="text-right text-xs uppercase font-medium text-muted-foreground px-2 py-2">Salary</th>
                {daysInRange.map((dateStr) => (
                  <th key={dateStr} className="text-center text-xs font-medium text-muted-foreground px-1 py-2">
                    {format(parseISO(dateStr), 'dd')}
                  </th>
                ))}
                <th className="text-right text-xs uppercase font-medium text-muted-foreground px-2 py-2">Paid Leaves</th>
                <th className="text-right text-xs uppercase font-medium text-muted-foreground px-2 py-2">Unpaid Leaves</th>
                <th className="text-right text-xs uppercase font-medium text-muted-foreground px-2 py-2">Permissions</th>
                <th className="text-right text-xs uppercase font-medium text-muted-foreground px-2 py-2">Total Cut</th>
                <th className="text-right text-xs uppercase font-medium text-muted-foreground px-3 py-2">Total Salary</th>
              </tr></thead>
              <tbody>
                {employees.map((e) => {
                  let rangePaidLeaves = 0;
                  let rangeUnpaidLeaves = 0;
                  let rangePermissionsMins = 0;
                  let rangeTotalCut = 0;
                  let rangePresentCount = 0;

                  const monthStatsCache: Record<string, any> = {};
                  const getCachedMonthStats = (monthStr: string) => {
                    const key = `${e.id}-${monthStr}`;
                    if (!monthStatsCache[key]) {
                      monthStatsCache[key] = getEmployeeMonthStats(e.id, monthStr, e, attendanceData);
                    }
                    return monthStatsCache[key];
                  };

                  const currentMonthStr = endDate.substring(0, 7);
                  const dayElements = daysInRange.map(dateStr => {
                    const monthStr = dateStr.substring(0, 7);
                    const stats = getCachedMonthStats(monthStr);
                    const detail = stats.dailyDetails[dateStr] || { status: 'absent', cut: 0, explanation: '', isExcused: false, minutesLate: 0 };

                    const log = attendanceData[e.id]?.[dateStr];
                    const isCurrentMonth = monthStr === currentMonthStr;

                    if (isCurrentMonth) {
                      if (detail.status === 'paid_leave') {
                        rangePaidLeaves++;
                        rangePresentCount += 1;
                      } else if (detail.status === 'unpaid_leave') {
                        rangeUnpaidLeaves++;
                        rangeTotalCut += detail.cut;
                      } else if (detail.status === 'present') {
                        rangePresentCount += 1;
                        if (detail.isExcused) {
                          rangePermissionsMins += detail.minutesLate;
                        }
                      } else if (detail.status === 'late_cut') {
                        rangePresentCount += 0.5;
                        rangeTotalCut += detail.cut;
                      } else {
                        rangeTotalCut += detail.cut;
                      }
                    }

                    const clockInStr = log?.clock_in ? format(new Date(log.clock_in), 'hh:mm a') : null;
                    const clockOutStr = log?.clock_out ? format(new Date(log.clock_out), 'hh:mm a') : null;

                    let cellBg = "bg-muted/40 border-border/40";
                    let statusLabel = "";
                    if (detail.explanation === 'Not Joined') {
                      cellBg = "bg-muted/40 border-border/40 text-muted-foreground/30";
                      statusLabel = "—";
                    } else if (detail.explanation === 'Work from Home') {
                      cellBg = "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400";
                      statusLabel = "WFH";
                    } else if (detail.explanation === 'Weekend (Holiday)') {
                      cellBg = "bg-muted/40 border-border/40 text-muted-foreground";
                      statusLabel = "WEEKEND";
                    } else if (detail.status === 'paid_leave') {
                      cellBg = "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400";
                      statusLabel = "PAID LEAVE";
                    } else if (detail.status === 'unpaid_leave') {
                      cellBg = "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400";
                      statusLabel = "UNPAID LEAVE";
                    } else if (detail.status === 'absent') {
                      if (dateStr > format(new Date(), 'yyyy-MM-dd')) {
                        statusLabel = ""; // Future
                      } else {
                        cellBg = "bg-rose-500/5 border-rose-500/10 text-rose-500/50";
                        statusLabel = "ABSENT";
                      }
                    } else if (detail.status === 'late_cut') {
                      cellBg = "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400";
                      statusLabel = "LATE";
                    }

                    const tooltip = log
                      ? `${format(parseISO(dateStr), 'MMM dd')} - ${statusLabel || 'PRESENT'}\nIn: ${clockInStr || '--:--'}\nOut: ${clockOutStr || '--:--'}\n${detail.explanation}`
                      : `${format(parseISO(dateStr), 'MMM dd')} - ${statusLabel || 'No Record'}\n${detail.explanation}`;

                    return (
                      <td key={dateStr} className="text-center px-1 py-1.5" title={tooltip}>
                        {log || statusLabel ? (
                          <div className={`inline-flex flex-col items-center justify-center gap-0.5 min-w-[65px] py-1 px-1.5 rounded border text-[9px] font-medium leading-none ${cellBg}`}>
                            {statusLabel && !log ? (
                              <span className="font-semibold py-1">{statusLabel}</span>
                            ) : statusLabel && statusLabel !== "LATE" ? (
                              <span className="font-semibold py-1">{statusLabel}</span>
                            ) : (
                              <>
                                {clockInStr ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{clockInStr}</span>
                                ) : (
                                  <span className="text-muted-foreground/40">--:--</span>
                                )}
                                {clockOutStr ? (
                                  <span className="text-blue-600 dark:text-blue-400 font-semibold">{clockOutStr}</span>
                                ) : (
                                  <span className="text-muted-foreground/40">--:--</span>
                                )}
                                {statusLabel === "LATE" && (
                                  <span className="text-[8px] font-bold text-amber-600 dark:text-amber-500 uppercase mt-0.5">LATE</span>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/30 text-xs font-normal">—</span>
                        )}
                      </td>
                    );
                  });

                  const monthlySalary = Number(e.monthly_salary) || getEmpSalary(e.full_name) || 0;
                  const totalSalary = Math.max(0, monthlySalary - rangeTotalCut);

                  return (
                    <tr key={e.id} className="border-b last:border-0 border-border hover:bg-muted/30">
                      <td className="px-3 py-2 min-w-[200px]">
                        <div className="text-sm font-medium">{e.full_name || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground capitalize">{e.requested_role?.replace('_', ' ') || "Employee"}</div>
                      </td>
                      <td className="text-right px-2 py-2 font-medium">₹{monthlySalary.toLocaleString()}</td>
                      {dayElements}
                      <td className="text-right px-2 py-2 font-medium">{rangePaidLeaves}</td>
                      <td className="text-right px-2 py-2 font-medium">{rangeUnpaidLeaves}</td>
                      <td className="text-right px-2 py-2 font-medium">{rangePermissionsMins}m</td>
                      <td className="text-right px-2 py-2 font-medium text-rose-500">₹{rangeTotalCut.toLocaleString()}</td>
                      <td className="text-right px-3 py-2 font-semibold text-emerald-600 dark:text-emerald-400">₹{Math.max(0, totalSalary).toLocaleString()}</td>
                    </tr>
                  );
                })}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={daysInRange.length + 7} className="text-center py-8 text-muted-foreground">No approved employees found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Section>

      {/* Settings Modal Dialog */}
      <Dialog open={!!settingsEmp} onOpenChange={(open) => !open && setSettingsEmp(null)}>
        <DialogContent className="sm:max-w-[425px] bg-background border">
          <DialogHeader>
            <DialogTitle>Attendance Settings</DialogTitle>
            <DialogDescription>
              Configure monthly salary and punch deadline settings for {settingsEmp?.full_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="monthly_salary" className="text-sm font-medium">Monthly Salary (₹)</label>
              <Input
                id="monthly_salary"
                type="number"
                value={settingsSalary}
                onChange={(e) => setSettingsSalary(e.target.value)}
                placeholder="e.g. 15000"
                className="bg-background"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="punch_deadline" className="text-sm font-medium">Punch Deadline (HH:MM)</label>
              <Input
                id="punch_deadline"
                type="time"
                step="60"
                value={settingsDeadline}
                onChange={(e) => setSettingsDeadline(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setSettingsEmp(null)}>Cancel</Button>
            <Button onClick={saveSettings} disabled={savingSettings}>
              {savingSettings ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
