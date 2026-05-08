import { useState, useRef, useEffect } from 'react'
import { X, KeyRound, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { activateLicense } from '../lib/api'
import { useAuth } from './AuthProvider'

export default function LicenseModal({ open, onClose, onActivated }) {
  const { user, session } = useAuth()
  const inputRef = useRef(null)
  const [licenseKey, setLicenseKey] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [activatedTier, setActivatedTier] = useState(null)

  useEffect(() => {
    if (open) {
      setStatus('idle')
      setMessage('')
      setActivatedTier(null)
      setLicenseKey('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!licenseKey.trim() || !user?.email || !session?.access_token) return

    setStatus('loading')
    setMessage('Verifying license key with Gumroad…')

    try {
      const result = await activateLicense(user.email, licenseKey.trim(), session.access_token)
      setActivatedTier(result?.tier || null)
      setStatus('success')
      setMessage(`Activated! Your plan is now ${result?.tier?.toUpperCase() || 'PAID'}.`)
      onActivated?.(result?.tier)
    } catch (err) {
      setStatus('error')
      setMessage(err?.message || 'Activation failed. Check your license key and try again.')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-white/15 bg-slate-900/95 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound size={20} className="text-sky-300" />
            <h3 className="text-lg font-semibold text-white">Activate license</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-400">
          Enter your Gumroad license key to upgrade your plan. You can find it in your Gumroad receipt email.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="license-key" className="mb-1.5 block text-sm font-medium text-slate-300">
              License key
            </label>
            <input
              ref={inputRef}
              id="license-key"
              type="text"
              value={licenseKey}
              onChange={(e) => { setLicenseKey(e.target.value); if (status !== 'idle') setStatus('idle') }}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              disabled={status === 'loading'}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30 disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={!licenseKey.trim() || status === 'loading'}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            {status === 'loading' ? 'Verifying…' : 'Activate'}
          </button>
        </form>

        {message && (
          <div
            className={`mt-4 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
              status === 'error'
                ? 'border-rose-400/30 bg-rose-400/10 text-rose-100'
                : status === 'success'
                  ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
                  : 'border-sky-400/30 bg-sky-400/10 text-sky-100'
            }`}
          >
            {status === 'error' && <AlertCircle size={16} className="mt-0.5 shrink-0" />}
            {status === 'success' && <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
            {status === 'loading' && <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin" />}
            <span>{message}</span>
          </div>
        )}

        {status === 'success' && (
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-lg bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-300"
          >
            Done
          </button>
        )}
      </div>
    </div>
  )
}
