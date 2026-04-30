const BASE_URL = import.meta.env.VITE_API_URL || ''

export async function getAgents(email) {
  try {
    const res = await fetch(`${BASE_URL}/api/agents/${encodeURIComponent(email)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const payload = await res.json()
    return Array.isArray(payload) ? payload : (payload?.data ?? [])
  } catch (err) {
    console.warn('getAgents failed; returning []', err?.message)
    return []
  }
}

export async function getTier(email) {
  try {
    const res = await fetch(`${BASE_URL}/api/tier/${encodeURIComponent(email)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const payload = await res.json()
    return payload?.data?.tier ?? payload?.tier ?? payload ?? 'free'
  } catch (err) {
    console.warn('getTier failed; returning "free"', err?.message)
    return 'free'
  }
}

export async function getBackendHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { ok: true, data: await res.json() }
  } catch (err) {
    return { ok: false, error: err?.message || 'Health check failed' }
  }
}

export async function getBackendMetrics() {
  try {
    const res = await fetch(`${BASE_URL}/api/metrics`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { ok: true, data: await res.json() }
  } catch (err) {
    return { ok: false, error: err?.message || 'Metrics check failed' }
  }
}

export async function getHealthValidation() {
  try {
    const res = await fetch(`${BASE_URL}/api/validate-health`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { ok: true, data: await res.json() }
  } catch (err) {
    return { ok: false, error: err?.message || 'Health validation failed' }
  }
}

export async function getAppHealth() {
  if (typeof window === 'undefined' || !window.guardian?.getHealth) {
    return { ok: false, unavailable: true, error: 'Open Agent Guardian desktop app to see local cron heartbeat.' }
  }
  try {
    return { ok: true, data: await window.guardian.getHealth() }
  } catch (err) {
    return { ok: false, error: err?.message || 'Local app health unavailable' }
  }
}
