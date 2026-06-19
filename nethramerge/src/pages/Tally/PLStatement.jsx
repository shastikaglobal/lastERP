import React from 'react'
import { PageHeader } from '../../components/shared/PageHeader'
import { StatCard } from '../../components/shared/StatCard'
import { Download } from 'lucide-react'

const Row = ({ label, value, depth = 0, bold, color, big }) => (
  <tr className={`border-b border-slate-800/50 ${bold ? 'bg-slate-800/30' : 'hover:bg-slate-800/20'}`}>
    <td className={`px-4 py-2.5 text-sm ${bold ? 'font-semibold text-slate-200' : 'text-slate-400'}`}
        style={{ paddingLeft: `${16 + depth * 20}px` }}>
      {label}
    </td>
    <td className={`px-4 py-2.5 text-right font-mono text-sm ${color || (bold ? 'text-slate-200 font-bold' : 'text-slate-400')}`}>
      {value}
    </td>
    <td className="w-40"></td>
  </tr>
)

const TotalRow = ({ label, value, color = 'text-white', bg = 'bg-slate-800/60' }) => (
  <tr className={`${bg} border-y border-slate-700`}>
    <td className="px-4 py-3 font-bold text-sm text-white">{label}</td>
    <td className="px-4 py-3 text-right font-mono font-bold text-base"></td>
    <td className={`px-4 py-3 text-right font-mono font-bold text-base ${color}`}>{value}</td>
  </tr>
)

const SectionHead = ({ label }) => (
  <tr className="bg-slate-800/40">
    <td colSpan={3} className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">{label}</td>
  </tr>
)

export default function PLStatement() {
  const handleExportExcel = () => {
    const table = document.querySelector('#pl-statement-table')
    if (!table) return

    const rows = Array.from(table.querySelectorAll('tr')).map((row) =>
      Array.from(row.querySelectorAll('th, td')).map((cell) => `"${(cell.textContent || '').trim().replace(/"/g, '""')}"`)
    )

    const csvContent = rows.map((cols) => cols.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `pl-statement-${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportPDF = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit & Loss Statement"
        breadcrumbs={[{ label: 'Home' }, { label: 'Reports' }, { label: 'P&L Statement' }]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <select className="bg-slate-950 border border-slate-800 text-slate-200 rounded-2xl px-4 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20">
              <option>FY 2025–26</option>
              <option>FY 2024–25</option>
            </select>
            <button onClick={handleExportExcel} className="inline-flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/15">
              <Download size={14} /> Excel
            </button>
            <button onClick={handleExportPDF} className="inline-flex items-center gap-2 rounded-2xl border border-slate-600 bg-slate-900/90 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-400 hover:bg-slate-800/95">
              <Download size={14} /> PDF
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="rounded-3xl border border-border bg-card/70 shadow-sm">
          <StatCard label="Gross Revenue" value="₹28.45L" hint="FY 2025–26" />
        </div>
        <div className="rounded-3xl border border-border bg-card/70 shadow-sm">
          <StatCard label="Total Expenses" value="₹16.32L" hint="Operational costs" />
        </div>
        <div className="rounded-3xl border border-border bg-card/70 shadow-sm">
          <StatCard label="Net Profit (PBT)" value="₹12.13L" hint="Margin: 42.6%" />
        </div>
        <div className="rounded-3xl border border-border bg-card/70 shadow-sm">
          <StatCard label="Profit After Tax" value="₹9.09L" hint="Tax @25% = ₹3.03L" />
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card/70 shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-6 py-5 border-b border-border bg-card/80">
          <div>
            <h3 className="text-lg font-semibold text-white">Income &amp; Expenditure Statement — FY 2025–26</h3>
            <p className="mt-1 text-sm text-slate-400">Comprehensive profit and loss summary for the current fiscal year.</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-900/70 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.2em] text-slate-500">All amounts in ₹</span>
        </div>
        <div className="overflow-x-auto">
          <table id="pl-statement-table" className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-950/80">
                <th className="tbl-th tbl-header py-4 px-6 text-left text-xs uppercase tracking-[0.25em] text-slate-500">Particulars</th>
                <th className="tbl-th tbl-header py-4 px-6 text-right text-xs uppercase tracking-[0.25em] text-slate-500">Amount (₹)</th>
                <th className="tbl-th tbl-header py-4 px-6 text-right text-xs uppercase tracking-[0.25em] text-slate-500">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              <SectionHead label="A — Income" />
              <Row label="1. Revenue from Operations" bold />
              <Row label="Sales — Domestic" value="18,45,000" depth={1} color="text-emerald-400 font-mono" />
              <Row label="Sales — Export" value="10,00,000" depth={1} color="text-emerald-400 font-mono" />
              <Row label="Less: Sales Returns & Discounts" value="(1,20,000)" depth={1} color="text-red-400 font-mono" />
              <TotalRow label="Net Revenue from Operations" value="₹27,25,000" color="text-emerald-400" bg="bg-emerald-500/5" />
              <Row label="2. Other Income" bold />
              <Row label="Interest Received" value="80,000" depth={1} color="text-emerald-400 font-mono" />
              <Row label="Miscellaneous Income" value="40,000" depth={1} color="text-emerald-400 font-mono" />
              <TotalRow label="Total Income (A)" value="₹28,45,000" color="text-emerald-400" bg="bg-emerald-500/10" />

              <SectionHead label="B — Expenditure" />
              <Row label="3. Cost of Goods Sold" bold />
              <Row label="Opening Stock" value="5,00,000" depth={1} color="text-red-400 font-mono" />
              <Row label="Add: Purchases" value="11,60,000" depth={1} color="text-red-400 font-mono" />
              <Row label="Less: Closing Stock" value="(6,60,000)" depth={1} color="text-emerald-400 font-mono" />
              <TotalRow label="Cost of Goods Sold (COGS)" value="₹10,00,000" color="text-red-400" bg="bg-red-500/5" />
              <Row label="4. Operating Expenses" bold />
              <Row label="Salaries & Wages" value="3,50,000" depth={1} color="text-red-400 font-mono" />
              <Row label="Office Rent" value="1,35,000" depth={1} color="text-red-400 font-mono" />
              <Row label="Travel & Conveyance" value="42,000" depth={1} color="text-red-400 font-mono" />
              <Row label="Utilities & Internet" value="28,000" depth={1} color="text-red-400 font-mono" />
              <Row label="Depreciation" value="65,000" depth={1} color="text-red-400 font-mono" />
              <Row label="Bank Charges" value="12,000" depth={1} color="text-red-400 font-mono" />
              <TotalRow label="Total Expenditure (B)" value="₹16,32,000" color="text-red-400" bg="bg-red-500/10" />

              <tr className="bg-emerald-500/10 border-y border-emerald-500/30">
                <td className="px-4 py-4 font-semibold text-emerald-300">Net Profit Before Tax (A − B)</td>
                <td></td>
                <td className="px-4 py-4 text-right font-mono text-xl font-bold text-emerald-300">₹12,13,000</td>
              </tr>
              <Row label="Less: Income Tax Provision @25%" value="3,03,250" depth={1} color="text-red-400 font-mono" />
              <tr className="bg-indigo-500/10 border-y border-indigo-500/30">
                <td className="px-4 py-4 font-semibold text-indigo-300">Profit After Tax (PAT)</td>
                <td></td>
                <td className="px-4 py-4 text-right font-mono text-xl font-bold text-indigo-300">₹9,09,750</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
