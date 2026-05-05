const BASE_URL = import.meta.env.VITE_API_URL || ''
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 800

function authHeaders(accessToken) {
  return accessToken ? { authorization: `Bearer ${accessToken}` } : {}
}

function classifyError(err) {
  if (err.status === 401) return 'session_expired'
  if (err.status === 403) return 'forbidden'
  if (err.status === 404) return 'not_found'
  if (err.status >= 500) return 'server_error'
  if (err.message?.toLowerCase().includes('fetch') || err.message?.toLowerCase().includes('network')) return 'network_error'
  return 'unknown'
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function readJson(res) {
  let payload = null
  try {
    payload = await res.json()
  } catch {
    payload = null
  }

  if (!res.ok || payload?.ok === false) {
    const message = payload?.error || `HTTP ${res.status}`
    const err = new Error(message)
    err.status = res.status
    err.payload = payload
    err.code = classifyError(err)
    throw err
  }

  return payload
}

async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options)
      return await readJson(res)
    } catch (err) {
      lastErr = err
      const isRetryable = !err.status || err.status >= 500 || err.code === 'network_error'
      if (!isRetryable || attempt === retries) throw err
      await sleep(RETRY_DELAY_MS * (attempt + 1))
    }
  }
  throw lastErr
}

function normalizeBackup(row) {
  const cid = row?.cid || row?.ipfs_cid || row?.hash || ''
  const fileName = row?.file_name || row?.filename || row?.path || row?.name || 'Agent config'
  return {
    ...row,
    id: row?.id || cid || `${fileName}-${row?.created_at || row?.backed_up_at || ''}`,
    file_name: fileName,
    backed_up_at: row?.backed_up_at || row?.created_at || row?.updated_at || null,
    ipfs_url: row?.ipfs_url || row?.url || (cid ? `https://gateway.pinata.cloud/ipfs/${cid}` : '#'),
    status: row?.status || (row?.deleted ? 'deleted' : 'protected'),
  }
}

export async function getAgents(email, accessToken) {
  const payload = await fetchWithRetry(
    `${BASE_URL}/api/agents/${encodeURIComponent(email)}`,
    { cache: 'no-store', headers: authHeaders(accessToken) }
  )
  const rows = Array.isArray(payload) ? payload : (payload?.data ?? [])
  return rows.map(normalizeBackup)
}

export async function getHistory(email, accessToken) {
  const payload = await fetchWithRetry(
    `${BASE_URL}/api/history/${encodeURIComponent(email)}`,
    { cache: 'no-store', headers: authHeaders(accessToken) }
  )
  const rows = Array.isArray(payload) ? payload : (payload?.data ?? [])
  return rows.map(normalizeBackup)
}

export async function getTier(email, accessToken) {
  const payload = await fetchWithRetry(
    `${BASE_URL}/api/tier/${encodeURIComponent(email)}`,
    { cache: 'no-store', headers: authHeaders(accessToken) }
  )
  return payload?.data?.tier ?? payload?.tier ?? payload ?? 'free'
}

export async function getBackendHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { ok: true, data: await res.json() }
  } catch (err) {
    return { ok: false, error: err?.message || 'Health check failed', code: 'network_error' }
  }
}

export async function getBackendMetrics() {
  try {
    const res = await fetch(`${BASE_URL}/api/metrics`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { ok: true, data: await res.json() }
  } catch (err) {
    return { ok: false, error: err?.message || 'Metrics check failed', code: 'network_error' }
  }
}

export async function getHealthValidation() {
  try {
    const res = await fetch(`${BASE_URL}/api/validate-health`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { ok: true, data: await res.json() }
  } catch (err) {
    return { ok: false, error: err?.message || 'Health validation failed', code: 'network_error' }
  }
}

export async function getAppHealth() {
  if (typeof window === 'undefined' || !window.guardian?.getHealth) {
    return { ok: false, unavailable: true, error: 'Open Agent Guardian desktop app to see local cron heartbeat.', code: 'unavailable' }
  }
  try {
    return { ok: true, data: await window.guardian.getHealth() }
  } catch (err) {
    return { ok: false, error: err?.message || 'Local app health unavailable', code: 'unknown' }
  }
}
