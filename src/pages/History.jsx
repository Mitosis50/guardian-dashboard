import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../components/AuthProvider'
import { mockBackups } from '../data/mockBackups'
import { hasSupabaseConfig, supabase } from '../lib/supabase'
import { formatDateTime, truncateCid } from '../lib/format'

export default function History() {
  const { user } = useAuth()
  const [backups, setBackups] = useState(mockBackups)
  const [usingMock, setUsingMock] = useState(!hasSupabaseConfig)

  useEffect(() => {
    async function loadHistory() {
      if (!hasSupabaseConfig || !user?.id) return
      const { data, error } = await supabase
        .from('agent_backups')
        .select('id,user_id,file_name,cid,ipfs_url,status,backed_up_at')
        .eq('user_id', user.id)
        .order('backed_up_at', { ascending: false })

      if (error) {
        console.warn('History load failed; showing mock data.', error.message)
        setBackups(mockBackups)
        setUsingMock(true)
      } else {
        setBackups(data?.length ? data : [])
        setUsingMock(false)
      }
    }
    loadHistory()
  }, [user?.id])

  return (
    <div className="min-h-screen text-slate-100">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.25em] text-sky-300">Version history</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Backup ledger</h1>
          <p className="mt-2 text-slate-400">Every pinned version, CID, timestamp, and status.</p>
        </div>
        {usingMock && <div className="mb-5 rounded-xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm text-sky-100">Showing mock history until Supabase is configured.</div>}
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
                      <a href={backup.ipfs_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sky-300 hover:text-sky-200">Open <ExternalLink size={14} /></a>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={backup.status} /></td>
                  </tr>
                ))}
                {backups.length === 0 && (
                  <tr><td colSpan="5" className="px-5 py-10 text-center text-slate-400">No agents backed up yet. Drop your .md files to get started.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
