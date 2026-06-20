import React from 'react'

export function ConfirmDialog({ open, title = 'Confirm', message, onConfirm, onCancel, confirmText = 'OK', cancelText = 'Cancel', loading = false }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={onCancel} />
      <div className="relative w-full max-w-md mx-auto bg-[#0b0b0b] rounded-lg border border-border p-6 z-50 shadow-2xl ring-1 ring-black/40">
        <h4 className="text-lg font-semibold text-white mb-2">{title}</h4>
        <p className="text-sm text-slate-300 mb-4">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded border border-[#444] text-slate-300 bg-transparent hover:bg-[#121212]">{cancelText}</button>
          <button onClick={onConfirm} disabled={loading} className="px-4 py-2 btn-gold rounded shadow">{loading ? 'Please wait...' : confirmText}</button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
