import { useEffect, useState } from 'react'
import { Activity, AlertCircle, Zap } from 'lucide-react'
import { getDesktopHeartbeat, triggerDesktopBackup } from '../lib/api'

export default function AppStatus({ email, accessToken, tier }) {
  const [heartbeat, setHeartbeat] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [triggering, setTriggering] = useState(false)

  // Fetch heartbeat every 10 seconds
  useEffect(() => {
    async function refresh() {
      const result = await getDesktopHeartbeat(email, accessToken)
      if (result.ok) {
        setHeartbeat(result.data)
        setError(null)
      } else if (result.code !== 'not_found') {
        setError(result.error)
      }
    }

    setLoading(true)
    refresh().finally(() => setLoading(false))

    const interval = setInterval(() => {
      refresh()
    }, 10000)

    return () => clearInterval(interval)
  }, [email, accessToken])

  async function handleTriggerBackup() {
    if (!heartbeat || !heartbeat.last_seen_at) {
      setError('App is offline. Please open Agent Guardian and try again.')
      return
    }

    setTriggering(true)
    try {
      const result = await triggerDesktopBackup(email, accessToken)
      if (result.ok) {
        setError(null)
        // Refresh heartbeat after backup
        setTimeout(async () => {
          const refreshResult = await getDesktopHeartbeat(email, accessToken)
          if (refreshResult.ok) {
            setHeartbeat(refreshResult.data)
          }
        }, 2000)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setTriggering(false)
    }
  }

  const isOnline =
    heartbeat &&
    heartbeat.last_seen_at &&
    new Date(heartbeat.last_seen_at).getTime() > Date.now() - 60 * 1000 // Last 60 seconds

  const isActive = heartbeat?.state === 'active'
  const agentCount = heartbeat?.agent_count || 0

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-center justify-between gap-4">
        {/* Status */}
        <div className="flex items-center gap-3">
          <div
            className={`relative h-10 w-10 rounded-lg flex items-center justify-center transition-all ${
              isOnline
                ? 'bg-emerald-600/20 text-emerald-400'
                : 'bg-slate-600/20 text-slate-400'
            }`}
          >
            <Activity className="h-5 w-5" />
            {isOnline && (
              <div className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>
          <div>
            <div className="font-semibold text-white">
              {isOnline ? '🛡️ App Connected' : '⚠️ App Offline'}
            </div>
            <div className="text-xs text-slate-400">
              {agentCount} agent{agentCount !== 1 ? 's' : ''} monitored
              {heartbeat?.last_seen_at && ` · Last seen ${getTimeSince(heartbeat.last_seen_at)}`}
            </div>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={handleTriggerBackup}
          disabled={!isOnline || triggering}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-medium text-white transition-all hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap className="h-4 w-4" />
          {triggering ? 'Backing up…' : 'Backup Now'}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-rose-200">{error}</div>
        </div>
      )}

      {/* Status details */}
      {heartbeat && (
        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
          <div className="rounded-lg bg-white/5 p-2">
            <div className="text-slate-400">State</div>
            <div className="mt-0.5 font-mono text-sky-300">{heartbeat.state || 'idle'}</div>
          </div>
          <div className="rounded-lg bg-white/5 p-2">
            <div className="text-slate-400">Queued</div>
            <div className="mt-0.5 font-mono text-sky-300">{agentCount}</div>
          </div>
          <div className="rounded-lg bg-white/5 p-2">
            <div className="text-slate-400">App Version</div>
            <div className="mt-0.5 font-mono text-sky-300">{heartbeat.app_version || '—'}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function getTimeSince(isoString) {
  const ms = Date.now() - new Date(isoString).getTime()
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (seconds < 60) return `${seconds}s ago`
  if (minutes < 60) return `${minutes}m ago`
  return `${hours}h ago`
}
