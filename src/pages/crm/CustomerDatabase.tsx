import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Printer, ShieldAlert } from "lucide-react";

const COLORS = {
  bg: "#0a0c10",
  surface: "#111318",
  card: "#161b22",
  border: "#21262d",
  accent: "#00d4aa",
  accentDim: "#00d4aa22",
  blue: "#388bfd",
  blueDim: "#388bfd22",
  orange: "#f78166",
  orangeDim: "#f7816622",
  purple: "#bc8cff",
  purpleDim: "#bc8cff22",
  gold: "#e3b341",
  goldDim: "#e3b34122",
  red: "#ff7b72",
  green: "#3fb950",
  textPrimary: "#e6edf3",
  textSecondary: "#8b949e",
  textMuted: "#484f58",
};

const Badge = ({ label, color = COLORS.accent }: any) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
    {label}
  </span>
);

const statusColor = (s: string) => {
  if (!s) return COLORS.textSecondary;
  const map: Record<string, string> = { "New": COLORS.blue, "Qualified": COLORS.purple, "Negotiation": COLORS.gold, "Follow-Up": COLORS.orange, "Won": COLORS.green, "Client Successfully Acquired": COLORS.green, "Lost": COLORS.red, "Draft": COLORS.textSecondary, "Sent": COLORS.blue, "Approved": COLORS.green, "Online": COLORS.green, "Idle": COLORS.gold, "Offline": COLORS.textMuted, "Active": COLORS.blue, "Closed": COLORS.textSecondary, "Rejected": COLORS.red, "Pending": COLORS.orange, "Accepted": COLORS.green };
  return map[s] || COLORS.textSecondary;
};

const Card = ({ children, style = {} }: any) => (
  <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px 20px", ...style }}>
    {children}
  </div>
);

const SectionHeader = ({ title, sub }: any) => (
  <div style={{ marginBottom: 20 }}>
    <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary }}>{title}</h2>
    {sub && <p style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>{sub}</p>}
  </div>
);

const TabButton = ({ active, label, onClick }: any) => (
  <button 
    onClick={onClick}
    style={{ 
      background: "none", 
      border: "none", 
      borderBottom: active ? `2px solid ${COLORS.accent}` : "2px solid transparent",
      color: active ? COLORS.textPrimary : COLORS.textSecondary,
      padding: "8px 12px",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: 13,
      transition: "all 0.2s"
    }}>
    {label}
  </button>
);

