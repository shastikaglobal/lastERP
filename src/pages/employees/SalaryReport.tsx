import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, addDays, parseISO } from "date-fns";
import { Loader2, Download, IndianRupee, Users, TrendingDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

// ─── Salary Helpers (same logic as Attendance.tsx) ────────────────────────────

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
    if (key.trim().toLowerCase() === name) return value;
  }
  return 0;
};

const getLateMinutes = (clockInStr: string, deadlineStr: string | null) => {
  const deadline = deadlineStr || '08:00:00';
  const [dH, dM, dS = 0] = deadline.split(':').map(Number);
  const punchDate = new Date(clockInStr);
  const deadlineDate = new Date(punchDate);
  deadlineDate.setHours(dH, dM, dS, 0);
  if (punchDate.getTime() <= deadlineDate.getTime()) return 0;
  return Math.floor((punchDate.getTime() - deadlineDate.getTime()) / 60000);
};

// ─── Month Calculation ────────────────────────────────────────────────────────

function calcMonthStats(
  emp: any,
  allLogs: Record<string, Record<string, any>>,
  monthStr: string // 'yyyy-MM'
) {
  const empLogs = allLogs[emp.id] || {};
  const monthlySalary = Number(emp.monthly_salary) || getEmpSalary(emp.full_name) || 0;
  const isPreethi = emp.full_name?.toLowerCase().includes("preethi");
  const perDay = isPreethi ? Math.round(monthlySalary / 22) : Math.floor(monthlySalary / 30);
  const halfDay = Math.round(perDay / 2);
  const deadline = emp.punch_deadline || (emp.full_name?.toLowerCase().startsWith("preethi") ? "10:00:00" : "08:00:00");

  const [year, month] = monthStr.split('-').map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  // Only calculate up to today if current month
  const today = new Date();
  const calcEnd = monthEnd < today ? monthEnd : today;

  // Enforce company system start date of June 1, 2026
  const systemStartStr = emp.joining_date || '2026-06-01';
  const [sy, sm, sd] = systemStartStr.split('-').map(Number);
  const systemStartDate = new Date(sy, sm - 1, sd);

  const actualStart = monthStart < systemStartDate ? systemStartDate : monthStart;

  const days: string[] = [];
  let curr = new Date(actualStart);
  while (curr <= calcEnd) {
    // Skip Sundays (0 = Sunday)
    if (curr.getDay() !== 0) {
      days.push(format(curr, 'yyyy-MM-dd'));
    }
    curr = addDays(curr, 1);
  }

  let presentDays = 0;
  let absentDays = 0;
  let lateCuts = 0;
  let paidLeaves = 0;
  let unpaidLeaves = 0;
  let excusedMins = 0;
  let totalDeduction = 0;
  let earnedDays = 0;

  days.forEach(dateStr => {
    const log = empLogs[dateStr];

    if (log && log.status === 'on_leave') {
      paidLeaves++;
      if (paidLeaves > 1) {
        unpaidLeaves++;
        totalDeduction += perDay;
      } else {
        earnedDays += 1;
      }
      return;
    }

    const isWfh = emp.system_mode === 'wfh' || emp.full_name?.toLowerCase().includes("vemula") || emp.full_name?.toLowerCase().includes("aditi");

    if (isWfh) {
      presentDays++;
      earnedDays += 1;
      return;
    }

    if (log) {
      if (log.clock_in) {
        const minsLate = getLateMinutes(log.clock_in, deadline);
        if (minsLate >= 2) {
          if (log.is_excused && excusedMins + minsLate <= 120) {
            excusedMins += minsLate;
            presentDays++;
            earnedDays += 1;
          } else {
            totalDeduction += halfDay;
            lateCuts++;
            presentDays++;
            earnedDays += 0.5;
          }
        } else {
          presentDays++;
          earnedDays += 1;
        }
      } else {
        absentDays++;
        totalDeduction += perDay;
      }
    } else {
      absentDays++;
      totalDeduction += perDay;
    }
  });

  const netPayable = Math.round(earnedDays * perDay);

  return {
    monthlySalary,
    perDay,
    workingDays: days.length,
    presentDays,
    absentDays,
    lateCuts,
    paidLeaves,
    unpaidLeaves,
    totalDeduction,
    netPayable
  };
}

