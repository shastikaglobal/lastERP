import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/shared/PageHeader'
import { StatCard } from '../../components/shared/StatCard'
import { Badge } from '../../components/ui/badge'
import { Plus, AlertTriangle, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import ConfirmDialog from '../../components/ui/ConfirmDialogLegacy'


const SearchBar = ({ placeholder, value, onChange, children }) => (
  <div className="flex flex-wrap items-center gap-2">
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{
        backgroundColor: '#0f0f0f',
        border: '1px solid #333',
        color: '#ffffff',
        borderRadius: '8px',
        padding: '8px 14px',
        fontSize: '13px',
        minWidth: '220px',
        outline: 'none',
      }}
      onFocus={(e) => {
        e.target.style.borderColor = '#f0a500';
        e.target.style.boxShadow = '0 0 0 2px rgba(240,165,0,0.15)';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = '#333';
        e.target.style.boxShadow = 'none';
      }}
    />
    {children}
  </div>
)

export default function Parties() {
  const nav = useNavigate()
  const { profile } = useAuth()
  const [parties, setParties] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setType] = useState('All')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [confirm, setConfirm] = useState({ open: false, id: null, loading: false })
  const [editOpen, setEditOpen] = useState(false)
  const [editingParty, setEditingParty] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [form, setForm] = useState({
    name: '',
    gstin: '',
    type: 'Customer',
    state: '',
    credit_limit: 0,
    outstanding: 0,
    status: 'Active'
  })

  useEffect(() => {
    fetchParties()
  }, [])

  const fetchParties = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('*')
        .neq('is_deleted', true)
        .order('name', { ascending: true })

      if (error) {
        console.error('Failed to load parties:', error)
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details
        })
        
        // Provide more specific error messages
        if (error.message?.includes('relation "parties" does not exist')) {
          toast.error('Parties table not found. Please run the migration. See FIX_PARTIES_ERROR.md')
        } else if (error.message?.includes('permission denied')) {
          toast.error('Permission denied. Check RLS policies and your company assignment.')
        } else if (error.message?.includes('new row violates row-level security policy')) {
          toast.error('RLS policy issue. Check your company assignment in profiles.')
        } else {
          toast.error('Unable to load parties. Check your database connection.')
        }
        setParties([])
      } else {
        // Deduplicate client-side by GSTIN to avoid duplicate rows in UI
        const src = data || []
        const unique = []
        const seen = new Set()
        for (const item of src) {
          const key = item.gstin || item.id
          if (!seen.has(key)) {
            seen.add(key)
            unique.push(item)
          }
        }
        setParties(unique)
      }
    } catch (err) {
      console.error('Unexpected error loading parties:', err)
      toast.error('Unexpected error: ' + (err?.message || 'Unknown error'))
      setParties([])
    }

    setLoading(false)
  }

  const handleDelete = (id) => {
    setConfirm({ open: true, id, loading: false })
  }

  const confirmDelete = async () => {
    const id = confirm.id
    if (!id) return
    setConfirm(c => ({ ...c, loading: true }))
    setDeleting(id)
    const { error } = await supabase
      .from('parties')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: profile?.id || null
      })
      .eq('id', id)

    setDeleting(null)
    setConfirm({ open: false, id: null, loading: false })

    if (error) {
      console.error('Soft delete error:', error)
      toast.error('Unable to remove party. Please try again.')
      return
    }

    setParties(parties.filter((p) => p.id !== id))
    toast.success('Party removed from view (soft-deleted)')
  }

  const openEdit = (p) => {
    setEditingParty(p)
    setForm({
      name: p.name || '',
      gstin: p.gstin || '',
      type: p.type || 'Customer',
      state: p.state || '',
      credit_limit: p.credit_limit ?? p.creditLimit ?? 0,
      outstanding: p.outstanding ?? 0,
      status: p.status || 'Active'
    })
    setEditOpen(true)
  }

  const handleFormChange = (key, value) => {
    setForm((s) => ({ ...s, [key]: value }))
  }

  const saveEdit = async () => {
    if (!editingParty) return
    setSavingEdit(true)
    try {
      const payload = {
        name: form.name,
        gstin: form.gstin,
        type: form.type,
        state: form.state,
        credit_limit: Number(form.credit_limit) || 0,
        outstanding: Number(form.outstanding) || 0,
        status: form.status
      }
      const { data, error } = await supabase.from('parties').update(payload).eq('id', editingParty.id).select().single()
      if (error) {
        console.error('Update party error:', error)
        toast.error('Unable to save party. ' + (error.message || ''))
        return
      }
      setParties((prev) => prev.map((p) => (p.id === data.id ? data : p)))
      setEditOpen(false)
      setEditingParty(null)
      toast.success('Party updated successfully')
    } catch (err) {
      console.error('Unexpected save error:', err)
      toast.error('Unexpected error while saving')
    } finally {
      setSavingEdit(false)
    }
  }

  const filtered = parties.filter((p) => {
    const s = p.name?.toLowerCase().includes(search.toLowerCase()) || p.gstin?.includes(search)
    const t = typeFilter === 'All' || p.type === typeFilter
    return s && t
  })

  const customers = parties.filter((p) => p.type === 'Customer')
  const vendors = parties.filter((p) => p.type === 'Vendor')
  const receivable = customers.reduce((s, p) => s + (p.outstanding || 0), 0)
  const payable = Math.abs(vendors.reduce((s, p) => s + (p.outstanding || 0), 0))
  const overdue = parties.reduce((s, p) => s + (p.overdue || 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parties"
        breadcrumbs={[{ label: 'Home' }, { label: 'Masters' }, { label: 'Parties' }]}
        actions={
          <button
            type="button"
            onClick={() => nav('/tally/parties/create')}
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
            <Plus size={15} /> Add Party
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm border-l-4 border-l-indigo-500/80">
          <StatCard label="Total Parties" value={parties.length.toString()} hint={`${customers.length} customers, ${vendors.length} vendors`} />
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm border-l-4 border-l-emerald-500/80">
          <StatCard label="Receivables" value={`₹${(receivable / 100000).toFixed(2)}L`} hint="From customers" />
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm border-l-4 border-l-red-500/80">
          <StatCard label="Payables" value={`₹${(payable / 100000).toFixed(2)}L`} hint="To vendors" />
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm border-l-4 border-l-amber-500/80">
          <StatCard label="Overdue" value={`₹${(overdue / 100000).toFixed(2)}L`} hint="2 parties" />
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 shadow-sm">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-card/80 flex-wrap gap-3">
          <h3 className="text-lg font-semibold text-white">All Parties ({filtered.length})</h3>
          <div className="flex items-center gap-3">
            <SearchBar placeholder="Name or GSTIN..." value={search} onChange={e => setSearch(e.target.value)} />
            <div className="flex gap-1">
              {['All','Customer','Vendor'].map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    ...(typeFilter === t
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
                    if (typeFilter !== t) e.target.style.background = 'rgba(240,165,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    if (typeFilter !== t) e.target.style.background = 'transparent';
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-slate-400 text-sm">Loading parties...</p>
            </div>
          </div>
        ) : parties.length === 0 ? (
          <div className="flex items-center justify-center py-16 bg-card/50">
            <div className="text-center">
              <Users size={48} className="text-slate-600 mx-auto mb-3 opacity-50" />
              <p className="text-slate-400 text-sm mb-2">No parties found</p>
              <p className="text-slate-500 text-xs mb-4">Check FIX_PARTIES_ERROR.md if the table hasn't been created yet</p>
              <button
                onClick={() => nav('/tally/parties/create')}
                style={{
                  display: 'inline-flex',
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
                <Plus size={15} /> Create First Party
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto bg-card/70">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/80">
                  {['Party Name','GSTIN','Type','State','Credit Limit','Outstanding','Overdue','Status',''].map(h => (
                    <th key={h} className="tbl-th tbl-header py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['Customer','Vendor'].map(type => {
                  const rows = filtered.filter(p => p.type === type)
                  if (!rows.length) return null
                  const groupBg = type === 'Customer' ? 'bg-blue-500/10' : 'bg-amber-500/10'
                  const groupText = type === 'Customer' ? 'text-blue-300' : 'text-amber-300'
                  return [
                    <tr key={`g-${type}`} className={`${groupBg} border-y border-border/50`}>
                      <td colSpan={9} className="px-4 py-3 flex items-center justify-between">
                        <span className={`text-sm font-bold uppercase tracking-wider ${groupText}`}>{type}s</span>
                        <Badge className={`${groupBg} ${groupText} border-border/50`}>{rows.length}</Badge>
                      </td>
                    </tr>,
                    ...rows.map((p) => (
                      <tr key={p.id} className="tbl-row hover:bg-amber-500/5 transition-colors">
                        <td className="tbl-cell font-semibold text-slate-200">{p.name}</td>
                        <td className="tbl-cell font-mono text-[11px] text-slate-500">{p.gstin}</td>
                        <td className="tbl-cell">
                          <Badge className={p.type === 'Customer' ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}>
                            {p.type}
                          </Badge>
                        </td>
                        <td className="tbl-cell text-slate-400 text-xs">{p.state}</td>
                        <td className="tbl-cell font-mono text-xs text-slate-400">{p.credit_limit || p.creditLimit ? (p.credit_limit || p.creditLimit).toLocaleString('en-IN') : '-'}</td>
                        <td className="tbl-cell font-mono font-semibold">
                          {p.outstanding > 0
                            ? <span className="text-emerald-400">₹{p.outstanding.toLocaleString('en-IN')}</span>
                            : p.outstanding < 0
                              ? <span className="text-red-400">₹{Math.abs(p.outstanding).toLocaleString('en-IN')}</span>
                              : <span className="text-slate-600">—</span>
                          }
                        </td>
                        <td className="tbl-cell">
                          {p.overdue > 0
                            ? <div className="flex items-center gap-1">
                                <AlertTriangle size={12} className="text-amber-400" />
                                <span className="font-mono text-amber-400 font-semibold">₹{p.overdue.toLocaleString('en-IN')}</span>
                              </div>
                            : <span className="text-slate-600 text-xs">None</span>
                          }
                        </td>
                        <td className="tbl-cell">
                          <Badge className={`flex items-center gap-1 ${p.status === 'Active' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${p.status === 'Active' ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                            {p.status}
                          </Badge>
                        </td>
                        <td className="tbl-cell">
                          <button onClick={(e) => { e.stopPropagation(); openEdit(p) }} className="text-xs text-amber-400 hover:text-amber-300 font-medium border border-amber-500/30 hover:border-amber-500/50 px-2 py-1 rounded transition-colors">Edit</button>
                        </td>
                      </tr>
                    ))
                  ]
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit Modal */}
        {editOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setEditOpen(false)} />
            <div className="relative w-full max-w-2xl mx-auto bg-[#0b0b0b] rounded-2xl border border-border p-6 z-50 shadow-2xl ring-1 ring-black/40 max-h-[85vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-white mb-4">Edit Party</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Party Name</label>
                  <input value={form.name} onChange={(e) => handleFormChange('name', e.target.value)} className="w-full rounded-md p-2 bg-[#0f0f0f] border border-[#333] text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">GSTIN</label>
                  <input value={form.gstin} onChange={(e) => handleFormChange('gstin', e.target.value)} className="w-full rounded-md p-2 bg-[#0f0f0f] border border-[#333] text-white font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Type</label>
                  <select value={form.type} onChange={(e) => handleFormChange('type', e.target.value)} className="w-full rounded-md p-2 bg-[#0f0f0f] border border-[#333] text-white">
                    <option>Customer</option>
                    <option>Vendor</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">State</label>
                  <input value={form.state} onChange={(e) => handleFormChange('state', e.target.value)} className="w-full rounded-md p-2 bg-[#0f0f0f] border border-[#333] text-white text-xs" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Total Amount (Credit Limit)</label>
                  <input type="number" value={form.credit_limit} onChange={(e) => handleFormChange('credit_limit', e.target.value)} className="w-full rounded-md p-2 bg-[#0f0f0f] border border-[#333] text-white font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Outstanding Amount</label>
                  <input type="number" value={form.outstanding} onChange={(e) => handleFormChange('outstanding', e.target.value)} className="w-full rounded-md p-2 bg-[#0f0f0f] border border-[#333] text-white font-mono text-xs" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm text-slate-400">Status</label>
                  <select value={form.status} onChange={(e) => handleFormChange('status', e.target.value)} className="w-full rounded-md p-2 bg-[#0f0f0f] border border-[#333] text-white">
                    <option>Active</option>
                    <option>Pending</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button onClick={() => { setEditOpen(false); setEditingParty(null) }} className="px-4 py-2 rounded border border-[#444] text-slate-300 bg-transparent hover:bg-[#121212]">Cancel</button>
                <button onClick={saveEdit} disabled={savingEdit} className="px-4 py-2 btn-gold rounded shadow">{savingEdit ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}

        {!loading && parties.length > 0 && (
          <div className="px-6 py-5 border-t border-border bg-amber-500/5 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono">{filtered.length} of {parties.length} parties</span>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Total Receivable</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">₹{receivable.toLocaleString('en-IN')}</span>
              </div>
              <div className="w-px h-4 bg-amber-500/30" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Total Payable</span>
                <span className="font-mono font-bold text-red-400 text-sm">₹{payable.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}

          <ConfirmDialog
            open={confirm.open}
            title="Remove Party"
            message="Are you sure you want to remove this party? This will only soft-delete the record."
            loading={confirm.loading}
            confirmText="Remove"
            cancelText="Cancel"
            onConfirm={confirmDelete}
            onCancel={() => setConfirm({ open: false, id: null, loading: false })}
          />
      </div>
    </div>
  )
}
