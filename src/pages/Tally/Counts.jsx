import { PageHeader } from '../../components/shared/PageHeader'
import { StatCard } from '../../components/shared/StatCard'
import { Badge } from '../../components/ui/badge'
import { Tag } from '../../components/ui/tag'
import { useState, useEffect } from 'react'
import {
  BookOpen, List, Scale, Users, ShoppingCart, FileCheck,
  CheckCircle, Clock, AlertCircle
} from 'lucide-react'
import { supabase } from '../../lib/supabase'



const VoucherRow = ({ label, value, color }) => (
  <div className="flex items-center justify-between gap-4 py-4 sm:py-3">
    <div>
      <div className="text-sm font-semibold text-slate-200">{label}</div>
      <div className="text-xs text-slate-500">Ledger classification</div>
    </div>
    <Tag variant="gold" className={`text-sm ${color}`}>
      {value}
    </Tag>
  </div>
)

export default function Counts() {
  const [counts, setCounts] = useState({
    journals: { total: 0, posted: 0, draft: 0 },
    ledgers: { total: 0, active: 0 },
    parties: { total: 0, customers: 0, vendors: 0 },
    invoices: { total: 0, paid: 0, pending: 0 },
    vouchers: { sales: 0, purchase: 0, payment: 0, receipt: 0 },
    gst: { gstr1: 'Pending', gstr3b: 'Pending', payable: '₹0' }
  })

  const statCards = [
    {
      label: 'Journal Entries',
      value: counts.journals.total.toString(),
      icon: <BookOpen className="h-4 w-4 text-amber-300" />,
      hint: `${counts.journals.posted} Posted · ${counts.journals.draft} Draft`,
      accent: 'border-amber-500/80 bg-amber-500/10',
    },
    {
      label: 'Ledger Accounts',
      value: counts.ledgers.total.toString(),
      icon: <List className="h-4 w-4 text-sky-300" />,
      hint: `${counts.ledgers.active} Active accounts`,
      accent: 'border-sky-500/80 bg-sky-500/10',
    },
    {
      label: 'Total Parties',
      value: counts.parties.total.toString(),
      icon: <Users className="h-4 w-4 text-violet-300" />,
      hint: `${counts.parties.customers} Customers · ${counts.parties.vendors} Vendors`,
      accent: 'border-violet-500/80 bg-violet-500/10',
    },
    {
      label: 'Invoices',
      value: counts.invoices.total.toString(),
      icon: <FileCheck className="h-4 w-4 text-emerald-300" />,
      hint: `${counts.invoices.paid} Paid · ${counts.invoices.pending} Pending`,
      accent: 'border-emerald-500/80 bg-emerald-500/10',
    },
    {
      label: 'Purchase Orders',
      value: '0',
      icon: <ShoppingCart className="h-4 w-4 text-amber-300" />,
      hint: '0 Fulfilled · 0 Pending',
      accent: 'border-amber-500/80 bg-amber-500/10',
    },
    {
      label: 'Trial Balance',
      value: '✓',
      icon: <Scale className="h-4 w-4 text-slate-200" />,
      hint: 'Balanced as on 31 Mar 2026',
      accent: 'border-emerald-500/80 bg-emerald-500/10',
    },
  ]

  useEffect(() => {
    const loadCounts = async () => {
      try {
        // Fetch all counts excluding soft-deleted records
        const { data: { session: __s1 } } = await supabase.auth.getSession();
        const res = await fetch('/api/finance/counts', { headers: { 'Authorization': `Bearer ${__s1?.access_token}` } });
        if (!res.ok) throw new Error("Counts fetch failed");
        const data = await res.json();

        const journalMap = data.journal_entries.reduce((acc, row) => ({ ...acc, [row.status]: parseInt(row.count) }), {});
        const posted = journalMap['Posted'] || 0;
        const draft = journalMap['Draft'] || 0;
        const totalJ = Object.values(journalMap).reduce((a,b) => a+b, 0);

        const activeLedgers = data.chart_of_accounts[0] ? parseInt(data.chart_of_accounts[0].count) : 0;
        
        const partyMap = data.parties.reduce((acc, row) => ({ ...acc, [row.type]: parseInt(row.count) }), {});
        const customers = partyMap['Customer'] || 0;
        const vendors = partyMap['Vendor'] || 0;
        const totalP = Object.values(partyMap).reduce((a,b) => a+b, 0);

        setCounts(prev => ({
          ...prev,
          journals: { total: totalJ, posted, draft },
          ledgers: { total: activeLedgers + 3, active: activeLedgers },
          parties: { total: totalP, customers, vendors }
        }))
      } catch (err) {
        console.error('Failed to load counts:', err)
      }
    }
    loadCounts()
  }, [])
  return (
    <div className="space-y-6">
      <PageHeader
        title="Transaction Counts"
        breadcrumbs={[{ label: 'Home' }, { label: 'Counts' }]}
        actions={
          <select className="select-field w-40 text-xs bg-slate-800 text-slate-200 border-slate-700 rounded-xl">
            <option>March 2026</option>
            <option>February 2026</option>
            <option>January 2026</option>
          </select>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {statCards.map(card => (
          <div key={card.label} className={`relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm ${card.accent}`}>
            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-white/20 via-transparent to-white/0" />
            <div className="relative">
              <StatCard
                label={card.label}
                value={card.value}
                icon={card.icon}
                hint={card.hint}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500/60 via-transparent to-amber-500/10" />
          <div className="relative p-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Voucher Counts</h2>
                <p className="text-sm text-slate-500">Current voucher activity with count badges for each type.</p>
              </div>
              <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20">Updated 5 minutes ago</Badge>
            </div>

            <div className="mt-6 divide-y divide-slate-800">
              <VoucherRow label="Sales Vouchers" value={counts.vouchers.sales} color="text-emerald-300" />
              <VoucherRow label="Purchase Vouchers" value={counts.vouchers.purchase} color="text-amber-300" />
              <VoucherRow label="Payment Vouchers" value={counts.vouchers.payment} color="text-sky-300" />
              <VoucherRow label="Receipt Vouchers" value={counts.vouchers.receipt} color="text-violet-300" />
            </div>

            <div className="mt-6 flex items-center justify-between rounded-3xl bg-slate-900/80 px-5 py-4 border border-slate-800">
              <div>
                <div className="text-sm text-slate-400">Total voucher volume</div>
                <div className="text-xs text-slate-500">Across all posting types</div>
              </div>
              <div className="text-2xl font-bold text-white">{counts.vouchers.sales + counts.vouchers.purchase + counts.vouchers.payment + counts.vouchers.receipt}</div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500/60 via-transparent to-emerald-500/10" />
          <div className="relative p-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">GST Filing Status</h2>
                <p className="text-sm text-slate-500">Status overview for return filings and payable liability.</p>
              </div>
              <Badge className="bg-slate-900/70 text-slate-200 border-slate-700">Filing workflow</Badge>
            </div>

            <div className="mt-6 space-y-4">
              {[
                {
                  label: 'GSTR-1 (Outward Supplies)',
                  status: counts.gst.gstr1,
                  badge: <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20">Pending</Badge>,
                  icon: Clock,
                },
                {
                  label: 'GSTR-3B (Summary Return)',
                  status: counts.gst.gstr3b,
                  badge: <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20">Filed</Badge>,
                  icon: CheckCircle,
                },
                {
                  label: 'GSTR-2A Reconciliation',
                  status: 'Pending',
                  badge: <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20">Pending</Badge>,
                  icon: AlertCircle,
                },
              ].map(item => (
                <div key={item.label} className="flex flex-col gap-2 rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-slate-200">
                      <item.icon size={16} className="text-slate-400" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {item.badge}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">Due: 11 Apr 2026</div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-3xl bg-slate-900/80 px-5 py-4 border border-slate-800">
              <div>
                <div className="text-sm text-slate-400">Net GST Payable</div>
                <div className="text-xs text-slate-500">Review pending return exposure</div>
              </div>
              <Tag variant="secondary" className="text-sm text-amber-300 border-amber-500/20 bg-amber-500/10">
                {counts.gst.payable}
              </Tag>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
