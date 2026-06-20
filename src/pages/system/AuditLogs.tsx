import { useState, useMemo } from "react";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inferTeamFromActorName } from "@/lib/teamMapping";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, Download, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AuditLogs() {
  const { profile, roleSlugs } = useAuth();
  const [action, setAction] = useState<string>("");
  const [resourceType, setResourceType] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [team, setTeam] = useState<string>("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Only admins can view audit logs
  const isAdmin = Array.from(roleSlugs).some((role) =>
    ["admin", "manager", "secretary"].includes(role.toLowerCase())
  );

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const { logs, loading } = useAuditLogs({
    action: action as any,
    resourceType: resourceType || undefined,
    limit: 200,
  });

  const uniqueTeams = useMemo(() => {
    const teams = new Set<string>();
    logs.forEach((log) => {
      const t = log.team || log.profiles?.department || inferTeamFromActorName(log.profiles?.full_name || undefined);
      if (t) teams.add(t);
    });
    return Array.from(teams).sort();
  }, [logs]);

  const filteredLogs = logs.filter((log) => {
    const inferredTeam = log.team || log.profiles?.department || inferTeamFromActorName(log.profiles?.full_name || undefined);
    const matchesSearch = searchTerm === "" ||
      log.resource_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_id?.includes(searchTerm) ||
      (inferredTeam || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTeam = team === "" || inferredTeam === team;

    return matchesSearch && matchesTeam;
  });

  const getActionBadgeColor = (action: string) => {
    const colors: Record<string, string> = {
      create: "bg-green-100 text-green-800",
      update: "bg-blue-100 text-blue-800",
      delete: "bg-red-100 text-red-800",
      export: "bg-yellow-100 text-yellow-800",
      download: "bg-purple-100 text-purple-800",
      login: "bg-gray-100 text-gray-800",
      logout: "bg-gray-100 text-gray-800",
      view: "bg-gray-100 text-gray-800",
      share: "bg-orange-100 text-orange-800",
      approve: "bg-green-100 text-green-800",
      reject: "bg-red-100 text-red-800",
      archive: "bg-gray-100 text-gray-800",
    };
    return colors[action] || "bg-gray-100 text-gray-800";
  };

  const getStatusBadgeColor = (status: string) => {
    return status === "success"
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground mt-2">
          Track all system activities and user actions
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search by resource name, user, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Action</label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                  <SelectItem value="download">Download</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="share">Share</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Resource Type
              </label>
              <Select value={resourceType} onValueChange={setResourceType}>
                <SelectTrigger>
                  <SelectValue placeholder="All resources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All resources</SelectItem>
                  <SelectItem value="quotation">Quotation</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="order">Order</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="profile">Profile</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Team</label>
              <Select value={team} onValueChange={setTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All teams</SelectItem>
                  {uniqueTeams.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAction("");
              setResourceType("");
              setSearchTerm("");
              setTeam("");
            }}
          >
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>
            {filteredLogs.length} of {logs.length} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Resource Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs">
                        {formatDistanceToNow(new Date(log.timestamp || log.created_at), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {log.profiles?.full_name || log.user_email || log.user_id || "Unknown user"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {log.profiles?.email || log.user_email || log.user_id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const displayTeam = log.team || log.profiles?.department || inferTeamFromActorName(log.profiles?.full_name || undefined);
                          return displayTeam ? (
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 capitalize font-medium">
                              {displayTeam}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionBadgeColor(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.resource_type || log.action}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.resource_name || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(log.status || "unknown")}>
                          {log.status || "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setExpandedRow(
                                  expandedRow === log.id ? null : log.id
                                )
                              }
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-80 max-h-96 overflow-y-auto"
                          >
                            <DropdownMenuItem disabled>
                              <div className="space-y-3 w-full py-2">
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground">
                                    TIMESTAMP
                                  </p>
                                  <p className="text-sm">
                                    {new Date(log.timestamp || log.created_at).toLocaleString()}
                                  </p>
                                </div>
                                {(() => {
                                  const displayTeam = log.team || log.profiles?.department || inferTeamFromActorName(log.profiles?.full_name || undefined);
                                  return displayTeam ? (
                                    <div>
                                      <p className="text-xs font-semibold text-muted-foreground">
                                        TEAM
                                      </p>
                                      <p className="text-sm">
                                        {displayTeam}
                                      </p>
                                    </div>
                                  ) : null;
                                })()}
                                {log.ip_address && (
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground">
                                      IP ADDRESS
                                    </p>
                                    <p className="text-sm font-mono">
                                      {log.ip_address}
                                    </p>
                                  </div>
                                )}
                                {log.resource_id && (
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground">
                                      RESOURCE ID
                                    </p>
                                    <p className="text-sm font-mono break-all">
                                      {log.resource_id}
                                    </p>
                                  </div>
                                )}
                                {log.changes_count > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground">
                                      CHANGES
                                    </p>
                                    <p className="text-sm">
                                      {log.changes_count} field(s) modified
                                    </p>
                                  </div>
                                )}
                                {log.old_values && Object.keys(log.old_values).length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground">
                                      OLD VALUES
                                    </p>
                                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                                      {JSON.stringify(log.old_values, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.new_values && Object.keys(log.new_values).length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground">
                                      NEW VALUES
                                    </p>
                                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                                      {JSON.stringify(log.new_values, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.error_message && (
                                  <div>
                                    <p className="text-xs font-semibold text-red-600">
                                      ERROR
                                    </p>
                                    <p className="text-sm text-red-600">
                                      {log.error_message}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
