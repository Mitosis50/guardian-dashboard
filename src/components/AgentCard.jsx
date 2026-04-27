import { ExternalLink } from 'lucide-react'
import { formatDateTime, nextBackupTime } from '../lib/format'
import StatusBadge from './StatusBadge'

export default function AgentCard({ backup, tier }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 transition hover:border-sky-400/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{backup.file_name}</h2>
          <p className="mt-1 text-sm text-slate-400">Agent config backup</p>
        </div>
        <StatusBadge status={backup.status} />
      </div>

      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-400">Last backup</dt>
          <dd className="text-slate-100">{formatDateTime(backup.backed_up_at)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-400">Next scheduled</dt>
          <dd className="text-slate-100">{nextBackupTime(backup.backed_up_at, tier)}</dd>
        </div>
      </dl>

      <a href={backup.ipfs_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-sky-400/10 px-3 py-2 text-sm font-medium text-sky-200 hover:bg-sky-400/20">
        Open IPFS backup <ExternalLink size={15} />
      </a>
    </article>
  )
}
