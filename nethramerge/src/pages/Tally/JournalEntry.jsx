import { useState, useEffect } from 'react'
import { PageHeader } from '../../components/shared/PageHeader'
import { Badge } from '../../components/ui/badge'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { toast } from 'sonner'
import { Plus, Trash2, CheckCircle2, AlertTriangle, Loader2, Calendar, ChevronDown, FileText, Hash, Receipt, Edit3, Lock } from 'lucide-react'



const DEFAULT_ROWS = [
  { account: '', drcr: 'Dr', debit: '', credit: '', gst: 'None' },
  { account: '', drcr: 'Cr', debit: '', credit: '', gst: 'None' },
]

const today = new Date().toISOString().slice(0, 10)

const SearchBar = ({ placeholder, value, onChange, children }) => (
  <div className="flex flex-wrap items-center gap-2">
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="force-gold-input rounded-[8px] px-[14px] py-[10px] w-[250px] overflow-hidden text-ellipsis whitespace-nowrap text-sm transition-colors"
    />
    {children}
  </div>
)

function NewEntryForm({ onSaved }) {
  const { profile } = useAuth()
  const [voucherType, setVoucherType] = useState('Journal Voucher')
  const [date, setDate] = useState(today)
  const [referenceNo, setReferenceNo] = useState('')
  const [narration, setNarration] = useState('')
  const [rows, setRows] = useState(DEFAULT_ROWS)
  const [saving, setSaving] = useState(false)
  const [accountsList, setAccountsList] = useState([])

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        if (!profile?.company_id) return;

        const { data: { session: __s1 } } = await supabase.auth.getSession();
        const res = await fetch(`/api/finance/chart_of_accounts?company_id=${profile.company_id}&status=Active`, {
          headers: { 'Authorization': `Bearer ${__s1?.access_token}` }
        });
        const coaData = res.ok ? await res.json() : [];
        const coaError = res.ok ? null : new Error("Failed to load chart of accounts");
        
        if (coaError) {
          console.error("Failed to load chart of accounts:", coaError)
          return
        }

        const accountNames = (coaData || []).map(a => a.name)
        setAccountsList(accountNames)
      } catch (err) {
        console.error("Failed to load accounts", err)
        toast.error("Failed to load accounts")
      }
    }
    loadAccounts()
  }, [profile?.company_id])

  const addRow = () => setRows((r) => [...r, { account: '', drcr: 'Dr', debit: '', credit: '', gst: 'None' }])
  const delRow = (i) => setRows((r) => r.filter((_, idx) => idx !== i))
  const upd = (i, k, v) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)))

  const totDr = rows.reduce((s, r) => s + (r.drcr === 'Dr' ? (parseFloat(r.debit) || 0) : 0), 0)
  const totCr = rows.reduce((s, r) => s + (r.drcr === 'Cr' ? (parseFloat(r.credit) || 0) : 0), 0)
  const diff = Math.abs(totDr - totCr)
  const canPost = diff === 0 && !saving && totDr > 0

  const saveEntry = async (status) => {
    // Validation checks
    if (!profile?.company_id) {
      toast.error("Company information not found")
      return
    }

    if (!narration || narration.trim() === '') {
      toast.error("Please enter a narration")
      return
    }

    // Check that at least one account is selected
    const hasSelectedAccount = rows.some(r => r.account && r.account.trim() !== '')
    if (!hasSelectedAccount) {
      toast.error("Please select at least one account")
      return
    }

    // Check that amounts are entered
    if (totDr === 0 && totCr === 0) {
      toast.error("Debit or Credit amount must be greater than 0")
      return
    }

    // For Posted status, check balance
    if (status === 'Posted') {
      if (diff > 0.01) {
        toast.error(`Total Debit must equal Total Credit (Difference: ₹${diff.toFixed(2)})`)
        return
      }
    }

    setSaving(true)
    try {
      const voucherNo = `JV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`
      
      const { data: { session: __s2 } } = await supabase.auth.getSession();
      const resEntry = await fetch('/api/finance/journal_entries', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${__s2?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: profile.company_id,
          voucher_no: voucherNo,
          voucher_type: voucherType,
          date,
          reference_no: referenceNo,
          narration,
          status: status === 'Posted' ? 'Posted' : 'Draft',
          total_debit: totDr,
          total_credit: totCr
        })
      });

      if (!resEntry.ok) {
        throw new Error("Failed to save journal entry");
      }
      const entry = await resEntry.json();

      if (!entry?.id) {
        throw new Error("Failed to create journal entry");
      }

      // Insert journal entry rows
      const rowPayload = rows
        .filter(row => row.account && row.account.trim() !== '')
        .map((row) => {
          const debitAmount = row.drcr === 'Dr' ? (parseFloat(row.debit) || 0) : 0
          const creditAmount = row.drcr === 'Cr' ? (parseFloat(row.credit) || 0) : 0
          const gstAmount = row.gst !== 'None' 
            ? parseFloat(((debitAmount + creditAmount) * parseFloat(row.gst.replace('%', '')) / 100).toFixed(2))
            : 0

          return {
            journal_entry_id: entry.id,
            account: row.account,
            drcr: row.drcr,
            debit: debitAmount,
            credit: creditAmount,
            gst_percent: row.gst,
            gst_amount: gstAmount
          }
        })

      if (rowPayload.length > 0) {
        const resRows = await fetch('/api/finance/journal_entry_rows', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${__s2?.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(rowPayload)
        });

        if (!resRows.ok) {
          throw new Error("Failed to save journal entry rows");
        }
      }

      toast.success(`Entry ${status === 'Posted' ? 'Posted' : 'Saved as Draft'} successfully`)
      
      // Reset form
      setVoucherType('Journal Voucher')
      setDate(today)
      setReferenceNo('')
      setNarration('')
      setRows(DEFAULT_ROWS)
      onSaved?.()
    } catch (error) {
      console.error("Save error:", error)
      toast.error(error.message || 'Unable to save journal entry.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDraft = () => {
    if (saving) return;
    saveEntry('Draft');
  };

  const handlePostEntry = () => {
    if (saving) return;
    saveEntry('Posted');
  };

  return (
    <div className="mb-8 space-y-6">
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-[12px] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="force-gold-text font-[700] text-[24px] tracking-tight">New Journal Voucher</h2>
          <p className="text-[#888888] text-[13px] mt-1">Enter voucher details, narration, and GST values in a clean ledger workflow.</p>
        </div>
        <div className="flex items-center mt-4 sm:mt-0 relative z-10">
          <button
            type="button"
            onClick={handleSaveDraft}
            style={{
              background: 'transparent',
              border: '1.5px solid #f0a500',
              color: '#f0a500',
              borderRadius: '8px',
              padding: '10px 24px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Save Draft
          </button>
          
          <button
            type="button"
            onClick={handlePostEntry}
            style={{
              background: '#f0a500',
              border: '1.5px solid #f0a500',
              color: '#000000',
              borderRadius: '8px',
              padding: '10px 24px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              marginLeft: '12px',
            }}
          >
            Post Entry
          </button>
        </div>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-[12px] p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 shadow-sm">
        <div>
          <label className="uppercase tracking-[1.5px] text-[11px] force-gold-text font-[600] mb-2 block flex items-center gap-1.5">Voucher Type</label>
          <div className="relative">
            <FileText className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#f0a500] w-4 h-4 pointer-events-none z-10" />
            <select style={{ paddingLeft: '40px', paddingRight: '36px' }} value={voucherType} onChange={(e) => setVoucherType(e.target.value)} className="force-gold-input rounded-[8px] py-[10px] w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm appearance-none cursor-pointer transition-colors relative z-0">
              <option>Journal Voucher</option><option>Payment Voucher</option>
              <option>Receipt Voucher</option><option>Sales Voucher</option>
              <option>Purchase Voucher</option><option>Contra Voucher</option>
            </select>
            <ChevronDown className="absolute right-[14px] top-1/2 -translate-y-1/2 text-[#888] w-4 h-4 pointer-events-none z-10" />
          </div>
        </div>
        <div>
          <label className="uppercase tracking-[1.5px] text-[11px] force-gold-text font-[600] mb-2 block flex items-center gap-1.5">Date</label>
          <div className="relative">
            <Calendar className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#f0a500] w-4 h-4 pointer-events-none z-10" />
            <input style={{ paddingLeft: '40px' }} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="force-gold-input hide-calendar-icon rounded-[8px] pr-[14px] py-[10px] w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm transition-colors relative z-0" />
          </div>
        </div>
        <div>
          <label className="uppercase tracking-[1.5px] text-[11px] force-gold-text font-[600] mb-2 block flex items-center gap-1.5">Voucher No</label>
          <div className="bg-[#1a1a1a] shadow-inner border border-[#333] text-[#888] rounded-[8px] px-[14px] py-[10px] w-full flex items-center gap-2 text-sm select-none cursor-not-allowed">
            <Lock className="w-4 h-4 text-[#555]" /> Auto generated
          </div>
        </div>
        <div>
          <label className="uppercase tracking-[1.5px] text-[11px] force-gold-text font-[600] mb-2 block flex items-center gap-1.5">Reference No</label>
          <div className="relative">
            <Receipt className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#f0a500] w-4 h-4 pointer-events-none z-10" />
            <input style={{ paddingLeft: '40px' }} type="text" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Invoice / PO No." className="force-gold-input rounded-[8px] pr-[14px] py-[10px] w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm placeholder:text-[#555] transition-colors relative z-0" />
          </div>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="uppercase tracking-[1.5px] text-[11px] force-gold-text font-[600] mb-2 block flex items-center gap-1.5">Narration</label>
          <div className="relative">
            <Edit3 className="absolute left-[14px] top-[14px] text-[#f0a500] w-4 h-4 pointer-events-none z-10" />
            <textarea style={{ paddingLeft: '40px' }} value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="Describe the nature of this transaction..." className="force-gold-input rounded-[8px] pr-[14px] py-[10px] w-full text-sm min-h-[80px] resize-y placeholder:text-[#555] transition-colors relative z-0" />
          </div>
        </div>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-[12px] shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#161616] border-b border-[#2a2a2a]">
                <th className="force-gold-text uppercase text-[11px] tracking-[1.5px] py-4 px-6 font-[600]">Account / Ledger</th>
                <th className="force-gold-text uppercase text-[11px] tracking-[1.5px] py-4 px-4 font-[600] text-center" style={{ width: '130px' }}>Dr / Cr</th>
                <th className="force-gold-text uppercase text-[11px] tracking-[1.5px] py-4 px-6 font-[600] text-right" style={{ width: '160px' }}>Debit (₹)</th>
                <th className="force-gold-text uppercase text-[11px] tracking-[1.5px] py-4 px-6 font-[600] text-right" style={{ width: '160px' }}>Credit (₹)</th>
                <th className="force-gold-text uppercase text-[11px] tracking-[1.5px] py-4 px-4 font-[600] text-center" style={{ width: '110px' }}>GST %</th>
                <th className="force-gold-text uppercase text-[11px] tracking-[1.5px] py-4 px-6 font-[600] text-right" style={{ width: '140px' }}>GST Amt</th>
                <th style={{ width: '60px' }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="bg-[#0f0f0f] border-b border-[#1f1f1f]">
                  <td className="py-3 px-6">
                    <select value={row.account} onChange={e => upd(i, 'account', e.target.value)} className="force-gold-input rounded-[8px] px-[14px] py-[8px] w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm appearance-none transition-colors">
                      <option value="">Select Account</option>
                      {accountsList.map((a) => <option key={a}>{a}</option>)}
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex bg-[#0f0f0f] border border-[#333] rounded-full p-1 w-full h-full min-h-[34px]">
                      <button
                        type="button"
                        onClick={() => upd(i, 'drcr', 'Dr')}
                        className={`flex-1 rounded-full text-[11px] font-bold py-1 px-2 transition-colors ${row.drcr === 'Dr' ? 'bg-[#3a0000] text-[#ff4444] border border-[#ff4444]' : 'bg-[#1a1a1a] text-[#555] border border-transparent hover:text-white'}`}
                      >
                        DR
                      </button>
                      <button
                        type="button"
                        onClick={() => upd(i, 'drcr', 'Cr')}
                        className={`flex-1 rounded-full text-[11px] font-bold py-1 px-2 transition-colors ${row.drcr === 'Cr' ? 'bg-[#003a00] text-[#44ff88] border border-[#44ff88]' : 'bg-[#1a1a1a] text-[#555] border border-transparent hover:text-white'}`}
                      >
                        CR
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    <input type="number" disabled={row.drcr === 'Cr'} value={row.drcr === 'Dr' ? row.debit : ''} onChange={e => upd(i, 'debit', e.target.value)} placeholder="0.00" className={`force-gold-input rounded-[8px] px-[14px] py-[8px] w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm placeholder:text-[#444] font-mono text-right transition-colors ${row.drcr === 'Dr' ? 'text-[#ff6b6b]' : 'text-[#444] cursor-not-allowed border-transparent bg-[#141414]'}`} />
                  </td>
                  <td className="py-3 px-6">
                    <input type="number" disabled={row.drcr === 'Dr'} value={row.drcr === 'Cr' ? row.credit : ''} onChange={e => upd(i, 'credit', e.target.value)} placeholder="0.00" className={`force-gold-input rounded-[8px] px-[14px] py-[8px] w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm placeholder:text-[#444] font-mono text-right transition-colors ${row.drcr === 'Cr' ? 'text-[#4ade80]' : 'text-[#444] cursor-not-allowed border-transparent bg-[#141414]'}`} />
                  </td>
                  <td className="py-3 px-4">
                    <select value={row.gst} onChange={e => upd(i, 'gst', e.target.value)} className="force-gold-input text-center rounded-[8px] px-[10px] py-[8px] w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm appearance-none transition-colors" style={{ color: '#ccc' }}>
                      <option>None</option><option>5%</option><option>12%</option><option>18%</option><option>28%</option>
                    </select>
                  </td>
                  <td className="py-3 px-6">
                    <input type="text" readOnly value={row.gst !== 'None' && row.debit ? `₹${(parseFloat(row.debit) * parseFloat(row.gst) / 100).toFixed(2)}` : ''} placeholder="Auto" className="bg-[#0f0f0f] border border-[#333] text-[#888] italic rounded-[8px] px-[14px] py-[8px] w-full focus:outline-none overflow-hidden text-ellipsis whitespace-nowrap text-sm cursor-not-allowed font-mono text-right" />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button type="button" onClick={() => delRow(i)} className="text-[#555] hover:text-[#ff4444] transition-colors p-2"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 bg-[#111]">
          <button 
            type="button" 
            onClick={addRow} 
            style={{
              width: '100%',
              border: '1.5px dashed #f0a400f0',
              color: '#f0a500',
              background: 'rgba(240,165,0,0.05)',
              padding: '12px 0',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            + Add Row
          </button>
        </div>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-[12px] px-6 py-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          {diff === 0 && totDr > 0 ? (
            <div className="flex items-center gap-2 text-[#f0a500] font-semibold text-lg">
              <CheckCircle2 size={20} /> Balanced
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[#ff4444] font-semibold text-lg">
              <AlertTriangle size={20} /> {totDr === 0 ? 'Enter valid amounts' : `Difference: ₹${diff.toFixed(2)}`}
            </div>
          )}
        </div>
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="uppercase tracking-[1px] text-[11px] force-gold-text mb-1 font-[600]">Total Debit</span>
            <span className="font-mono text-[#ff6b6b] font-[700] text-[22px]">₹{totDr.toFixed(2)}</span>
          </div>
          <div className="w-[1px] h-10 bg-[#333]"></div>
          <div className="flex flex-col items-end">
            <span className="uppercase tracking-[1px] text-[11px] force-gold-text mb-1 font-[600]">Total Credit</span>
            <span className="font-mono text-[#4ade80] font-[700] text-[22px]">₹{totCr.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function JournalEntry() {
  const { profile } = useAuth()
  const [search, setSearch] = useState('')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchEntries = async () => {
    if (!profile?.company_id) {
      setEntries([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data: { session: __s3 } } = await supabase.auth.getSession();
      const res = await fetch(`/api/finance/journal_entries?company_id=${profile.company_id}`, { headers: { 'Authorization': `Bearer ${__s3?.access_token}` } });
      let data = res.ok ? await res.json() : [];
      data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      let error = res.ok ? null : new Error("Fetch failed");

      if (error) {
        console.error("Fetch entries error:", error)
        setEntries([])
      } else {
        setEntries(data || [])
      }
    } catch (error) {
      console.error(error)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [profile?.company_id])

  const filtered = entries.filter((j) =>
    (j.narration || j.description || '').toLowerCase().includes(search.toLowerCase()) || 
    (j.voucher_no || j.entry_no || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 bg-[#0f0f0f] min-h-screen text-white pb-12">
      <style>{`
        .force-gold-text { color: #f0a500 !important; }
        .force-gold-input { background-color: #0f0f0f !important; border: 1px solid #333 !important; color: #fff !important; }
        .force-gold-input:focus { border-color: #f0a500 !important; box-shadow: 0 0 0 2px rgba(240,165,0,0.15) !important; outline: none !important; }
        .hide-calendar-icon::-webkit-calendar-picker-indicator { opacity: 0; position: absolute; left: 0; top: 0; width: 100%; height: 100%; cursor: pointer; }
      `}</style>
      <PageHeader
        title="Journal Entry"
        breadcrumbs={[{ label: 'Home' }, { label: 'Accounts' }, { label: 'Journal Entry' }]}
        actions={
          <select className="bg-[#0f0f0f] border border-[#333] text-white rounded-[8px] px-[14px] py-[10px] text-sm focus:outline-none focus:border-[#f0a500] focus:shadow-[0_0_0_2px_rgba(240,165,0,0.15)] transition-colors">
            <option>March 2026</option><option>February 2026</option>
          </select>
        }
      />
      
      <NewEntryForm onSaved={fetchEntries} />

      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-[12px] shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-6 py-5 border-b border-[#2a2a2a] bg-[#161616]">
          <div>
            <h3 className="force-gold-text font-bold text-lg">All Journal Entries</h3>
          </div>
          <SearchBar placeholder="Search vouchers..." value={search} onChange={(e) => setSearch(e.target.value)}>
            <select className="force-gold-input rounded-[8px] px-[14px] py-[10px] text-sm transition-colors">
              <option>All Types</option><option>Sales</option><option>Payment</option><option>Purchase</option>
            </select>
          </SearchBar>
        </div>
        <div className="overflow-x-auto w-full">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-[#888] gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading entries...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-[#888]">No journal entries found.</div>
          ) : (
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="bg-[#161616] border-b border-[#2a2a2a]">
                  {['Date','Voucher No.','Type','Narration','Debit','Credit','Status'].map((h) => (
                    <th key={h} className="force-gold-text uppercase text-[11px] tracking-[1.5px] py-4 px-6 font-[600] whitespace-nowrap overflow-hidden text-ellipsis">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="bg-[#0f0f0f] border-b border-[#1f1f1f] hover:bg-[#1a1a1a] transition-colors cursor-pointer">
                    <td className="py-4 px-6 font-mono text-[12px] text-[#888] whitespace-nowrap">{r.date}</td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="text-[#f0a500] font-semibold text-[13px]">{r.voucher_no || r.entry_no}</span>
                    </td>
                    <td className="py-4 px-6 text-[12px] text-[#888] whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">{r.voucher_type || r.description || 'Journal'}</td>
                    <td className="py-4 px-6 text-[13px] text-[#ddd] overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]">{r.narration}</td>
                    <td className="py-4 px-6 text-[#ff6b6b] font-mono text-[13px] whitespace-nowrap">{(r.total_debit || r.amount) ? Number(r.total_debit || r.amount).toLocaleString('en-IN') : '—'}</td>
                    <td className="py-4 px-6 text-[#4ade80] font-mono text-[13px] whitespace-nowrap">{(r.total_credit || r.amount) ? Number(r.total_credit || r.amount).toLocaleString('en-IN') : '—'}</td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <Badge className={r.status === 'Posted' ? 'bg-[#f0a500]/10 text-[#f0a500] border border-[#f0a500]/30 shadow-none' : 'bg-[#333]/50 text-[#888] border border-[#444] shadow-none'}>
                        {r.status || 'Posted'}
                      </Badge>
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
