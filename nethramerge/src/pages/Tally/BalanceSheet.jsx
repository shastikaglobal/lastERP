import { PageHeader } from '../../components/shared/PageHeader'
import { Download, CheckCircle } from 'lucide-react'

const R = ({ label, value, depth = 0, bold, dep }) => (
  <tr className={`border-b border-border/50 hover:bg-amber-500/5 transition-colors ${bold ? 'bg-amber-500/10' : ''}`}>
    <td className="px-4 py-2.5 text-sm text-slate-400" style={{ paddingLeft: `${16 + depth * 20}px` }}>
      {dep ? <span className="text-red-400">{label}</span> : label}
    </td>
    <td className={`px-4 py-2.5 text-right font-mono text-sm ${bold ? 'font-bold text-slate-200' : dep ? 'text-red-400' : 'text-slate-400'}`}>
      {dep ? `(${value})` : value}
    </td>
  </tr>
)

const SH = ({ label, tint }) => (
  <tr className={`${tint} border-y border-border/50`}>
    <td colSpan={2} className="px-4 py-3 text-sm font-bold text-white uppercase tracking-wider">{label}</td>
  </tr>
)

const Foot = ({ label, value, color }) => (
  <tr className="border-t-2 border-amber-500/50 bg-amber-500/10">
    <td className="px-4 py-4 font-bold text-white text-lg">{label}</td>
    <td className={`px-4 py-4 text-right font-mono font-bold text-xl ${color}`}>{value}</td>
  </tr>
)

const Ratio = ({ label, value, sub, color }) => (
  <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm p-5">
    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-3">{label}</div>
    <div className={`font-mono font-bold text-2xl ${color}`}>{value}</div>
    <div className="text-xs text-slate-600 font-mono mt-2">{sub}</div>
  </div>
)

export default function BalanceSheet() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Balance Sheet"
        breadcrumbs={[{ label: 'Home' }, { label: 'Reports' }, { label: 'Balance Sheet' }]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold font-mono bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg shadow-sm shadow-emerald-500/20">
              <CheckCircle size={12} /> Balanced — ₹32,10,000
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-gold flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md hover:-translate-y-[1px]"
            >
              <Download size={14} /> PDF
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Assets */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm">
          <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-card/80">
            <h3 className="text-lg font-semibold text-emerald-400">Assets</h3>
            <span className="font-mono font-bold text-emerald-400 text-lg">₹32,10,000</span>
          </div>
          <div className="overflow-x-auto bg-card/70">
            <table className="min-w-full">
              <thead><tr className="border-b border-border bg-card/80">
                <th className="tbl-th tbl-header py-3">Particulars</th>
                <th className="tbl-th tbl-header py-3 text-right">Amount (₹)</th>
              </tr></thead>
              <tbody>
                <SH label="Fixed Assets" tint="bg-blue-500/10" />
                <R label="Plant & Machinery (Gross)"       value="9,15,000" depth={1} />
                <R label="Less: Accumulated Depreciation"  value="65,000" depth={1} dep />
                <R label="Net Fixed Assets"                value="8,50,000" bold />
                <SH label="Current Assets" tint="bg-indigo-500/10" />
                <R label="Stock in Hand (Closing)" value="6,60,000" depth={1} />
                <R label="Sundry Debtors"          value="7,35,000" depth={1} />
                <R label="Cash in Hand"            value="4,20,000" depth={1} />
                <R label="Bank — HDFC Current A/c" value="4,60,000" depth={1} />
                <R label="Advance Tax Paid"        value="1,50,000" depth={1} />
                <R label="Prepaid Expenses"        value="35,000"   depth={1} />
                <R label="Total Current Assets"    value="24,60,000" bold />
              </tbody>
              <tfoot><Foot label="Total Assets" value="₹32,10,000" color="text-emerald-400" /></tfoot>
            </table>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden xl:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-amber-500/20 via-amber-500/50 to-amber-500/20 transform -translate-x-1/2" style={{ zIndex: 1 }}></div>

        {/* Liabilities */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm">
          <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-card/80">
            <h3 className="text-lg font-semibold text-amber-400">Liabilities &amp; Equity</h3>
            <span className="font-mono font-bold text-amber-400 text-lg">₹32,10,000</span>
          </div>
          <div className="overflow-x-auto bg-card/70">
            <table className="min-w-full">
              <thead><tr className="border-b border-border bg-card/80">
                <th className="tbl-th tbl-header py-3">Particulars</th>
                <th className="tbl-th tbl-header py-3 text-right">Amount (₹)</th>
              </tr></thead>
              <tbody>
                <SH label="Owner's Equity" tint="bg-emerald-500/10" />
                <R label="Capital Account"       value="15,00,000" depth={1} />
                <R label="Retained Earnings (PAT)" value="9,09,750" depth={1} />
                <R label="Total Equity"          value="24,09,750" bold />
                <SH label="Long-term Liabilities" tint="bg-purple-500/10" />
                <R label="Term Loan — SBI Bank"  value="2,00,000"  depth={1} />
                <SH label="Current Liabilities" tint="bg-red-500/10" />
                <R label="Sundry Creditors"              value="3,12,000" depth={1} />
                <R label="GST Payable (CGST+SGST+IGST)" value="1,81,000" depth={1} />
                <R label="TDS Payable"                   value="55,000"   depth={1} />
                <R label="Income Tax Payable"            value="52,250"   depth={1} />
                <R label="Total Current Liabilities"     value="6,00,250" bold />
              </tbody>
              <tfoot><Foot label="Total Liabilities & Equity" value="₹32,10,000" color="text-amber-400" /></tfoot>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <Ratio label="Current Ratio"        value="4.10"  sub="Ideal > 2.0 ✓"       color="text-emerald-400" />
        <Ratio label="Debt to Equity"       value="0.33"  sub="Low leverage ✓"       color="text-indigo-400" />
        <Ratio label="Gross Profit Margin"  value="64.8%" sub="(Revenue − COGS) / Rev" color="text-emerald-400" />
        <Ratio label="Return on Equity"     value="37.7%" sub="PAT / Total Equity"    color="text-amber-400" />
      </div>
    </div>
  )
}
