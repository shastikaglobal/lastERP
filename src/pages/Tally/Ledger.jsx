import { useState } from 'react'
import { PageHeader } from '../../components/shared/PageHeader'
import { StatCard } from '../../components/shared/StatCard'
import { Tag } from '../../components/ui/tag'
import { ledgerEntries, fmt } from '../../data/mockData'
import { Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const ACCOUNTS = ['Sales Account','Cash Account','Bank — HDFC','Raj Exports','Purchase Account','CGST Payable','Salary Expense','Capital Account']

const getTagVariant = (voucher) => {
  if (voucher.startsWith('INV')) return 'bg-amber-500/10 text-amber-300 border-amber-500/20'
  if (voucher.startsWith('JV')) return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
  if (voucher.startsWith('REC')) return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
  if (voucher.startsWith('BP') || voucher.startsWith('PAY')) return 'bg-red-500/10 text-red-300 border-red-500/20'
  if (voucher.startsWith('PUR')) return 'bg-orange-500/10 text-orange-300 border-orange-500/20'
  if (voucher.startsWith('INC')) return 'bg-blue-500/10 text-blue-300 border-blue-500/20'
  return 'bg-slate-500/10 text-slate-300 border-slate-500/20'
}

export default function Ledger() {
  const [account, setAccount] = useState('Sales Account')
  const [filter, setFilter] = useState('All')

  const filtered = ledgerEntries.filter(r => {
    // Exclude soft-deleted entries
    if (r.is_deleted) return false
    if (filter === 'Debit') return r.debit > 0
    if (filter === 'Credit') return r.credit > 0
    return true
  })

  const handleExportCSV = () => {
    const header = ['Date', 'Particulars', 'Voucher', 'Type', 'Debit', 'Credit', 'Balance', 'BalType'].join(',');
    const rows = filtered.map(r => 
      [`"${r.date}"`, `"${r.particulars}"`, `"${r.voucher}"`, `"${r.type}"`, r.debit || 0, r.credit || 0, r.balance || 0, `"${r.balType || ''}"`].join(',')
    ).join('\n');
    
    const csvContent = header + '\n' + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${account.replace(/\s+/g, '_')}_Ledger_Mar_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <style>{`
        .force-gold-text { color: #f0a500 !important; }
        .force-gold-input { background-color: #0f0f0f !important; border: 1px solid #333 !important; color: #fff !important; }
        .force-gold-input:focus { border-color: #f0a500 !important; box-shadow: 0 0 0 2px rgba(240,165,0,0.15) !important; outline: none !important; }
      `}</style>
      <PageHeader
        title="Ledger"
        breadcrumbs={[{ label: 'Home' }, { label: 'Accounts' }, { label: 'Ledger' }]}
        actions={
          <div className="flex items-center gap-2">
            <select value={account} onChange={e => setAccount(e.target.value)} className="force-gold-input rounded-[8px] px-[14px] py-[8px] w-48 text-sm transition-colors">
              {ACCOUNTS.map(a => <option key={a}>{a}</option>)}
            </select>
            <input type="date" defaultValue="2026-03-01" className="force-gold-input rounded-[8px] px-[14px] py-[8px] w-36 text-sm transition-colors" />
            <input type="date" defaultValue="2026-03-31" className="force-gold-input rounded-[8px] px-[14px] py-[8px] w-36 text-sm transition-colors" />
            <button 
              onClick={handleExportCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                color: '#f0a500',
                border: '1.5px solid #f0a500',
                borderRadius: '8px',
                padding: '8px 16px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <Download size={15} /> Export
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm border-l-4 border-l-indigo-500/80">
          <StatCard label="Opening Balance" value="₹0" hint="01 Mar 2026" />
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm border-l-4 border-l-red-500/80">
          <StatCard label="Total Debits" value="₹15,000" hint="1 transaction" />
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm border-l-4 border-l-emerald-500/80">
          <StatCard label="Total Credits" value="₹6,60,000" hint="6 transactions" />
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm border-l-4 border-l-blue-500/80">
          <StatCard label="Closing Balance" value="₹6,45,000 Cr" hint="31 Mar 2026" />
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-card/80">
          <div>
            <h3 className="text-lg font-semibold force-gold-text">{account} — March 2026</h3>
            <p className="text-sm text-[#888888] mt-1">Ledger transactions with debit/credit breakdown and balance tracking.</p>
          </div>
          <div className="flex gap-1.5">
            {['All','Debit','Credit'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  ...(filter === f
                    ? {
                        background: '#f0a500',
                        color: '#000',
                        border: '1px solid #f0a500',
                        boxShadow: '0 0 8px rgba(240,165,0,0.3)'
                      }
                    : {
                        background: 'transparent',
                        color: '#888',
                        border: '1px solid #333'
                      })
                }}
                onMouseEnter={(e) => {
                  if (filter !== f) e.target.style.background = 'rgba(240,165,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  if (filter !== f) e.target.style.background = 'transparent';
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto bg-card/70">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card/80">
                {['Date','Particulars','Voucher','Type','Debit','Credit','Balance'].map(h => (
                  <th key={h} className={`force-gold-text uppercase text-[11px] tracking-[1.5px] py-4 px-6 font-[600] ${['Debit','Credit','Balance'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i} className="tbl-row hover:bg-amber-500/5 transition-colors">
                  <td className="tbl-cell text-left px-6 font-mono text-xs text-slate-500">{r.date}</td>
                  <td className="tbl-cell text-left px-6 text-slate-300">{r.particulars}</td>
                  <td className="tbl-cell text-left px-6">{r.voucher === '—' ? <span className="text-slate-600">—</span> : <Tag className={getTagVariant(r.voucher)}>{r.voucher}</Tag>}</td>
                  <td className="tbl-cell text-left px-6"><span className="text-xs text-slate-500 font-mono">{r.type}</span></td>
                  <td className="tbl-cell text-right px-6 text-[#ff6b6b] font-mono">{r.debit ? fmt(r.debit) : '—'}</td>
                  <td className="tbl-cell text-right px-6 text-[#4ade80] font-mono">{r.credit ? fmt(r.credit) : '—'}</td>
                  <td className="tbl-cell text-right px-6 font-mono font-semibold">
                    {r.balance === 0 ? '—' : (
                      <span className={r.balType === 'Cr' ? 'text-[#4ade80]' : 'text-[#ff6b6b]'}>
                        {fmt(r.balance)} {r.balType}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#f0a500] bg-[#161616]">
                <td colSpan={4} className="px-6 py-4 font-semibold force-gold-text text-sm">Closing Balance — 31 Mar 2026</td>
                <td className="px-6 py-4 text-right font-bold text-[#ff6b6b]">₹15,000</td>
                <td className="px-6 py-4 text-right font-bold text-[#4ade80]">₹6,60,000</td>
                <td className="px-6 py-4 text-right font-mono font-bold text-[#4ade80]">₹6,45,000 Cr</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

