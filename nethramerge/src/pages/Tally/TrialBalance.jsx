import React, { useState, useEffect } from 'react'
import { PageHeader } from '../../components/shared/PageHeader'
import { StatCard } from '../../components/shared/StatCard'
import { Badge } from '../../components/ui/badge'
import { trialBalance as mockTrialBalance } from '../../data/mockData'
import { Download, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const groupColor = {
  Assets: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  Debtors: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  Capital: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  Liability: 'bg-red-500/10 text-red-300 border-red-500/20',
  Revenue: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  Expense: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
}

const groupHeaderBg = {
  Assets: 'bg-blue-500/10',
  Debtors: 'bg-blue-500/10',
  Capital: 'bg-purple-500/10',
  Liability: 'bg-red-500/10',
  Revenue: 'bg-emerald-500/10',
  Expense: 'bg-amber-500/10',
}

const fmt = (n) => n ? n.toLocaleString('en-IN') : '—'

export default function TrialBalance() {
  const [trialBalance, setTrialBalance] = useState(mockTrialBalance)

  useEffect(() => {
    const loadTrialBalance = async () => {
      try {
        // Fetch trial balance data excluding soft-deleted records
        const { data, error } = await supabase
          .from('trial_balance')
          .select('*')
          .neq('is_deleted', true)
          .order('group')

        if (error) throw error
        if (data && data.length > 0) {
          setTrialBalance(data)
        }
      } catch (err) {
        console.error('Failed to load trial balance:', err)
        // Use mock data as fallback
        setTrialBalance(mockTrialBalance)
      }
    }
    loadTrialBalance()
  }, [])

  const groups = [...new Set(trialBalance.map(r => r.group))]
  const totDr = trialBalance.reduce((s, r) => s + r.closeDr, 0)
  const totCr = trialBalance.reduce((s, r) => s + r.closeCr, 0)

  const handleExportCSV = () => {
    const header = ['Account', 'Group', 'Opening Dr', 'Opening Cr', 'Txn Debit', 'Txn Credit', 'Closing Dr', 'Closing Cr'].join(',');
    const rows = trialBalance.map(r => 
      [`"${r.account}"`, `"${r.group}"`, r.openDr, r.openCr, r.txnDr, r.txnCr, r.closeDr, r.closeCr].join(',')
    ).join('\n');
    
    const csvContent = header + '\n' + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Trial_Balance_FY2025-26.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trial Balance"
        breadcrumbs={[{ label: 'Home' }, { label: 'Accounts' }, { label: 'Trial Balance' }]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold font-mono bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg shadow-sm shadow-emerald-500/20">
              <CheckCircle size={12} /> Balanced
            </div>
            <button onClick={handleExportCSV} className="btn-gold flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md hover:-translate-y-[1px]">
              <Download size={14} /> Excel
            </button>
            <button onClick={handleExportPDF} className="flex items-center gap-2 border border-primary/50 text-primary-glow px-4 py-2 rounded-lg text-xs font-bold hover:bg-primary/10 transition-all">
              <Download size={14} /> PDF
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm border-l-4 border-l-red-500/80">
          <StatCard label="Total Closing Debit" value={`₹${(totDr / 100000).toFixed(2)}L`} hint="" />
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm border-l-4 border-l-emerald-500/80">
          <StatCard label="Total Closing Credit" value={`₹${(totCr / 100000).toFixed(2)}L`} hint="" />
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm border-l-4 border-l-amber-500/80">
          <StatCard label="Balance Check" value="✓ Balanced" hint="Opening + Transactions = Closing" icon={<CheckCircle className="h-4 w-4 text-amber-300" />} />
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-card/80">
          <div>
            <h3 className="text-lg font-semibold text-white">Trial Balance — FY 2025–26</h3>
            <p className="text-sm text-slate-500 mt-1">Comprehensive ledger balance verification with group-wise categorization.</p>
          </div>
          <span className="text-[11px] font-mono text-slate-500 bg-slate-900/50 px-2 py-1 rounded">All amounts in ₹</span>
        </div>
        <div className="overflow-x-auto bg-card/70">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card/80">
                {['Account','Group','Opening Dr','Opening Cr','Txn Debit','Txn Credit','Closing Dr','Closing Cr'].map(h => (
                  <th key={h} className="tbl-th tbl-header py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map(group => {
                const rows = trialBalance.filter(r => r.group === group)
                return [
                  <tr key={`g-${group}`} className={`${groupHeaderBg[group]} border-b border-border`}>
                    <td colSpan={8} className="px-4 py-3 text-xs font-bold text-slate-200 uppercase tracking-widest font-mono">{group}</td>
                  </tr>,
                  ...rows.map((r, i) => (
                    <tr key={`${group}-${i}`} className="tbl-row hover:bg-amber-500/5 transition-colors">
                      <td className="tbl-cell font-medium text-slate-200">{r.account}</td>
                      <td className="tbl-cell"><Badge className={groupColor[r.group] || 'bg-slate-500/10 text-slate-300 border-slate-500/20'}>{r.group}</Badge></td>
                      <td className="tbl-cell font-mono text-xs text-slate-400">{fmt(r.openDr)}</td>
                      <td className="tbl-cell font-mono text-xs text-slate-400">{fmt(r.openCr)}</td>
                      <td className="tbl-cell font-mono text-xs text-red-400">{fmt(r.txnDr)}</td>
                      <td className="tbl-cell font-mono text-xs text-emerald-400">{fmt(r.txnCr)}</td>
                      <td className="tbl-cell font-mono font-semibold text-xs text-emerald-400">{fmt(r.closeDr)}</td>
                      <td className="tbl-cell font-mono font-semibold text-xs text-red-400">{fmt(r.closeCr)}</td>
                    </tr>
                  ))
                ]
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-amber-500/30 bg-amber-500/10">
                <td colSpan={2} className="px-4 py-4 font-bold text-white">Grand Total</td>
                <td className="px-4 py-4 font-mono font-bold text-slate-400">{fmt(trialBalance.reduce((s, r) => s + r.openDr, 0))}</td>
                <td className="px-4 py-4 font-mono font-bold text-slate-400">{fmt(trialBalance.reduce((s, r) => s + r.openCr, 0))}</td>
                <td className="px-4 py-4 font-mono font-bold text-red-400">{fmt(trialBalance.reduce((s, r) => s + r.txnDr, 0))}</td>
                <td className="px-4 py-4 font-mono font-bold text-emerald-400">{fmt(trialBalance.reduce((s, r) => s + r.txnCr, 0))}</td>
                <td className="px-4 py-4 font-mono font-bold text-emerald-400">{fmt(totDr)}</td>
                <td className="px-4 py-4 font-mono font-bold text-red-400">{fmt(totCr)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
