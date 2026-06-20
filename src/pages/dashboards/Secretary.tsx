import { useState } from "react";
import {
  LayoutDashboard, TrendingUp, Ship, DollarSign, Users, Shield,
  Package, BarChart2, Warehouse, AlertTriangle, Calculator, Hash,
  Search, Bell, ChevronDown, ChevronRight, Menu, X,
  ArrowUpRight, ArrowDownRight, Globe, Truck, FileText, Star,
  ShoppingCart, Boxes, Activity, Zap, Filter, Download, RefreshCw
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart
} from "recharts";

const GOLD = "#D4A017";
const GOLD_LIGHT = "#E8B830";
const GOLD_DIM = "#8B6A0F";
const BG = "#0A0A0B";
const SURFACE = "#111113";
const CARD = "#16161A";
const BORDER = "#242428";
const TEXT = "#E8E8EC";
const MUTED = "#6B6B78";

const salesData = [
  { month: "Jan", revenue: 42000, orders: 38, target: 45000 },
  { month: "Feb", revenue: 58000, orders: 52, target: 50000 },
  { month: "Mar", revenue: 51000, orders: 45, target: 55000 },
  { month: "Apr", revenue: 73000, orders: 67, target: 60000 },
  { month: "May", revenue: 89000, orders: 81, target: 75000 },
  { month: "Jun", revenue: 76000, orders: 70, target: 80000 },
  { month: "Jul", revenue: 94000, orders: 88, target: 85000 },
  { month: "Aug", revenue: 110000, orders: 102, target: 95000 },
];

const shipmentData = [
  { name: "Delivered", value: 47, color: GOLD },
  { name: "In Transit", value: 28, color: "#3B82F6" },
  { name: "Processing", value: 15, color: "#8B5CF6" },
  { name: "Pending", value: 10, color: MUTED },
];

const procurementData = [
  { category: "Rice", q1: 850, q2: 920, q3: 780, q4: 1050 },
  { category: "Wheat", q1: 620, q2: 710, q3: 890, q4: 750 },
  { category: "Spices", q1: 430, q2: 380, q3: 460, q4: 520 },
  { category: "Pulses", q1: 290, q2: 340, q3: 310, q4: 390 },
  { category: "Cotton", q1: 560, q2: 490, q3: 610, q4: 580 },
];

const recentShipments = [
  { id: "SGI-2841", destination: "Dubai, UAE", commodity: "Basmati Rice", qty: "25 MT", status: "In Transit", date: "18 May" },
  { id: "SGI-2840", destination: "Singapore", commodity: "Turmeric", qty: "8 MT", status: "Delivered", date: "17 May" },
  { id: "SGI-2839", destination: "UK", commodity: "Black Pepper", qty: "12 MT", status: "Processing", date: "16 May" },
  { id: "SGI-2838", destination: "USA", commodity: "Organic Cotton", qty: "40 MT", status: "Delivered", date: "15 May" },
  { id: "SGI-2837", destination: "Germany", commodity: "Lentils", qty: "18 MT", status: "Pending", date: "14 May" },
];

const suppliers = [
  { name: "Kaveri Agro Farms", location: "Punjab", score: 97, orders: 142, onTime: "98%" },
  { name: "Sri Lakshmi Mills", location: "Andhra Pradesh", score: 91, orders: 98, onTime: "94%" },
  { name: "Green Valley Co.", location: "Maharashtra", score: 88, orders: 76, onTime: "91%" },
  { name: "Deccan Spice Hub", location: "Karnataka", score: 85, orders: 63, onTime: "88%" },
];

const exportCountries = [
  { country: "UAE", exports: 34, flag: "🇦🇪" },
  { country: "Singapore", exports: 22, flag: "🇸🇬" },
  { country: "UK", exports: 18, flag: "🇬🇧" },
  { country: "USA", exports: 15, flag: "🇺🇸" },
  { country: "Germany", exports: 11, flag: "🇩🇪" },
];

