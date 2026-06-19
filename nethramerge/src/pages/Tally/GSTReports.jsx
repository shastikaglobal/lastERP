import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { PageHeader } from '../../components/shared/PageHeader'
import { StatCard } from '../../components/shared/StatCard'
import { Badge } from '../../components/ui/badge'
import { Tag } from '../../components/ui/tag'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { Plus, Loader2, Download, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'

const fmt = (n) => (n || n === 0) ? Number(n).toLocaleString('en-IN') : '—'

export default function GSTReports() {
  const { profile } = useAuth()
  const company_id = profile?.company_id
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('All')
  const [deletingId, setDeletingId] = useState(null)

  // Form State
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [party, setParty] = useState('')
  const [gstin, setGstin] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [taxableAmt, setTaxableAmt] = useState('')
  const [cgst, setCgst] = useState('')
  const [sgst, setSgst] = useState('')
  const [igst, setIgst] = useState('')
  const [type, setType] = useState('Sales')

  const fetchData = async () => {
    if (!company_id) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      const { data: { session: __s1 } } = await supabase.auth.getSession();
      const res = await fetch('/api/finance/gst_transactions', { headers: { 'Authorization': `Bearer ${__s1?.access_token}` } });
      const records = res.ok ? await res.json() : [];
      // Optionally sort client-side
      records.sort((a, b) => new Date(b.date) - new Date(a.date));
      const error = res.ok ? null : new Error("Fetch failed");
      setData(records || [])
    } catch (error) {
      toast.error('Unable to load GST reports.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [company_id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!company_id) {
      toast.error('Company not loaded. Please refresh.')
      return
    }

    // Validation
    if (!party.trim()) {
      toast.error('Party name is required')
      return
    }
    if (!invoiceNo.trim()) {
      toast.error('Invoice number is required')
      return
    }
    
    setSaving(true)
    try {
      const tAmt = parseFloat(taxableAmt) || 0
      const cAmt = parseFloat(cgst) || 0
      const sAmt = parseFloat(sgst) || 0
      const iAmt = parseFloat(igst) || 0
      const total = tAmt + cAmt + sAmt + iAmt

      const { data: { session: __s2 } } = await supabase.auth.getSession();
      const res = await fetch('/api/finance/gst_transactions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${__s2?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([{
          date,
          party,
          gstin,
          invoice_no: invoiceNo,
          taxable_amt: tAmt,
          cgst: cAmt,
          sgst: sAmt,
          igst: iAmt,
          total,
          type,
          is_deleted: false,
          deleted_at: null
        }])
      });
      const error = res.ok ? null : new Error("Insert failed");

      toast.success('GST entry added successfully')
      setOpen(false)
      fetchData()
      
      // Reset form
      setParty('')
      setGstin('')
      setInvoiceNo('')
      setTaxableAmt('')
      setCgst('')
      setSgst('')
      setIgst('')
      setType('Sales')
    } catch (error) {
      toast.error(error.message || 'Failed to add entry')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Hide this GST record from the report? The record will remain in the database for audit and recovery.')) return
    setDeletingId(id)
    try {
      const { data: { session: __s3 } } = await supabase.auth.getSession();
      const res = await fetch(`/api/finance/gst_transactions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${__s3?.access_token}` }
      });
      const error = res.ok ? null : new Error("Hide failed");

      setData(prev => prev.filter(record => record.id !== id))
      toast.success('GST record hidden from view; underlying data retained.')
    } catch (err) {
      toast.error(err.message || 'Failed to hide GST record')
      console.error(err)
    } finally {
      setDeletingId(null)
    }
  }

  const filteredData = data.filter(r => filter === 'All' || r.type === filter)

  const totTaxable = filteredData.reduce((s, r) => s + (Number(r.taxable_amt) || 0), 0)
  const totCgst = filteredData.reduce((s, r) => s + (Number(r.cgst) || 0), 0)
  const totSgst = filteredData.reduce((s, r) => s + (Number(r.sgst) || 0), 0)
  const totIgst = filteredData.reduce((s, r) => s + (Number(r.igst) || 0), 0)
  const totTaxCollected = totCgst + totSgst + totIgst

  const handleExport = () => {
    if (filteredData.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = ['Date', 'Party', 'GSTIN', 'Invoice No', 'Taxable Amt', 'CGST', 'SGST', 'IGST', 'Total', 'Type']
    const csvContent = [
      headers.join(','),
      ...filteredData.map(r => [
        r.date,
        `"${r.party || ''}"`,
        `"${r.gstin || ''}"`,
        r.invoice_no,
        r.taxable_amt,
        r.cgst,
        r.sgst,
        r.igst,
        r.total,
        r.type
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `gst_report_${filter.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Exported successfully')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="GST Reports"
        breadcrumbs={[{ label: 'Home' }, { label: 'Reports' }, { label: 'GST' }]}
        actions={
          <div className="flex items-center gap-2">
            <input type="date" defaultValue="2026-03-01" className="force-gold-input rounded-[8px] px-[14px] py-[8px] w-36 text-sm transition-colors" />
            <input type="date" defaultValue="2026-03-31" className="force-gold-input rounded-[8px] px-[14px] py-[8px] w-36 text-sm transition-colors" />
            <button 
              onClick={handleExport}
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
            <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f0a500',
                  color: '#000000',
                  border: '1.5px solid #f0a500',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 0 12px rgba(240,165,0,0.3)',
                }}
              >
                <Plus size={15} /> Add GST Entry
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-card border-border">
              <DialogHeader>
                <DialogTitle>Add GST Transaction</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Transaction Type</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={type} onChange={e => setType(e.target.value)}>
                      <option value="Sales">Sales</option>
                      <option value="Purchase">Purchase</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" required value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Party Name</Label>
                    <Input required placeholder="Customer / Supplier Name" value={party} onChange={e => setParty(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>GSTIN</Label>
                    <Input placeholder="Enter GSTIN" value={gstin} onChange={e => setGstin(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Invoice No</Label>
                    <Input required placeholder="INV-..." value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Taxable Amount</Label>
                    <Input type="number" step="0.01" required placeholder="0.00" value={taxableAmt} onChange={e => setTaxableAmt(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>CGST</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={cgst} onChange={e => setCgst(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>SGST</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={sgst} onChange={e => setSgst(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>IGST</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={igst} onChange={e => setIgst(e.target.value)} />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" className="btn-gold" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Save Entry
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm border-l-4 border-l-blue-500/80">
          <StatCard label="Total Taxable Amt" value={`₹${fmt(totTaxable)}`} />
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm border-l-4 border-l-emerald-500/80">
          <StatCard label="Total CGST" value={`₹${fmt(totCgst)}`} />
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm border-l-4 border-l-amber-500/80">
          <StatCard label="Total SGST" value={`₹${fmt(totSgst)}`} />
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm border-l-4 border-l-purple-500/80">
          <StatCard label="Total IGST" value={`₹${fmt(totIgst)}`} />
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm border-l-4 border-l-red-500/80">
          <StatCard label="Total Tax Collected" value={`₹${fmt(totTaxCollected)}`} />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm">
        <div className="border-b border-[#2a2a2a] bg-[#161616] px-6 py-4 flex gap-1">
          {['All', 'Sales', 'Purchase'].map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                ...(filter === t
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
                if (filter !== t) e.target.style.background = 'rgba(240,165,0,0.1)';
              }}
              onMouseLeave={(e) => {
                if (filter !== t) e.target.style.background = 'transparent';
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto bg-card/70">
          {loading ? (
            <div className="flex items-center justify-center p-8 text-slate-400 gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading GST records...
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No GST transactions found.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/80">
                  {['Date','Party','GSTIN','Invoice No','Taxable Amt','CGST','SGST','IGST','Total','Type','Actions'].map((h) => (
                    <th key={h} className="tbl-th tbl-header py-3 text-left pl-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((r) => (
                  <tr key={r.id} className="tbl-row hover:bg-amber-500/5 transition-colors">
                    <td className="tbl-cell font-mono text-xs text-slate-500 pl-4">{r.date}</td>
                    <td className="tbl-cell font-semibold text-slate-200 pl-4">{r.party}</td>
                    <td className="tbl-cell font-mono text-xs text-slate-400 pl-4">{r.gstin || '—'}</td>
                    <td className="tbl-cell pl-4"><Tag variant="gold">{r.invoice_no}</Tag></td>
                    <td className="tbl-cell font-mono text-slate-300 pl-4">₹{fmt(r.taxable_amt)}</td>
                    <td className="tbl-cell font-mono text-slate-400 pl-4">₹{fmt(r.cgst)}</td>
                    <td className="tbl-cell font-mono text-slate-400 pl-4">₹{fmt(r.sgst)}</td>
                    <td className="tbl-cell font-mono text-slate-400 pl-4">₹{fmt(r.igst)}</td>
                    <td className="tbl-cell font-mono font-semibold text-emerald-400 pl-4">₹{fmt(r.total)}</td>
                    <td className="tbl-cell pl-4 pr-4">
                      <Badge className={r.type === 'Sales' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}>
                        {r.type}
                      </Badge>
                    </td>
                    <td className="tbl-cell pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Hide
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
