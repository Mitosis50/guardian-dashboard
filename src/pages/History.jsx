import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Loader2, ChevronDown, ChevronUp, Download, Trash2 } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import StatusBadge from '../components/StatusBadge'
import RestoreButton from '../components/RestoreButton'
import CopyButton from '../components/CopyButton'
import QrButton from '../components/QrButton'
import LicenseModal from '../components/LicenseModal'
import { useAuth } from '../components/AuthProvider'
import { hasSupabaseConfig } from '../lib/supabase'
import { getHistory, getTier } from '../lib/api'
import { formatDateTime, truncateCid } from '../lib/format'
import { canUseBulkRestore } from '../lib/tiers'

function StateMessage({ tone = 'slate', title, children }) {
  const tones = {
    slate: 'border-white/15 bg-white/[0.03] text-slate-300',
    yellow: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-200',
    red: 'border-rose-400/40 bg-rose-400/10 text-rose-100',
    sky: 'border-sky-400/30 bg-sky-400/10 text-sky-100',
  }
  return (
    <div className={`mb-5 rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      {title && <div className="mb-1 font-semibold">{title}</div>}
      <div>{children}</div>
    </div>
  )
}

export default function History() {
  const navigate = useNavigate()
  const { session, user, loading: authLoading, isConfigured } = useAuth()
  const [backups, setBackups] = useState([])
  const [tier, setTier] = useState('free')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [errorCode, setErrorCode] = useState(null)
  const [licenseModalOpen, setLicenseModalOpen] = useState(false)

  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set())

  // CID expand state
  const [expandedIds, setExpandedIds] = useState(new Set())

  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      setError(null)
      setErrorCode(null)

      if (!hasSupabaseConfig) {
        setBackups([])
        setLoading(false)
        setError('Supabase is not configured. History requires authentication.')
        setErrorCode('not_configured')
        return
      }

      if (authLoading) return

      if (!user?.email || !session?.access_token) {
        setBackups([])
        setLoading(false)
        setError('Sign in again to view your backup history.')
        setErrorCode('session_missing')
        return
      }

      setLoading(true)
      try {
        const [rows, userTier] = await Promise.all([
          getHistory(user.email, session.access_token),
          getTier(user.email, session.access_token),
        ])
        if (cancelled) return
        setBackups(rows)
        setTier(userTier || 'free')
      } catch (err) {
        if (cancelled) return
        console.warn('History load failed.', err?.message, err?.code)
        setBackups([])
        setErrorCode(err?.code || 'unknown')
        if (err?.code === 'session_expired' || err?.status === 401) {
          setError('Your session expired. Please sign out and sign in again.')
        } else if (err?.code === 'forbidden' || err?.status === 403) {
          setError('You do not have permission to view this history.')
        } else if (err?.code === 'network_error') {
          setError('Network error. Check your connection and try again.')
        } else if (err?.code === 'server_error') {
          setError('The Guardian API is experiencing issues. Please try again later.')
        } else {
          setError(err?.message || 'Failed to load history.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadHistory()
    return () => { cancelled = true }
  }, [authLoading, session?.access_token, user?.email])

  const paidBulk = canUseBulkRestore(tier)
  const selectableBackups = backups.filter((b) => b.ipfs_url && b.ipfs_url !== '#')
  const allSelected = paidBulk && selectableBackups.length > 0 && selectableBackups.every((b) => selectedIds.has(b.id))
  const someSelected = paidBulk && selectedIds.size > 0

  function toggleSelectAll() {
    if (!paidBulk) return
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      const next = new Set(selectedIds)
      selectableBackups.forEach((b) => next.add(b.id))
      setSelectedIds(next)
    }
  }

  function toggleSelect(id) {
    if (!paidBulk) return
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  function toggleExpand(id) {
    const next = new Set(expandedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setExpandedIds(next)
  }

  function handleBulkRestore() {
    if (!paidBulk) {
      setLicenseModalOpen(true)
      return
    }
    const selected = backups.filter((b) => selectedIds.has(b.id))
    if (selected.length === 0) return
    navigate('/restore', { state: { backups: selected } })
  }

  function handleClearSelection() {
    setSelectedIds(new Set())
  }

  function exportCsv() {
    const headers = ['File Name', 'Backup Date/Time', 'CID', 'Arweave TX ID', 'IPFS URL', 'Arweave URL', 'Status']
    const rows = backups.map((b) => [
      b.file_name,
      b.backed_up_at || '',
      b.cid || '',
      b.arweave_tx_id || '',
      b.ipfs_url || '',
      b.arweave_url || '',
      b.status || '',
    ])

    const escapeCell = (cell) => {
      const str = String(cell ?? '')
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const csv = [headers.join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `guardian-backup-ledger-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen text-slate-100">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-300">Version history</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Backup ledger</h1>
            <p className="mt-2 text-slate-400">Every pinned version, CID, timestamp, and status.</p>
          </div>
          {backups.length > 0 && (
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 self-start rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white sm:self-auto"
            >
              <Download size={16} />
              Export CSV
            </button>
          )}
        </div>

        {!isConfigured && (
          <StateMessage tone="yellow" title="Demo mode">
            Supabase is not configured in this dashboard build. History requires live authentication.
          </StateMessage>
        )}

        {error && (
          <StateMessage tone="red" title={errorCode === 'session_expired' || errorCode === 'session_missing' ? 'Session error' : 'History error'}>
            {error}
          </StateMessage>
        )}

        {loading && (
          <StateMessage tone="sky" title="Loading history">
            <span className="inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Fetching your backup ledger from Guardian API…
            </span>
          </StateMessage>
        )}

        {!loading && !error && backups.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-12 text-center text-slate-300">
            No backups found yet. Once you back up agent files, they will appear here.
          </div>
        )}

        {backups.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
            {!paidBulk && isConfigured && (
              <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-amber-400/5 px-5 py-3 text-sm text-amber-200">
                <span>Bulk restore is available on paid plans.</span>
                <button
                  onClick={() => setLicenseModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/30 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-400/20"
                >
                  Upgrade
                </button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-4">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        disabled={!paidBulk}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 cursor-pointer rounded border-white/20 bg-white/5 text-sky-500 focus:ring-sky-400/30 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Select all"
                      />
                    </th>
                    <th className="px-5 py-4">File Name</th>
                    <th className="px-5 py-4">Backup Date/Time</th>
                    <th className="px-5 py-4">CID</th>
                    <th className="px-5 py-4">Links</th>
                    <th className="px-5 py-4">Actions</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {backups.map((backup) => {
                    const isExpanded = expandedIds.has(backup.id)
                    const isSelected = selectedIds.has(backup.id)
                    const canSelect = paidBulk && backup.ipfs_url && backup.ipfs_url !== '#'

                    return (
                      <tr key={backup.id} className={`transition-colors ${isSelected ? 'bg-sky-400/5' : 'hover:bg-white/[0.03]'}`}>
                        <td className="px-3 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!canSelect}
                            onChange={() => toggleSelect(backup.id)}
                            className="h-4 w-4 cursor-pointer rounded border-white/20 bg-white/5 text-sky-500 focus:ring-sky-400/30 disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label={`Select ${backup.file_name}`}
                          />
                        </td>
                        <td className="px-5 py-4 font-medium text-white">{backup.file_name}</td>
                        <td className="px-5 py-4 text-slate-300">{formatDateTime(backup.backed_up_at)}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-2">
                            <span className="break-all font-mono text-slate-300" title={backup.cid}>
                              {isExpanded ? backup.cid : truncateCid(backup.cid)}
                            </span>
                            <button
                              onClick={() => toggleExpand(backup.id)}
                              title={isExpanded ? 'Collapse' : 'Expand'}
                              className="mt-0.5 shrink-0 rounded p-0.5 text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-300"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                          {backup.arweave_tx_id && (
                            <div className="mt-1 flex items-center gap-2">
                              <span className={`break-all font-mono text-xs text-amber-300/80 ${isExpanded ? '' : 'hidden'}`} title={backup.arweave_tx_id}>
                                Arweave: {backup.arweave_tx_id}
                              </span>
                              <span className={`break-all font-mono text-xs text-amber-300/80 ${isExpanded ? 'hidden' : ''}`} title={backup.arweave_tx_id}>
                                Arweave: {truncateCid(backup.arweave_tx_id)}
                              </span>
                              <CopyButton text={backup.arweave_tx_id} label="Copy TX" />
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={backup.ipfs_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-md bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-300 transition-colors hover:bg-sky-500/20"
                            >
                              IPFS <ExternalLink size={12} />
                            </a>
                            {backup.arweave_url && (
                              <a
                                href={backup.arweave_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/20"
                              >
                                Arweave <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <RestoreButton backup={backup} />
                            <QrButton
                              url={backup.arweave_url || backup.ipfs_url}
                              label={backup.arweave_url ? 'Arweave QR' : 'IPFS QR'}
                            />
                          </div>
                        </td>
                        <td className="px-5 py-4"><StatusBadge status={backup.status} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Floating bulk action bar */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 z-40 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-slate-900/95 px-5 py-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-sky-500/15 px-2.5 py-1 text-sm font-semibold text-sky-300">
                {selectedIds.size}
              </span>
              <span className="text-sm text-slate-300">
                {selectedIds.size === 1 ? 'backup selected' : 'backups selected'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearSelection}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
              >
                <Trash2 size={14} />
                Clear
              </button>
              <button
                onClick={handleBulkRestore}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition-colors hover:bg-emerald-400/20"
              >
                <Download size={14} />
                Restore Selected
              </button>
            </div>
          </div>
        </div>
      )}

      <LicenseModal
        open={licenseModalOpen}
        onClose={() => setLicenseModalOpen(false)}
        onActivated={(newTier) => {
          setTier(newTier)
          setSelectedIds(new Set())
        }}
      />
    </div>
  )
}