function CustomerDatabase() {
  const { roleSlugs } = useAuth();
  const isAdmin = roleSlugs.has("admin");
  const isManager = roleSlugs.has("manager");
  const hasSecurityAccess = isAdmin || isManager;
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("Overview");

  const [inquiries, setInquiries] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const fetchLeads = async () => {
    setLoadingData(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");
      const res = await fetch('/api/leads', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch leads");
      const data = await res.json();
      const activeLeads = (data || []).filter((l: any) => !l.is_deleted);
      setCustomers(activeLeads);
    } catch (err: any) {
      toast.error(err.message || "Failed to load customers");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    if (!hasSecurityAccess) return;
    const fetchTeam = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        
        const res = await fetch('/api/employees', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch team members");
        const profiles = await res.json();
          
        if (profiles) {
          // Filter out admins gracefully
          const filtered = profiles.filter((p: any) => 
            p.role !== 'admin' && p.role_slug !== 'admin' && p.requested_role !== 'admin'
          );
          setTeamMembers(filtered);
        }
      } catch (err) {
        console.error("Error fetching team members:", err);
      }
    };
    fetchTeam();
  }, [hasSecurityAccess]);

  useEffect(() => {
    if (!selected) return;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No active session");
        const authHeader = { 'Authorization': `Bearer ${session.access_token}` };

        // Inquiries (filter all active leads of same company)
        const leadsRes = await fetch('/api/leads', { headers: authHeader });
        const allLeads = leadsRes.ok ? await leadsRes.json() : [];
        const inqData = allLeads.filter((l: any) => l.company_name === selected.company_name && !l.is_deleted);
        setInquiries(inqData);

        // Quotations
        const qRes = await fetch(`/api/leads/${selected.id}/quotations`, { headers: authHeader });
        const qData = qRes.ok ? await qRes.json() : [];
        setQuotations(qData);

        // Follow Ups
        const followRes = await fetch(`/api/leads/${selected.id}/follow-ups`, { headers: authHeader });
        const followData = followRes.ok ? await followRes.json() : [];
        setFollowUps(followData);

        // Activity Logs
        const actRes = await fetch(`/api/leads/${selected.id}/activities`, { headers: authHeader });
        const actData = actRes.ok ? await actRes.json() : [];
        setActivities(actData);
      } catch (err: any) {
        console.error("Error fetching lead details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [selected]);

  const handleReassign = async (newAssignee: string) => {
    if (!selected) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");
      const res = await fetch(`/api/leads/${selected.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ assigned_to: newAssignee })
      });
      if (!res.ok) throw new Error("Failed to reassign lead");
      
      toast.success(`Lead reassigned to ${newAssignee}`);
      setSelected({ ...selected, assigned_to: newAssignee });
      await fetchLeads(); // Refresh the lead data
    } catch (err: any) {
      toast.error(err.message || "Failed to reassign lead");
    }
  };

  const exportAsPDF = () => {
    const printContent = `
      <html>
        <head>
          <title>Customer Data Export - ${selected?.company_name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { color: #000; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin-bottom: 30px; }
            .section h2 { color: #555; border-bottom: 1px solid #ccc; padding-bottom: 5px; font-size: 18px; }
            .label { font-weight: bold; width: 150px; display: inline-block; margin-bottom: 8px; }
            .value { display: inline-block; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>Customer Profile: ${selected?.company_name || selected?.contact_name}</h1>
          
          <div class="section">
            <h2>Overview & Contact</h2>
            <div><span class="label">Company Name:</span> <span class="value">${selected?.company_name || "-"}</span></div>
            <div><span class="label">Contact Person:</span> <span class="value">${selected?.contact_name || "-"}</span></div>
            <div><span class="label">Email:</span> <span class="value">${selected?.email || "-"}</span></div>
            <div><span class="label">Mobile:</span> <span class="value">${selected?.mobile || selected?.phone || "-"}</span></div>
            <div><span class="label">Country:</span> <span class="value">${selected?.country || "-"}</span></div>
            <div><span class="label">Product Needs:</span> <span class="value">${selected?.product_type || selected?.product_interest || "-"}</span></div>
            <div><span class="label">Current Status:</span> <span class="value">${selected?.stage || "-"}</span></div>
            <div><span class="label">Assigned To:</span> <span class="value">${selected?.assigned_to || "-"}</span></div>
          </div>

          <div class="section">
            <h2>Quotation History</h2>
            ${quotations.length > 0 ? `
              <table>
                <tr><th>Quotation Number</th><th>Date Created</th><th>Amount</th><th>Status</th></tr>
                ${quotations.map(q => `
                  <tr>
                    <td>${q.quotation_number}</td>
                    <td>${q.created_at ? new Date(q.created_at).toLocaleDateString() : "-"}</td>
                    <td>$${q.total_amount?.toLocaleString() || q.amount?.toLocaleString() || 0}</td>
                    <td>${q.status}</td>
                  </tr>
                `).join('')}
              </table>
            ` : '<p>No quotations issued.</p>'}
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <div style={{ animation: "slideIn 0.3s ease" }}>
      <div className="flex justify-between items-center mb-5">
        <SectionHeader title="Customer Database" sub="Encrypted buyer profiles, inquiry history & communication timeline" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1.4fr" : "1fr", gap: 16 }}>
        <div style={{ maxHeight: "calc(100vh - 180px)", overflowY: "auto", paddingRight: 4 }}>
          {loadingData ? (
            <div style={{ color: COLORS.textSecondary, padding: 20 }}>Loading customers...</div>
          ) : customers.length === 0 ? (
            <div style={{ color: COLORS.textSecondary, padding: 20 }}>No customers found.</div>
          ) : customers.map(c => (
            <Card key={c.id} style={{ marginBottom: 10, cursor: "pointer", border: selected?.id === c.id ? `1px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`, transition: "border 0.2s" }}>
              <div onClick={() => { setSelected(selected?.id === c.id ? null : c); setActiveTab("Overview"); }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: COLORS.blueDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: COLORS.blue }}>
                      {(c.company_name || c.contact_name || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{c.company_name || "Unknown Company"}</div>
                      <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{c.contact_name} {c.country ? `· ${c.country}` : ""}</div>
                    </div>
                  </div>
                  <Badge label={c.stage || "New"} color={statusColor(c.stage)} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {selected && (
          <Card style={{ animation: "fadeIn 0.2s ease", border: `1px solid ${COLORS.accent}44`, position: "relative" }}>
            {loading && (
              <div style={{ position: "absolute", top: 16, right: 16, fontSize: 12, color: COLORS.textSecondary }}>Loading...</div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{selected.company_name || selected.contact_name}</div>
              <Badge label="Encrypted Profile" color={COLORS.green} />
            </div>
            
            <div style={{ display: "flex", gap: 8, borderBottom: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
              {["Overview", "Inquiries", "Quotations", "Activity & Security"].map(tab => (
                <TabButton key={tab} active={activeTab === tab} label={tab} onClick={() => setActiveTab(tab)} />
              ))}
            </div>

            {activeTab === "Overview" && (
              <div style={{ animation: "fadeIn 0.2s ease" }}>
                {[
                  ["Buyer Company Name", selected.company_name],
                  ["Contact Person", selected.contact_name],
                  ["Email", selected.email],
                  ["Phone/Mobile", selected.mobile || selected.phone],
                  ["Website", selected.website],
                  ["Country & Region", selected.country],
                  ["Business Category", selected.business_category],
                  ["Product Requirements", selected.product_type || selected.interested_product],
                  ["Assigned To", selected.assigned_to],
                  ["Status", selected.stage],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}22`, fontSize: 13 }}>
                    <span style={{ color: COLORS.textSecondary }}>{k}</span>
                    <span style={{ fontWeight: 500, fontFamily: k === "Email" || k === "Phone/Mobile" || k === "Website" ? "JetBrains Mono, monospace" : "inherit", fontSize: k === "Email" ? 12 : 13 }}>
                      {k === "Website" && v ? (
                        <a href={String(v).startsWith('http') ? String(v) : `https://${v}`} target="_blank" rel="noreferrer" style={{ color: COLORS.blue, textDecoration: "none" }}>{v as React.ReactNode}</a>
                      ) : (
                        (v as React.ReactNode) || "-"
                      )}
                    </span>
                  </div>
                ))}
                
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, letterSpacing: "0.08em", marginBottom: 8 }}>COMMUNICATION TIMELINE</div>
                  {followUps.length > 0 ? followUps.map((t: any, i: number) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 10, color: COLORS.textMuted, minWidth: 40, paddingTop: 2 }}>
                        {t.follow_up_date ? new Date(t.follow_up_date).toLocaleDateString() : "N/A"}
                      </span>
                      <Badge label="Follow-Up" color={COLORS.purple} />
                      <span style={{ fontSize: 12, color: COLORS.textSecondary }}>{t.note || "No notes"}</span>
                    </div>
                  )) : (
                    <div style={{ fontSize: 12, color: COLORS.textSecondary }}>No follow-up timeline recorded.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "Inquiries" && (
              <div style={{ animation: "fadeIn 0.2s ease" }}>
                {inquiries.length > 0 ? inquiries.map((inq: any, i: number) => (
                  <div key={i} style={{ padding: "12px", background: COLORS.surface, borderRadius: 8, marginBottom: 8, border: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: COLORS.textPrimary }}>{inq.product_type || inq.interested_product || "General Inquiry"}</span>
                      <Badge label={inq.stage} color={statusColor(inq.stage)} />
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>
                      Date: {inq.created_at ? new Date(inq.created_at).toLocaleDateString() : "N/A"}
                    </div>
                    {inq.remark && <div style={{ fontSize: 12, color: COLORS.textPrimary }}>Notes: {inq.remark}</div>}
                  </div>
                )) : (
                  <div style={{ fontSize: 13, color: COLORS.textSecondary }}>No inquiries found.</div>
                )}
              </div>
            )}

            {activeTab === "Quotations" && (
              <div style={{ animation: "fadeIn 0.2s ease" }}>
                {quotations.length > 0 ? quotations.map((qt: any, i: number) => (
                  <div 
                    key={i} 
                    onClick={() => navigate(`/quotations/${qt.id}`)}
                    style={{ padding: "12px", background: COLORS.surface, borderRadius: 8, marginBottom: 8, border: `1px solid ${COLORS.border}`, cursor: "pointer", transition: "all 0.2s" }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = COLORS.accent}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = COLORS.border}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: COLORS.textPrimary }}>
                        {qt.quotation_number} - ${qt.total_amount?.toLocaleString() || qt.amount?.toLocaleString() || 0}
                      </span>
                      <Badge label={qt.status} color={statusColor(qt.status)} />
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.textSecondary }}>
                      Date: {qt.created_at ? new Date(qt.created_at).toLocaleDateString() : "N/A"}
                    </div>
                  </div>
                )) : (
                  <div style={{ fontSize: 13, color: COLORS.textSecondary }}>No quotations found.</div>
                )}
              </div>
            )}

            {activeTab === "Activity & Security" && (
              <div style={{ animation: "fadeIn 0.2s ease" }}>
                {!hasSecurityAccess ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center", color: COLORS.textSecondary }}>
                    <ShieldAlert size={48} style={{ color: COLORS.red, marginBottom: 16, opacity: 0.8 }} />
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 8 }}>Access Denied</h3>
                    <p style={{ fontSize: 13 }}>You don't have permission to view security details.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: 24, padding: "12px", background: COLORS.surface, borderRadius: 8, border: `1px solid ${COLORS.red}44`, display: "flex", alignItems: "center", gap: 12 }}>
                      <ShieldAlert size={20} color={COLORS.red} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.textPrimary }}>Restricted Access Area</div>
                        <div style={{ fontSize: 12, color: COLORS.textSecondary }}>This section is visible only to Administrators and Managers.</div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 8 }}>VISIBLE TO</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ background: COLORS.border, color: COLORS.textPrimary, padding: "4px 8px", borderRadius: 4, fontSize: 11 }}>Admin</span>
                          <span style={{ background: COLORS.border, color: COLORS.textPrimary, padding: "4px 8px", borderRadius: 4, fontSize: 11 }}>Manager</span>
                        </div>
                      </div>
                      
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 8 }}>REASSIGN LEAD</div>
                        <Select value={selected.assigned_to || ""} onValueChange={handleReassign}>
                          <SelectTrigger style={{ height: 32, background: COLORS.surface, borderColor: COLORS.border, fontSize: 12 }}>
                            <SelectValue placeholder="Select salesperson" />
                          </SelectTrigger>
                          <SelectContent style={{ background: COLORS.surface, borderColor: COLORS.border }}>
                            {teamMembers.map(member => (
                              <SelectItem key={member.id} value={member.full_name || "Unknown"} style={{ fontSize: 12 }}>
                                {member.full_name || "Unknown"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <button onClick={exportAsPDF} style={{ background: COLORS.surface, color: COLORS.textPrimary, border: `1px solid ${COLORS.border}`, padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}
                        onMouseOver={(e) => { e.currentTarget.style.borderColor = COLORS.accent; e.currentTarget.style.color = COLORS.accent; }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textPrimary; }}
                      >
                        <Printer size={16} />
                        Export Customer Data as PDF
                      </button>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 8 }}>RECENT ACTIVITY LOG</div>
                      {activities.length > 0 ? activities.map((act: any, i: number) => (
                        <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: `1px solid ${COLORS.border}22` }}>
                          <span style={{ fontSize: 11, color: COLORS.textMuted, minWidth: 60 }}>
                            {act.created_at ? new Date(act.created_at).toLocaleDateString() : "N/A"}
                          </span>
                          <span style={{ fontSize: 12, color: COLORS.textPrimary }}>{act.action || act.event_type}</span>
                        </div>
                      )) : (
                        <div style={{ fontSize: 12, color: COLORS.textSecondary }}>No recent activity found.</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

          </Card>
        )}
      </div>
    </div>
  );
}

export default CustomerDatabase;
