import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Section } from "@/components/shared/FormShell";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return { 'Authorization': `Bearer ${session?.access_token}` };
}

export default function EmployeeProductivity() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");

  // Fetch employees list from VPS DB
  const { data: employees = [] } = useQuery({
    queryKey: ['employee_productivity_data'],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/employees', { headers });
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((p: any) => ({
        id: p.id,
        name: p.full_name || 'Unknown',
        role: p.requested_role || 'Employee',
        department: p.department || 'Unassigned',
        status: p.is_active ? 'Active' : 'Inactive',
      }));
    }
  });

  // Fetch real productivity stats from VPS DB
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['employee_productivity_stats'],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/analytics/employee_productivity', { headers });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // cache 5 min
  });

  const departments = useMemo(() => {
    const depts = Array.from(new Set(employees.map((e: any) => e.department)));
    return ["all", ...depts];
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((e: any) => {
      const matchesSearch =
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.role.toLowerCase().includes(search.toLowerCase());
      const matchesDept = department === "all" || e.department === department;
      return matchesSearch && matchesDept;
    });
  }, [search, department, employees]);

  // Derive stat card values — use real data or show skeleton
  const activeCount = stats?.activeEmployees ?? employees.filter((e: any) => e.status === 'Active').length;
  const activeValue = statsLoading ? "—" : String(activeCount);
  const activeDelta = stats?.deltas?.employees;

  const attendanceValue = statsLoading ? "—" : (stats?.avgAttendance != null ? `${stats.avgAttendance}%` : "N/A");
  const attendanceDelta = stats?.deltas?.attendance;

  const tasksValue = statsLoading ? "—" : String(stats?.tasksCompleted ?? 0);
  const tasksDelta = stats?.deltas?.tasks;

  const responseValue = statsLoading ? "—" : (stats?.avgResponseFormatted ?? "N/A");

  return (
    <div>
      <PageHeader title="Employee Productivity" description="Activity, attendance and performance" breadcrumbs={[{ label: "Dashboards" }, { label: "Employees" }]} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Active Employees"
          value={activeValue}
          delta={activeDelta ? { value: activeDelta, positive: !activeDelta.startsWith('-') } : undefined}
        />
        <StatCard
          label="Avg Attendance"
          value={attendanceValue}
          delta={attendanceDelta ? { value: attendanceDelta, positive: !attendanceDelta.startsWith('-') } : undefined}
          hint="this week"
        />
        <StatCard
          label="Tasks Completed"
          value={tasksValue}
          delta={tasksDelta ? { value: tasksDelta, positive: !tasksDelta.startsWith('-') } : undefined}
          hint="this week"
        />
        <StatCard
          label="Avg Response"
          value={responseValue}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 bg-card p-3 rounded-lg border border-border shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees by name or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 bg-background"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="w-[180px] h-10 bg-background">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>
                  {dept === "all" ? "All Departments" : dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Section title="Top Performers">
        <DataTable
          data={filteredEmployees}
          showSearch={false}
          showFilters={false}
          columns={[
            { key: "name", header: "Employee", render: (r) => <div className="flex items-center gap-2"><div className="h-7 w-7 rounded-full bg-primary-muted text-primary flex items-center justify-center text-xs font-semibold">{r.name.split(" ").map((n: string) => n[0]).join("")}</div><span className="font-medium">{r.name}</span></div> },
            { key: "role", header: "Role", render: (r) => <span className="text-sm">{r.role}</span> },
            { key: "dept", header: "Department", render: (r) => <span className="text-sm text-muted-foreground">{r.department}</span> },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      </Section>
    </div>
  );
}