const menuSections = [
  {
    label: "DASHBOARDS",
    items: [
      { icon: LayoutDashboard, label: "Executive & Activities", active: true },
      { icon: TrendingUp, label: "Sales Analytics" },
      { icon: Ship, label: "Shipment Analytics" },
      { icon: DollarSign, label: "Financial Overview" },
      { icon: Users, label: "Employee Productivity" },
      { icon: Shield, label: "Roles & Permissions" },
    ]
  },
  {
    label: "PROCUREMENT",
    items: [
      { icon: ShoppingCart, label: "Suppliers" },
      { icon: BarChart2, label: "Supplier Analytics" },
    ]
  },
  {
    label: "INVENTORY",
    items: [
      { icon: Package, label: "Product Catalog" },
      { icon: Boxes, label: "Stock Movements" },
      { icon: Warehouse, label: "Warehouses" },
      { icon: AlertTriangle, label: "Low Stock Alerts" },
    ]
  },
  {
    label: "TALLY",
    items: [
      { icon: Calculator, label: "Tally Module" },
      { icon: Hash, label: "Counts" },
    ]
  },
];

const kpis = [
  { label: "Total Revenue", value: "$2.84M", change: "+18.4%", up: true, icon: DollarSign, sub: "vs last quarter" },
  { label: "Export Orders", value: "1,247", change: "+12.7%", up: true, icon: FileText, sub: "this fiscal year" },
  { label: "Active Shipments", value: "83", change: "-3.2%", up: false, icon: Truck, sub: "currently in transit" },
  { label: "Inventory Value", value: "$640K", change: "+5.1%", up: true, icon: Boxes, sub: "across 6 warehouses" },
  { label: "Pending Payments", value: "$128K", change: "+9.8%", up: false, icon: Activity, sub: "overdue invoices" },
  { label: "Emp. Performance", value: "91%", change: "+2.3%", up: true, icon: Star, sub: "avg productivity score" },
];

function StatusBadge({ status }) {
  const styles = {
    "Delivered": { bg: "rgba(16,185,129,0.12)", color: "#10B981", dot: "#10B981" },
    "In Transit": { bg: "rgba(59,130,246,0.12)", color: "#60A5FA", dot: "#3B82F6" },
    "Processing": { bg: "rgba(139,92,246,0.12)", color: "#A78BFA", dot: "#8B5CF6" },
    "Pending": { bg: "rgba(156,163,175,0.12)", color: "#9CA3AF", dot: "#6B7280" },
  };
  const s = styles[status] || styles["Pending"];
  return (
    <span style={{
      background: s.bg, color: s.color, fontSize: 11, fontWeight: 600,
      padding: "3px 10px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 5
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
      {status}
    </span>
  );
}

function ScoreBar({ score }) {
  const color = score >= 95 ? GOLD : score >= 85 ? "#3B82F6" : "#8B5CF6";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: BORDER, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 4, transition: "width 1s ease" }} />
      </div>
      <span style={{ fontSize: 12, color: TEXT, fontWeight: 600, minWidth: 28 }}>{score}</span>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px", fontSize: 12 }}>
        <p style={{ color: MUTED, marginBottom: 6, fontWeight: 600 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, margin: "2px 0" }}>{p.name}: <strong>{typeof p.value === "number" && p.value > 999 ? `$${(p.value / 1000).toFixed(0)}K` : p.value}</strong></p>
        ))}
      </div>
    );
  }
  return null;
};

