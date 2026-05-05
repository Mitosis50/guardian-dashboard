import { useEffect, useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../components/AuthProvider'
import { hasSupabaseConfig } from '../lib/supabase'
import { getHistory } from '../lib/api'
import { formatDateTime, truncateCid } from '../lib/format'

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
  const { session, user, loading: authLoading, isConfigured } = useAuth()
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [errorCode, setErrorCode] = useState(null)

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
        const rows = await getHistory(user.email, session.access_token)
        if (cancelled) return
        setBackups(rows)
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

  return (
    <div className="min-h-screen text-slate-100">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.25em] text-sky-300">Version history</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Backup ledger</h1>
          <p className="mt-2 text-slate-400">Every pinned version, CID, timestamp, and status.</p>
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-4">File Name</th>
                    <th className="px-5 py-4">Backup Date/Time</th>
                    <th className="px-5 py-4">CID</th>
                    <th className="px-5 py-4">IPFS Link</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {backups.map((backup) => (
                    <tr key={backup.id} className="hover:bg-white/[0.03]">
                      <td className="px-5 py-4 font-medium text-white">{backup.file_name}</td>
                      <td className="px-5 py-4 text-slate-300">{formatDateTime(backup.backed_up_at)}</td>
                      <td className="px-5 py-4 font-mono text-slate-300">{truncateCid(backup.cid)}</td>
                      <td className="px-5 py-4">
                        <a href={backup.ipfs_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sky-300 hover:text-sky-200">
                          Open <ExternalLink size={14} />
                        </a>
                      </td>
                      <td className="px-5 py-4"><StatusBadge status={backup.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
