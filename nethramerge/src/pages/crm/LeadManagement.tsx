import { useState } from "react";

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

const initialLeads = [
  { id: "L001", company: "Future Wave Food Trading", country: "UAE", contact: "Ahmad Al-Rashid", email: "ahmad@futurewave.ae", phone: "+971 50 123 4567", product: "Turmeric Powder", status: "Negotiation", value: 85000, assignee: "Swathi", date: "2026-05-01", followUp: "2026-06-02" },
  { id: "L002", company: "Sea Horse Pvt Ltd", country: "Australia", contact: "James Carter", email: "james@seahorse.com.au", phone: "+61 2 9876 5432", product: "Coconut Oil", status: "New", value: 12000, assignee: "Rajesh", date: "2026-05-10", followUp: "2026-06-01" },
  { id: "L003", company: "OrganicLife GmbH", country: "Germany", contact: "Klaus Weber", email: "k.weber@organiclife.de", phone: "+49 89 456 789", product: "Pepper Spices", status: "Qualified", value: 45000, assignee: "Priya", date: "2026-05-12", followUp: "2026-05-30" },
  { id: "L004", company: "Greenfield Traders", country: "UK", contact: "Sarah Mitchell", email: "sarah@greenfield.co.uk", phone: "+44 20 7946 0958", product: "Basmati Rice", status: "Closed Won", value: 120000, assignee: "Swathi", date: "2026-04-20", followUp: null },
  { id: "L005", company: "NaturalBest Co.", country: "Canada", contact: "Marc Dupont", email: "marc@naturalbest.ca", phone: "+1 416 555 0192", product: "Cumin Seeds", status: "Follow-Up", value: 28000, assignee: "Rajesh", date: "2026-05-15", followUp: "2026-05-31" },
  { id: "L006", company: "Spice Kingdom LLC", country: "USA", contact: "Robert King", email: "robert@spicekingdom.com", phone: "+1 212 555 0111", product: "Cardamom", status: "New", value: 67000, assignee: "Priya", date: "2026-05-18", followUp: "2026-06-05" },
  { id: "L007", company: "EastWest Imports", country: "Singapore", contact: "Li Wei", email: "liwei@eastwest.sg", phone: "+65 9123 4567", product: "Chilli Powder", status: "Closed Lost", value: 34000, assignee: "Swathi", date: "2026-04-10", followUp: null },
];

const initialEmployees = [
  { id: "E001", name: "Swathi Swathi", role: "Senior BDE", email: "swathi@shastika.com", leads: 24, calls: 87, deals: 8, revenue: 485000, target: 500000, status: "Online", ip: "192.168.1.101", device: "MacBook Pro", login: "09:02 AM", idle: "0m", location: "Chennai" },
  { id: "E002", name: "Rajesh Kumar", role: "BDE", email: "rajesh@shastika.com", leads: 18, calls: 64, deals: 5, revenue: 320000, target: 400000, status: "Online", ip: "10.0.0.45", device: "Windows PC", login: "09:15 AM", idle: "12m", location: "Tiruppur" },
  { id: "E003", name: "Priya Nair", role: "BDE", email: "priya@shastika.com", leads: 21, calls: 72, deals: 6, revenue: 410000, target: 450000, status: "Idle", ip: "172.16.0.22", device: "MacBook Air", login: "09:30 AM", idle: "28m", location: "Coimbatore" },
  { id: "E004", name: "Arjun Menon", role: "Junior BDE", email: "arjun@shastika.com", leads: 11, calls: 38, deals: 2, revenue: 145000, target: 300000, status: "Offline", ip: "—", device: "—", login: "—", idle: "—", location: "Remote" },
];

const Badge = ({ label, color = COLORS.accent }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
    {label}
  </span>
);

const statusColor = (s) => {
  const map = { "New": COLORS.blue, "Qualified": COLORS.purple, "Negotiation": COLORS.gold, "Follow-Up": COLORS.orange, "Closed Won": COLORS.green, "Closed Lost": COLORS.red, "Draft": COLORS.textSecondary, "Sent": COLORS.blue, "Approved": COLORS.green, "Online": COLORS.green, "Idle": COLORS.gold, "Offline": COLORS.textMuted };
  return map[s] || COLORS.textSecondary;
};

const Card = ({ children, style = {} }) => (
  <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "16px 20px", ...style }}>
    {children}
  </div>
);

