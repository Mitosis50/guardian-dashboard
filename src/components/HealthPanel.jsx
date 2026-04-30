import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert } from 'lucide-react'
import { getAppHealth, getBackendHealth, getBackendMetrics, getHealthValidation } from '../lib/api'
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

function IncidentList({ incidents }) {
  if (!incidents?.length) {
    return <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">No active backend incidents derived from security, database, webhook, backup, or HTTP counters.</p>
  }

  return (
    <div className="space-y-2">
      {incidents.slice(0, 5).map((incident) => (
        <div key={`${incident.code}-${incident.detected_at}`} className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
          <div className="flex items-center gap-2 font-semibold text-amber-50">
            <ShieldAlert size={15} /> {incident.severity?.toUpperCase()} · {incident.code}
          </div>
          <p className="mt-1 text-amber-100/90">{incident.message}</p>
        </div>
      ))}
    </div>
  )
}

export default function HealthPanel() {
  const [backend, setBackend] = useState({ ok: false, loading: true })
  const [metrics, setMetrics] = useState({ ok: false, loading: true })
  const [validation, setValidation] = useState({ ok: false, loading: true })
  const [app, setApp] = useState({ ok: false, loading: true })
  const [refreshing, setRefreshing] = useState(false)

  async function refresh() {
    setRefreshing(true)
    const [backendHealth, backendMetrics, healthValidation, appHealth] = await Promise.all([
      getBackendHealth(),
      getBackendMetrics(),
      getHealthValidation(),
      getAppHealth(),
    ])
    setBackend(backendHealth)
    setMetrics(backendMetrics)
    setValidation(healthValidation)
    setApp(appHealth)
    setRefreshing(false)
  }

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 60_000)
    return () => clearInterval(timer)
  }, [])

  const backendData = backend.data || {}
  const metricsData = metrics.data || {}
  const counters = metricsData.metrics || {}
  const validationData = validation.data || {}
  const appData = app.data || {}
  const scheduler = appData.scheduler || {}
  const incidents = metricsData.incidents || []
  const criticalIncident = incidents.some((incident) => incident.severity === 'critical')

  return (
    <section className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-sky-950/20">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-emerald-300">
            <Activity size={18} /> Phase 3 Health
          </div>
          <h2 className="mt-2 text-2xl font-bold text-white">Live metrics + incident rules</h2>
          <p className="mt-1 text-sm text-slate-400">Backend health, security/database/webhook/backup counters, cron validation, and local desktop scheduler visibility.</p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-100 hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-white">Guardian API</h3>
            <StatusPill ok={backend.ok && backendData.ok !== false && !criticalIncident}>{backend.ok && !criticalIncident ? 'Online' : 'Needs attention'}</StatusPill>
          </div>
          {backend.ok ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Service" value={backendData.service || 'guardian-api'} />
              <Metric label="Uptime" value={backendData.uptime_seconds != null ? `${backendData.uptime_seconds}s` : '—'} />
              <Metric label="Requests" value={backendData.requests_seen} />
              <Metric label="Service role" value={backendData.database?.service_role ? 'Enabled' : 'Missing'} />
              <Metric label="Client auth" value={backendData.security?.client_auth_required ? 'Required' : 'Not required'} />
              <Metric label="Updated" value={formatDateTime(backendData.timestamp)} />
            </div>
          ) : (
            <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">{backend.error || 'Backend health unavailable.'}</p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-white">Live counters</h3>
            <StatusPill ok={metrics.ok && !criticalIncident}>{metrics.ok && !criticalIncident ? 'Metrics live' : 'Check rules'}</StatusPill>
          </div>
          {metrics.ok ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="HTTP 5xx" value={counters.http?.responses_5xx ?? 0} />
              <Metric label="DB errors" value={counters.database?.errors ?? 0} />
              <Metric label="Webhooks accepted" value={counters.webhook?.gumroad_accepted ?? 0} />
              <Metric label="Webhook issues" value={(counters.webhook?.gumroad_errors ?? 0) + (counters.webhook?.gumroad_ignored ?? 0)} />
              <Metric label="Backups created" value={counters.backup?.created ?? 0} />
              <Metric label="Cron heartbeats" value={counters.cron?.heartbeats ?? 0} />
            </div>
          ) : (
            <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">{metrics.error || 'Backend metrics unavailable.'}</p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-white">Validation path</h3>
            <StatusPill ok={validation.ok && validationData.ok}>{validationData.status || (validation.ok ? 'Checked' : 'Unavailable')}</StatusPill>
          </div>
          {validation.ok ? (
            <div className="space-y-2">
              {(validationData.checks || []).map((check) => (
                <div key={check.name} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
                  <span className="text-slate-200">{check.name.replaceAll('_', ' ')}</span>
                  <span className={check.ok ? 'text-emerald-300' : 'text-amber-300'}>{check.ok ? 'OK' : 'Open'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">{validation.error || 'Validation endpoint unavailable.'}</p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-white">Incident rules</h3>
            <StatusPill ok={incidents.length === 0}>{incidents.length === 0 ? 'Clear' : `${incidents.length} active`}</StatusPill>
          </div>
          <IncidentList incidents={incidents} />
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
