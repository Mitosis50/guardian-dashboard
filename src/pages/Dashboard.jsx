import { useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import AgentCard from '../components/AgentCard'
import HealthPanel from '../components/HealthPanel'
import { useAuth } from '../components/AuthProvider'
import { mockBackups } from '../data/mockBackups'
import { hasSupabaseConfig } from '../lib/supabase'
import { getAgents, getTier } from '../lib/api'
import { tierLabel } from '../lib/format'

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

export default function Dashboard() {
  const { session, user, loading: authLoading, isConfigured, sessionValid } = useAuth()
  const [backups, setBackups] = useState(hasSupabaseConfig ? [] : mockBackups)
  const [tier, setTier] = useState('free')
  const [loading, setLoading] = useState(hasSupabaseConfig)
  const [apiError, setApiError] = useState(null)
  const [errorCode, setErrorCode] = useState(null)
  const [usingMock, setUsingMock] = useState(!hasSupabaseConfig)

  async function loadData() {
    setApiError(null)
    setErrorCode(null)

    if (!hasSupabaseConfig) {
      setBackups(mockBackups)
      setUsingMock(true)
      setLoading(false)
      return
    }

    if (authLoading) return

    if (!user?.email || !session?.access_token) {
      setBackups([])
      setUsingMock(false)
      setLoading(false)
      setApiError('Sign in again to load live Guardian backups.')
      setErrorCode('session_missing')
      return
    }

    if (!sessionValid) {
      setBackups([])
      setUsingMock(false)
      setLoading(false)
      setApiError('Your session has expired. Please sign out and sign in again.')
      setErrorCode('session_expired')
      return
    }

    setLoading(true)
    try {
      const [agents, userTier] = await Promise.all([
        getAgents(user.email, session.access_token),
        getTier(user.email, session.access_token),
      ])
      setBackups(agents)
      setTier(userTier || 'free')
      setUsingMock(false)
    } catch (err) {
      console.warn('Live Guardian API load failed.', err?.message, err?.code)
      setBackups([])
      setUsingMock(false)
      setErrorCode(err?.code || 'unknown')
      if (err?.code === 'session_expired' || err?.status === 401) {
        setApiError('Your session expired or could not be validated by the Guardian API. Please sign out and sign in again.')
      } else if (err?.code === 'forbidden' || err?.status === 403) {
        setApiError('This account is not allowed to access the requested Guardian backups.')
      } else if (err?.code === 'network_error') {
        setApiError('Network error reaching the Guardian API. Check your connection and try again.')
      } else if (err?.code === 'server_error') {
        setApiError('The Guardian API is experiencing issues. Please try again later.')
      } else {
        setApiError(err?.message || 'Guardian API is unavailable. Check VITE_API_URL and backend deployment health.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (cancelled) return
      await loadData()
    }
    run()
    return () => { cancelled = true }
  }, [authLoading, session?.access_token, user?.email, sessionValid])

  return (
    <div className="min-h-screen text-slate-100">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {!isConfigured && (
          <StateMessage tone="yellow" title="Demo mode">
            Supabase is not configured in this dashboard build, so mock backups are shown instead of live Guardian API data.
          </StateMessage>
        )}

        {apiError && (
          <StateMessage tone="red" title={errorCode === 'session_expired' || errorCode === 'session_missing' ? 'Session error' : 'Live API error'}>
            <div className="flex items-center justify-between gap-4">
              <span>{apiError}</span>
              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Retry
              </button>
            </div>
          </StateMessage>
        )}

        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-sky-300">Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Protected agent backups</h1>
            <p className="mt-2 max-w-2xl text-slate-400">Monitor pinned `.md` agent files, backup status, and IPFS recovery links.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Current plan</div>
            <div className="mt-1 text-xl font-bold text-sky-200">{tierLabel(tier)}</div>
          </div>
        </div>

        <HealthPanel />

        {loading && (
          <StateMessage tone="sky" title="Loading live Guardian data">
            <span className="inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Validating your session and fetching backups…
            </span>
          </StateMessage>
        )}

        {!loading && !apiError && backups.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-12 text-center text-slate-300">
            No agents backed up yet. Drop your .md files to get started.
          </div>
        )}

        {!loading && backups.length > 0 && (
          <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {backups.map((backup) => <AgentCard key={backup.id} backup={backup} tier={tier} />)}
          </section>
        )}
      </main>
    </div>
  )
}
