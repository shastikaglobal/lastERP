import { PageHeader } from '../../components/shared/PageHeader'
import { StatCard } from '../../components/shared/StatCard'
import { Badge } from '../../components/ui/badge'
import { Tag } from '../../components/ui/tag'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Mock Data
const kpis = {
  revenue: { label: 'Revenue', value: '₹0', delta: { value: '0%', positive: true }, hint: 'vs last month' },
  expenses: { label: 'Expenses', value: '₹0', delta: { value: '0%', positive: false }, hint: 'cost trend' },
  profit: { label: 'Profit', value: '₹0', delta: { value: '0%', positive: true }, hint: 'net margin' },
  gst: { label: 'GST Payable', value: '₹0', hint: 'liability amount' },
  receivable: { label: 'Receivable', value: '₹0', hint: 'customer balance' },
  payable: { label: 'Payable', value: '₹0', hint: 'vendor balance' },
};

const journalEntries = [];

const monthlyData = [];

const fmt = (val) => `₹${val.toLocaleString()}`;

const statusColor = { Posted: 'green', Draft: 'amber' }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs font-mono">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: ₹{(p.value / 100000).toFixed(2)}L
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const nav = useNavigate()
  const recent = journalEntries.slice(0, 5)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        breadcrumbs={[{ label: 'Home' }, { label: 'Overview' }]}
        actions={
          <div className="flex gap-2">
            <select className="select-field w-36 text-xs bg-slate-800 text-slate-200 border-slate-700 rounded-md px-2">
              <option>March 2026</option><option>February 2026</option>
            </select>
            <button className="btn-primary" onClick={() => nav('/journal')}>
              <Plus size={14} /> New Entry
            </button>
          </div>
        }
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label={kpis.revenue.label} value={kpis.revenue.value} delta={kpis.revenue.delta} hint={kpis.revenue.hint} />
        <StatCard label={kpis.expenses.label} value={kpis.expenses.value} delta={kpis.expenses.delta} hint={kpis.expenses.hint} />
        <StatCard label={kpis.profit.label} value={kpis.profit.value} delta={kpis.profit.delta} hint={kpis.profit.hint} />
        <StatCard label={kpis.gst.label} value={kpis.gst.value} hint={kpis.gst.hint} />
        <StatCard label={kpis.receivable.label} value={kpis.receivable.value} hint={kpis.receivable.hint} />
        <StatCard label={kpis.payable.label} value={kpis.payable.value} hint={kpis.payable.hint} />
      </div>

      <div className="grid grid-cols-5 gap-4 mb-4">
        {/* Revenue Chart */}
        <div className="card p-5 col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm">Revenue vs Expenses</h3>
            <span className="text-[11px] font-mono text-slate-500">Oct 2025 – Mar 2026</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData} barGap={4} barCategoryGap="30%">
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `₹${(v/100000).toFixed(0)}L`} tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={48} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
              <Bar dataKey="revenue"  name="Revenue"  fill="#6366f1" radius={[3,3,0,0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[3,3,0,0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Profit Chart */}
        <div className="card p-5 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm">Net Profit Trend</h3>
            <span className="text-[11px] font-mono text-emerald-400">+18% ↑</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${(v/100000).toFixed(0)}L`} tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={32} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155' }} />
              <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2} fill="url(#profitGrad)" dot={{ fill: '#10b981', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Journals */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <h3 className="font-semibold text-white text-sm">Recent Journal Entries</h3>
          <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium" onClick={() => nav('/journal')}>View All →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Date','Voucher No.','Narration','Type','Debit','Credit','Status'].map(h => (
                  <th key={h} className="tbl-th tbl-header py-3 px-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map(r => (
                <tr key={r.id} className="tbl-row hover:bg-slate-800/20 border-b border-slate-800/40">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.date}</td>
                  <td className="px-4 py-3"><Tag>{r.id}</Tag></td>
                  <td className="px-4 py-3 text-slate-300">{r.narration}</td>
                  <td className="px-4 py-3"><span className="text-xs text-slate-500 font-mono">{r.voucher}</span></td>
                  <td className="px-4 py-3 text-right">{r.debit ? fmt(r.debit) : '—'}</td>
                  <td className="px-4 py-3 text-right">{r.credit ? fmt(r.credit) : '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.status === 'Posted' ? 'default' : 'secondary'} className="text-[11px]">
                      {r.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