// ─── Month Options ────────────────────────────────────────────────────────────

function buildMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      label: format(d, 'MMMM yyyy'),
      value: format(d, 'yyyy-MM')
    });
  }
  return options;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SalaryReport() {
  const monthOptions = useMemo(buildMonthOptions, []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);

  // Fetch employees
  const { data: employees = [], isLoading: loadingEmps } = useQuery({
    queryKey: ['salary-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, requested_role, company_id, biometric_id, monthly_salary, punch_deadline, system_mode, joining_date')
        .eq('status', 'approved')
        .order('full_name');
      if (error) throw error;
      return (data || []).filter(p =>
        !p.full_name?.toLowerCase().includes("lakshmana gokul") &&
        !!p.biometric_id
      );
    }
  });

  // Fetch attendance logs for selected month
  const { data: attendanceData = {}, isLoading: loadingLogs } = useQuery({
    queryKey: ['salary-logs', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-').map(Number);
      const start = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const end = format(new Date(year, month, 0), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .not('is_deleted', 'eq', true)
        .gte('date', start)
        .lte('date', end);
      if (error) throw error;
      const grouped: Record<string, Record<string, any>> = {};
      (data || []).forEach(log => {
        if (!grouped[log.employee_id]) grouped[log.employee_id] = {};
        grouped[log.employee_id][log.date] = log;
      });
      return grouped;
    }
  });

  const loading = loadingEmps || loadingLogs;

  // Compute per-employee salary stats
  const salaryRows = useMemo(() => {
    return employees.map(emp => ({
      emp,
      stats: calcMonthStats(emp, attendanceData, selectedMonth)
    }));
  }, [employees, attendanceData, selectedMonth]);

  // Summary totals
  const totals = useMemo(() => {
    return salaryRows.reduce((acc, { stats }) => ({
      totalPayroll: acc.totalPayroll + stats.monthlySalary,
      totalDeductions: acc.totalDeductions + stats.totalDeduction,
      totalNetPayable: acc.totalNetPayable + stats.netPayable,
    }), { totalPayroll: 0, totalDeductions: 0, totalNetPayable: 0 });
  }, [salaryRows]);

  const monthLabel = monthOptions.find(o => o.value === selectedMonth)?.label || selectedMonth;

  // ── CSV Download ──────────────────────────────────────────────────────────
  const downloadCSV = () => {
    const headers = [
      "Employee Name", "Role", "Monthly Salary (₹)", "Working Days",
      "Present Days", "Absent Days", "Late Cuts", "Paid Leaves", "Unpaid Leaves",
      "Total Deduction (₹)", "Net Payable (₹)"
    ];
    const rows = salaryRows.map(({ emp, stats }) => [
      emp.full_name,
      emp.requested_role?.replace('_', ' ') || 'Employee',
      stats.monthlySalary,
      stats.workingDays,
      stats.presentDays,
      stats.absentDays,
      stats.lateCuts,
      stats.paidLeaves,
      stats.unpaidLeaves,
      stats.totalDeduction,
      stats.netPayable
    ]);
    const csv = [
      [`Salary Report — ${monthLabel}`],
      [],
      headers,
      ...rows,
      [],
      ["", "", "", "", "", "", "", "", "TOTAL DEDUCTIONS", totals.totalDeductions, ""],
      ["", "", "", "", "", "", "", "", "TOTAL NET PAYABLE", "", totals.totalNetPayable],
    ].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `salary_report_${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Salary report downloaded!");
  };

  // ── Status badge colour ───────────────────────────────────────────────────
  const deductionColor = (amount: number) =>
    amount === 0 ? "text-emerald-500" : amount < 2000 ? "text-amber-500" : "text-rose-500";

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
      <PageHeader
        title="Salary Report"
        description={`Monthly salary calculation with deductions — ${monthLabel}`}
        breadcrumbs={[{ label: "HR & Employees" }, { label: "Salary Report" }]}
        actions={
          <div className="flex items-center gap-3">
            {/* Month Selector */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[170px] h-9 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={downloadCSV} size="sm" className="bg-[#c8a84b] hover:bg-[#a68a3d] text-black font-bold gap-2">
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-xl flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <Users className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Employees</p>
            <p className="text-3xl font-black text-foreground mt-0.5">{employees.length}</p>
          </div>
        </div>
        <div className="glass-panel p-5 rounded-xl flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
            <TrendingDown className="h-6 w-6 text-rose-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Deductions</p>
            <p className="text-3xl font-black text-rose-500 mt-0.5">
              {loading ? "—" : `₹${totals.totalDeductions.toLocaleString()}`}
            </p>
          </div>
        </div>
        <div className="glass-panel p-5 rounded-xl flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Wallet className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Payable</p>
            <p className="text-3xl font-black text-emerald-500 mt-0.5">
              {loading ? "—" : `₹${totals.totalNetPayable.toLocaleString()}`}
            </p>
          </div>
        </div>
      </div>

      {/* Salary Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Employee Salary Breakdown</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Based on attendance data for <span className="text-[#c8a84b] font-semibold">{monthLabel}</span>. Sundays excluded. Per-day = Salary ÷ 26 working days.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-sm">Calculating salaries...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Salary</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Working Days</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Present</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-rose-500 uppercase tracking-wider">Absent</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-amber-500 uppercase tracking-wider">Late Cuts</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-purple-500 uppercase tracking-wider">Paid Leave</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-rose-400 uppercase tracking-wider">Deduction</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-emerald-500 uppercase tracking-wider">Net Payable</th>
                </tr>
              </thead>
              <tbody>
                {salaryRows.map(({ emp, stats }, i) => (
                  <tr
                    key={emp.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    {/* Employee */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#c8a84b]/20 flex items-center justify-center text-[#c8a84b] font-bold text-xs shrink-0">
                          {emp.full_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{emp.full_name}</p>
                          {emp.biometric_id && (
                            <p className="text-[10px] text-muted-foreground">Bio ID: {emp.biometric_id}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3 text-muted-foreground capitalize text-xs">
                      {emp.requested_role?.replace('_', ' ') || 'Employee'}
                    </td>

                    {/* Monthly Salary */}
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      ₹{stats.monthlySalary.toLocaleString()}
                    </td>

                    {/* Working Days */}
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {stats.workingDays}
                    </td>

                    {/* Present */}
                    <td className="px-4 py-3 text-right text-emerald-500 font-semibold">
                      {stats.presentDays}
                    </td>

                    {/* Absent */}
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${stats.absentDays > 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                        {stats.absentDays}
                      </span>
                    </td>

                    {/* Late Cuts */}
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${stats.lateCuts > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                        {stats.lateCuts}
                      </span>
                    </td>

                    {/* Paid Leave */}
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${stats.paidLeaves > 0 ? 'text-purple-400' : 'text-muted-foreground'}`}>
                        {stats.paidLeaves}
                      </span>
                    </td>

                    {/* Deduction */}
                    <td className="px-4 py-3 text-right">
                      <span className={`font-mono font-bold ${deductionColor(stats.totalDeduction)}`}>
                        {stats.totalDeduction === 0 ? '—' : `−₹${stats.totalDeduction.toLocaleString()}`}
                      </span>
                    </td>

                    {/* Net Payable */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono font-black text-[#c8a84b] text-base">
                        ₹{stats.netPayable.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Footer totals */}
              <tfoot>
                <tr className="bg-white/[0.04] border-t-2 border-white/10">
                  <td colSpan={2} className="px-4 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">
                    TOTALS
                  </td>
                  <td className="px-4 py-4 text-right font-mono font-black text-foreground">
                    ₹{totals.totalPayroll.toLocaleString()}
                  </td>
                  <td colSpan={5} />
                  <td className="px-4 py-4 text-right font-mono font-black text-rose-500">
                    −₹{totals.totalDeductions.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right font-mono font-black text-[#c8a84b] text-lg">
                    ₹{totals.totalNetPayable.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Footnote */}
      <p className="text-xs text-muted-foreground text-center pb-2">
        * Salary calculation: Per-day = Monthly Salary ÷ 26 working days. Sundays are excluded. 1 paid leave per month is allowed. Late arrival without permission = half-day cut.
      </p>
    </div>
  );
}
