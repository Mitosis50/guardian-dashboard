import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'
import { getAppHealth, getBackendHealth } from '../lib/api'
import { formatDateTime } from '../lib/format'

function statusClasses(ok) {
  return ok
    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
    : 'border-amber-400/30 bg-amber-400/10 text-amber-200'
}

function StatusPill({ ok, children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(ok)}`}>
      {ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
      {children}
    </span>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm font-medium text-slate-100">{value ?? '—'}</div>
    </div>
  )
}

export default function HealthPanel() {
  const [backend, setBackend] = useState({ ok: false, loading: true })
  const [app, setApp] = useState({ ok: false, loading: true })
  const [refreshing, setRefreshing] = useState(false)

  async function refresh() {
    setRefreshing(true)
    const [backendHealth, appHealth] = await Promise.all([getBackendHealth(), getAppHealth()])
    setBackend(backendHealth)
    setApp(appHealth)
    setRefreshing(false)
  }

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 60_000)
    return () => clearInterval(timer)
  }, [])

  const backendData = backend.data || {}
  const appData = app.data || {}
  const scheduler = appData.scheduler || {}

  return (
    <section className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-sky-950/20">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-emerald-300">
            <Activity size={18} /> Phase 3 Health
          </div>
          <h2 className="mt-2 text-2xl font-bold text-white">Backend + cron heartbeat</h2>
          <p className="mt-1 text-sm text-slate-400">Persistent health checks for Railway API state and local Agent Guardian scheduler logs.</p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-white">Railway API</h3>
            <StatusPill ok={backend.ok && backendData.ok !== false}>{backend.ok ? 'Healthy' : 'Needs attention'}</StatusPill>
          </div>
          {backend.ok ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Service" value={backendData.service || 'guardian-api'} />
              <Metric label="Uptime" value={backendData.uptime_seconds != null ? `${backendData.uptime_seconds}s` : '—'} />
              <Metric label="Requests" value={backendData.requests_seen} />
              <Metric label="Service role" value={backendData.database?.service_role ? 'Enabled' : 'Missing'} />
              <Metric label="Client auth" value={backendData.security?.client_auth_required ? 'Required' : 'Not set'} />
              <Metric label="Updated" value={formatDateTime(backendData.timestamp)} />
            </div>
          ) : (
            <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">{backend.error || 'Backend health unavailable.'}</p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-white">Desktop cron trail</h3>
            <StatusPill ok={app.ok && appData.ok !== false}>{app.ok ? 'Heartbeat visible' : 'App not connected'}</StatusPill>
          </div>
          {app.ok ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="State" value={appData.state} />
              <Metric label="Tier" value={scheduler.tier} />
              <Metric label="Schedule" value={scheduler.expression} />
              <Metric label="Last heartbeat" value={formatDateTime(scheduler.lastHeartbeatAt || appData.updatedAt)} />
              <Metric label="Last run" value={scheduler.lastRunStatus || 'Scheduled'} />
              <Metric label="cron.log" value={appData.paths?.cronLog ? 'Persistent local log enabled' : '—'} />
            </div>
          ) : (
            <p className="rounded-xl border border-sky-400/20 bg-sky-400/10 p-3 text-sm text-sky-100">{app.error || 'Local app health is only visible inside the desktop app context.'}</p>
          )}
        </div>
      </div>
    </section>
  )
}