const Btn = ({ children, onClick, color = COLORS.accent, small, outline }) => (
  <button onClick={onClick} style={{
    background: outline ? "transparent" : color,
    color: outline ? color : COLORS.bg,
    border: `1px solid ${color}`,
    borderRadius: 8, padding: small ? "5px 12px" : "8px 18px",
    fontSize: small ? 12 : 13, fontWeight: 600, transition: "opacity 0.2s"
  }}
    onMouseOver={e => e.currentTarget.style.opacity = "0.8"}
    onMouseOut={e => e.currentTarget.style.opacity = "1"}>
    {children}
  </button>
);

const SectionHeader = ({ title, sub }) => (
  <div style={{ marginBottom: 20 }}>
    <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary }}>{title}</h2>
    {sub && <p style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 4 }}>{sub}</p>}
  </div>
);

function LeadManagement() {
  const [leads, setLeads] = useState(initialLeads);
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ company: "", country: "", contact: "", email: "", phone: "", product: "", status: "New", value: "", assignee: "Swathi" });
  const statuses = ["All", "New", "Qualified", "Negotiation", "Follow-Up", "Closed Won", "Closed Lost"];
  const filtered = filter === "All" ? leads : leads.filter(l => l.status === filter);

  const addLead = () => {
    const dup = leads.find(l => l.email.toLowerCase() === form.email.toLowerCase());
    if (dup) { alert(`⚠️ Duplicate detected: ${dup.company} already exists with this email.`); return; }
    const nl = { ...form, id: "L" + String(leads.length + 1).padStart(3, "0"), value: Number(form.value) || 0, date: new Date().toISOString().split("T")[0], followUp: null };
    setLeads([nl, ...leads]);
    setShowForm(false);
    setForm({ company: "", country: "", contact: "", email: "", phone: "", product: "", status: "New", value: "", assignee: "Swathi" });
  };

  return (
    <div style={{ animation: "slideIn 0.3s ease" }}>
      <SectionHeader title="Lead Management" sub="Track, assign, and manage all export business leads" />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            background: filter === s ? COLORS.accent : "transparent",
            color: filter === s ? COLORS.bg : COLORS.textSecondary,
            border: `1px solid ${filter === s ? COLORS.accent : COLORS.border}`,
            borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer"
          }}>{s}</button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <Btn onClick={() => setShowForm(!showForm)}>+ New Lead</Btn>
        </div>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 16, border: `1px solid ${COLORS.accent}44` }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: COLORS.accent }}>CREATE NEW LEAD</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {["company", "country", "contact", "email", "phone", "product"].map((k, i) => (
              <input key={k} placeholder={k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, ' $1')} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} />
            ))}
            <input placeholder="Estimated Value (USD)" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} />
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              {statuses.filter(s => s !== "All").map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })}>
              {initialEmployees.map(e => <option key={e.id}>{e.name.split(" ")[0]}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Btn onClick={addLead}>Save Lead</Btn>
            <Btn onClick={() => setShowForm(false)} outline>Cancel</Btn>
          </div>
        </Card>
      )}

      <Card style={{ padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                {["Lead ID", "Company", "Country", "Product", "Value", "Status", "Assignee", "Follow-Up"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: COLORS.textMuted, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr key={l.id} style={{ borderBottom: `1px solid ${COLORS.border}22`, background: i % 2 === 0 ? "transparent" : COLORS.surface + "44" }}>
                  <td style={{ padding: "11px 16px", fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: COLORS.accent }}>{l.id}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 500 }}>{l.company}</td>
                  <td style={{ padding: "11px 16px", fontSize: 12, color: COLORS.textSecondary }}>🌍 {l.country}</td>
                  <td style={{ padding: "11px 16px", fontSize: 12 }}>{l.product}</td>
                  <td style={{ padding: "11px 16px", fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: COLORS.gold }}>${l.value.toLocaleString()}</td>
                  <td style={{ padding: "11px 16px" }}><Badge label={l.status} color={statusColor(l.status)} /></td>
                  <td style={{ padding: "11px 16px", fontSize: 12 }}>{l.assignee}</td>
                  <td style={{ padding: "11px 16px", fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: l.followUp ? COLORS.orange : COLORS.textMuted }}>{l.followUp || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default LeadManagement;