export default function SecretaryDashboard() {
  const [collapsed, setCollapsed] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSection = (label) => {
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div style={{
      display: "flex", minHeight: "100vh", background: BG,
      fontFamily: "'DM Sans', 'Poppins', sans-serif", color: TEXT
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${SURFACE}; }
        ::-webkit-scrollbar-thumb { background: ${BORDER}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${GOLD_DIM}; }
        .sidebar-item { 
          display: flex; align-items: center; gap: 10px; padding: 8px 12px;
          border-radius: 8px; cursor: pointer; transition: all 0.18s ease;
          font-size: 13.5px; font-weight: 450; color: ${MUTED};
          position: relative; overflow: hidden;
        }
        .sidebar-item:hover { background: rgba(212,160,23,0.08); color: ${TEXT}; }
        .sidebar-item.active {
          background: rgba(212,160,23,0.14);
          color: ${GOLD};
          font-weight: 600;
          box-shadow: inset 3px 0 0 ${GOLD};
        }
        .sidebar-item.active::before {
          content: ''; position: absolute; left: 0; top: 50%;
          transform: translateY(-50%);
          width: 3px; height: 60%; background: ${GOLD};
          border-radius: 0 3px 3px 0;
        }
        .kpi-card {
          background: ${CARD};
          border: 1px solid ${BORDER};
          border-radius: 14px;
          padding: 20px;
          transition: all 0.22s ease;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .kpi-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(212,160,23,0.3), transparent);
        }
        .kpi-card:hover {
          border-color: rgba(212,160,23,0.35);
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(212,160,23,0.1);
        }
        .chart-card {
          background: ${CARD};
          border: 1px solid ${BORDER};
          border-radius: 14px;
          padding: 22px;
          position: relative;
          overflow: hidden;
        }
        .chart-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(212,160,23,0.2), transparent);
        }
        .table-row { transition: background 0.15s ease; }
        .table-row:hover { background: rgba(212,160,23,0.04); }
        .search-input {
          background: rgba(255,255,255,0.04);
          border: 1px solid ${BORDER};
          color: ${TEXT};
          border-radius: 10px;
          padding: 9px 14px 9px 38px;
          font-size: 13px;
          width: 280px;
          outline: none;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .search-input:focus { border-color: rgba(212,160,23,0.4); }
        .search-input::placeholder { color: ${MUTED}; }
        .icon-btn {
          width: 38px; height: 38px;
          border-radius: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid ${BORDER};
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.18s;
          color: ${MUTED};
        }
        .icon-btn:hover { border-color: rgba(212,160,23,0.4); color: ${GOLD}; }
        .section-header {
          font-size: 10px; font-weight: 700; letter-spacing: 1.2px;
          color: ${MUTED}; padding: 16px 12px 6px; 
          display: flex; align-items: center; justify-content: space-between;
          cursor: pointer; user-select: none;
        }
        .section-header:hover { color: ${TEXT}; }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        .shimmer {
          background: linear-gradient(90deg, ${CARD} 25%, rgba(212,160,23,0.04) 50%, ${CARD} 75%);
          background-size: 200% 100%;
        }
        .country-bar { transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }
        .badge-gold {
          background: rgba(212,160,23,0.15); color: ${GOLD};
          font-size: 10px; font-weight: 700; padding: 2px 8px;
          border-radius: 20px; letter-spacing: 0.5px;
        }
      `}</style>

      {/* SIDEBAR */}
      <div style={{
        width: sidebarOpen ? 230 : 0, minHeight: "100vh",
        background: SURFACE, borderRight: `1px solid ${BORDER}`,
        display: "flex", flexDirection: "column",
        transition: "width 0.3s ease", overflow: "hidden",
        position: "sticky", top: 0, flexShrink: 0
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px 16px", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DIM} 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 14, color: "#000", flexShrink: 0,
              boxShadow: `0 4px 12px rgba(212,160,23,0.35)`
            }}>SG</div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: TEXT, letterSpacing: "0.2px", lineHeight: 1.2, whiteSpace: "nowrap" }}>
                SHASTIKA GLOBAL
              </div>
              <div style={{ fontSize: 10, color: GOLD, fontWeight: 600, letterSpacing: "0.8px", whiteSpace: "nowrap" }}>
                IMPEX · AGRI EXPORT ERP
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px 20px" }}>
          {menuSections.map((section) => (
            <div key={section.label}>
              <div className="section-header" onClick={() => toggleSection(section.label)}>
                <span>{section.label}</span>
                <ChevronDown size={12} style={{ transform: collapsed[section.label] ? "rotate(-90deg)" : "none", transition: "transform 0.2s" }} />
              </div>
              {!collapsed[section.label] && section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className={`sidebar-item${item.active ? " active" : ""}`}>
                    <Icon size={15} strokeWidth={item.active ? 2.2 : 1.8} />
                    <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>
                    {item.label === "Low Stock Alerts" && (
                      <span style={{ marginLeft: "auto", background: "#EF4444", color: "#fff", borderRadius: 10, fontSize: 10, padding: "1px 6px", fontWeight: 700 }}>3</span>
                    )}
                  </div>
                );
              })}
              <div style={{ height: 1, background: BORDER, margin: "10px 4px 4px" }} />
            </div>
          ))}
        </div>

        {/* User */}
        <div style={{ padding: "12px 12px", borderTop: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DIM} 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 12, color: "#000", flexShrink: 0
          }}>NS</div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: TEXT, whiteSpace: "nowrap" }}>Nethra Sree</div>
            <div style={{ fontSize: 10.5, color: MUTED, whiteSpace: "nowrap" }}>Executive</div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "auto" }}>
        {/* TOP NAV */}
        <div style={{
          position: "sticky", top: 0, zIndex: 100,
          background: "rgba(10,10,11,0.85)", backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${BORDER}`,
          padding: "0 24px", height: 58,
          display: "flex", alignItems: "center", gap: 14
        }}>
          <button className="icon-btn" onClick={() => setSidebarOpen(v => !v)} style={{ flexShrink: 0 }}>
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>

          <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: MUTED }} />
            <input className="search-input" placeholder="Search orders, farmers, POs..." />
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <button className="icon-btn" style={{ position: "relative" }}>
              <Bell size={15} />
              <span style={{
                position: "absolute", top: 7, right: 7, width: 7, height: 7,
                borderRadius: "50%", background: GOLD, border: `2px solid ${BG}`
              }} />
            </button>
            <button className="icon-btn"><RefreshCw size={15} /></button>
            <button className="icon-btn"><Filter size={15} /></button>
            <button style={{
              background: GOLD, color: "#000", border: "none",
              borderRadius: 10, padding: "8px 16px", fontSize: 12.5,
              fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              fontFamily: "inherit", boxShadow: `0 4px 14px rgba(212,160,23,0.35)`
            }}>
              <Download size={13} /> Export Report
            </button>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DIM} 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 12.5, color: "#000", cursor: "pointer",
              flexShrink: 0
            }}>NS</div>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* PAGE HEADER */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: MUTED }}>Dashboards</span>
                <ChevronRight size={12} color={MUTED} />
                <span style={{ fontSize: 12, color: GOLD, fontWeight: 600 }}>Executive & Activities</span>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: TEXT, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.5px" }}>
                Executive & Activities Dashboard
              </h1>
              <p style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>Real-time view of your export business performance</p>
            </div>
            <div style={{
              background: `linear-gradient(135deg, rgba(212,160,23,0.12), rgba(212,160,23,0.04))`,
              border: `1px solid rgba(212,160,23,0.25)`,
              borderRadius: 14, padding: "14px 22px"
            }}>
              <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, letterSpacing: "0.5px" }}>WELCOME BACK</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: GOLD, fontFamily: "'Space Grotesk', sans-serif" }}>Executive & Activities</div>
              <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Here's what's happening today</div>
            </div>
          </div>

          {/* KPI GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {kpis.map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <div key={i} className="kpi-card">
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: `rgba(212,160,23,0.1)`,
                      border: `1px solid rgba(212,160,23,0.2)`,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <Icon size={16} color={GOLD} strokeWidth={1.8} />
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 4,
                      background: kpi.up ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                      color: kpi.up ? "#10B981" : "#EF4444",
                      borderRadius: 20, padding: "3px 9px", fontSize: 11, fontWeight: 700
                    }}>
                      {kpi.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                      {kpi.change}
                    </div>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: TEXT, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.5px" }}>
                    {kpi.value}
                  </div>
                  <div style={{ fontSize: 13, color: TEXT, fontWeight: 500, marginTop: 2 }}>{kpi.label}</div>
                  <div style={{ fontSize: 11.5, color: MUTED, marginTop: 4 }}>{kpi.sub}</div>
                </div>
              );
            })}
          </div>

          {/* CHARTS ROW 1 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 14 }}>
            {/* Sales Trend */}
            <div className="chart-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Space Grotesk', sans-serif" }}>Revenue & Orders Trend</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Last 8 months performance</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["1M", "3M", "6M", "YTD"].map((t, i) => (
                    <span key={t} style={{
                      fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                      background: i === 3 ? `rgba(212,160,23,0.15)` : "transparent",
                      color: i === 3 ? GOLD : MUTED,
                      border: `1px solid ${i === 3 ? "rgba(212,160,23,0.3)" : BORDER}`,
                      fontWeight: 600
                    }}>{t}</span>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={salesData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: MUTED, fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: MUTED, fontSize: 11 }} tickFormatter={v => `$${v / 1000}K`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="target" name="Target" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="4 3" fill="url(#targetGrad)" dot={false} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke={GOLD} strokeWidth={2.5} fill="url(#revGrad)" dot={{ fill: GOLD, r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: GOLD }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Shipment Donut */}
            <div className="chart-card">
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Space Grotesk', sans-serif" }}>Shipment Status</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Current distribution</div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={shipmentData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                    dataKey="value" strokeWidth={0} paddingAngle={3}>
                    {shipmentData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} opacity={0.9} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                {shipmentData.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 11, color: MUTED }}>{d.name}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{d.value}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CHARTS ROW 2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Procurement Bar */}
            <div className="chart-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Space Grotesk', sans-serif" }}>Procurement Analytics</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Quarterly volume by commodity (MT)</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={procurementData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }} barSize={10} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} horizontal={true} vertical={false} />
                  <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: MUTED, fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: MUTED, fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="q1" name="Q1" fill={GOLD} opacity={0.5} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="q2" name="Q2" fill={GOLD} opacity={0.7} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="q3" name="Q3" fill={GOLD} opacity={0.85} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="q4" name="Q4" fill={GOLD} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Export Countries */}
            <div className="chart-card">
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Space Grotesk', sans-serif" }}>Top Export Destinations</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>By share of total export volume</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {exportCountries.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{c.flag}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>{c.country}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>{c.exports}%</span>
                      </div>
                      <div style={{ height: 5, background: BORDER, borderRadius: 5, overflow: "hidden" }}>
                        <div style={{
                          width: `${c.exports}%`, height: "100%", borderRadius: 5,
                          background: i === 0 ? GOLD : i === 1 ? "#3B82F6" : i === 2 ? "#8B5CF6" : i === 3 ? "#10B981" : "#F59E0B"
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* TABLES ROW */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Recent Shipments */}
            <div className="chart-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Space Grotesk', sans-serif" }}>Recent Shipments</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Latest export activity</div>
                </div>
                <span className="badge-gold">View All →</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["ID", "Destination", "Commodity", "Status", "Date"].map(h => (
                      <th key={h} style={{ fontSize: 10.5, fontWeight: 700, color: MUTED, letterSpacing: "0.6px", padding: "0 8px 10px", textAlign: "left", borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentShipments.map((s, i) => (
                    <tr key={i} className="table-row" style={{ borderBottom: `1px solid rgba(36,36,40,0.5)` }}>
                      <td style={{ padding: "10px 8px", fontSize: 12, fontWeight: 700, color: GOLD }}>{s.id}</td>
                      <td style={{ padding: "10px 8px", fontSize: 12, color: TEXT }}>{s.destination}</td>
                      <td style={{ padding: "10px 8px", fontSize: 12, color: MUTED }}>{s.commodity}</td>
                      <td style={{ padding: "10px 8px" }}><StatusBadge status={s.status} /></td>
                      <td style={{ padding: "10px 8px", fontSize: 11, color: MUTED }}>{s.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Supplier Performance */}
            <div className="chart-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: "'Space Grotesk', sans-serif" }}>Supplier Performance</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Quality & reliability scores</div>
                </div>
                <span className="badge-gold">Manage →</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {suppliers.map((s, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: 8,
                          background: `rgba(212,160,23,${0.08 + i * 0.04})`,
                          border: `1px solid rgba(212,160,23,${0.1 + i * 0.04})`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, color: GOLD
                        }}>{s.name.charAt(0)}{s.name.split(" ")[1]?.charAt(0)}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: MUTED }}>{s.location} · {s.orders} orders</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11.5, color: MUTED }}>On-time</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{s.onTime}</div>
                      </div>
                    </div>
                    <ScoreBar score={s.score} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BOTTOM FOOTER */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 20px",
            background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%", background: "#10B981"
              }} className="pulse" />
              <span style={{ fontSize: 12, color: MUTED }}>All systems operational</span>
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              {["Data refreshed 2 min ago", "FY 2025–26", "INR / USD"].map((t, i) => (
                <span key={i} style={{ fontSize: 11.5, color: MUTED }}>{t}</span>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Zap size={12} color={GOLD} />
              <span style={{ fontSize: 11.5, color: MUTED }}>Powered by <span style={{ color: GOLD, fontWeight: 600 }}>SGI ERP v2.4</span></span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
