import { useEffect, useState } from 'react'
import AppHeader from '../components/AppHeader'
import AgentCard from '../components/AgentCard'
import { useAuth } from '../components/AuthProvider'
import { mockBackups } from '../data/mockBackups'
import { hasSupabaseConfig, supabase } from '../lib/supabase'
import { tierLabel } from '../lib/format'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [backups, setBackups] = useState(mockBackups)
  const [loading, setLoading] = useState(hasSupabaseConfig)
  const [usingMock, setUsingMock] = useState(!hasSupabaseConfig)
  const tier = profile?.tier ?? 'free'

  useEffect(() => {
    async function loadBackups() {
      if (!hasSupabaseConfig || !user?.id) return
      setLoading(true)
      const { data, error } = await supabase
        .from('agent_backups')
        .select('id,user_id,file_name,cid,ipfs_url,status,backed_up_at')
        .eq('user_id', user.id)
        .order('backed_up_at', { ascending: false })

      if (error) {
        console.warn('Backup load failed; showing mock data.', error.message)
        setBackups(mockBackups)
        setUsingMock(true)
      } else {
        setBackups(data?.length ? data : [])
        setUsingMock(false)
      }
      setLoading(false)
    }

    loadBackups()
  }, [user?.id])

  return (
    <div className="min-h-screen text-slate-100">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
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

        {usingMock && <div className="mb-5 rounded-xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-sky-100">Showing realistic mock data. Add Supabase env vars and run the migration to load real backups.</div>}

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
