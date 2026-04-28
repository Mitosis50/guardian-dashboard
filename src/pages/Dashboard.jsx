import { useEffect, useState } from 'react'
import AppHeader from '../components/AppHeader'
import AgentCard from '../components/AgentCard'
import { useAuth } from '../components/AuthProvider'
import { mockBackups } from '../data/mockBackups'
import { hasSupabaseConfig } from '../lib/supabase'
import { getAgents, getTier } from '../lib/api'
import { tierLabel } from '../lib/format'

export default function Dashboard() {
  const { user } = useAuth()
  const [backups, setBackups] = useState(hasSupabaseConfig ? [] : mockBackups)
  const [tier, setTier] = useState('free')
  const [loading, setLoading] = useState(hasSupabaseConfig)
  const [usingMock, setUsingMock] = useState(!hasSupabaseConfig)

  useEffect(() => {
    async function loadData() {
      if (!hasSupabaseConfig || !user?.email) return
      setLoading(true)
      try {
        const [agents, userTier] = await Promise.all([
          getAgents(user.email),
          getTier(user.email),
        ])
        setBackups(agents.length ? agents : [])
        setTier(userTier)
        setUsingMock(false)
      } catch (err) {
        console.warn('Data load failed; showing mock data.', err?.message)
        setBackups(mockBackups)
        setUsingMock(true)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user?.email])

  return (
    <div className="min-h-screen text-slate-100">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {usingMock && (
          <div className="mb-5 rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-200">
            ⚠️ Demo mode — connect Supabase to see live data
          </div>
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

        {loading ? (
          <p className="text-slate-400">Loading backups…</p>
        ) : backups.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-12 text-center text-slate-300">
            No agents backed up yet. Drop your .md files to get started.
          </div>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {backups.map((backup) => <AgentCard key={backup.id} backup={backup} tier={tier} />)}
          </section>
        )}
      </main>
    </div>
  )
}
