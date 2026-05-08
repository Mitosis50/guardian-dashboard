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
  const arweaveTxId = row?.arweave_tx_id || row?.arweave_txid || row?.arweave_id || ''
  return {
    ...row,
    id: row?.id || cid || `${fileName}-${row?.created_at || row?.backed_up_at || ''}`,
    file_name: fileName,
    backed_up_at: row?.backed_up_at || row?.created_at || row?.updated_at || null,
    cid,
    arweave_tx_id: arweaveTxId,
    ipfs_url: row?.ipfs_url || row?.url || (cid ? `https://gateway.pinata.cloud/ipfs/${cid}` : '#'),
    arweave_url: arweaveTxId ? `https://arweave.net/${arweaveTxId}` : '',
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

export async function activateLicense(email, licenseKey, accessToken) {
  const payload = await fetchWithRetry(
    `${BASE_URL}/api/activate`,
    {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'content-type': 'application/json',
        ...authHeaders(accessToken),
      },
      body: JSON.stringify({ email, license_key: licenseKey }),
    }
  )
  return payload?.data ?? payload
}

export async function getDesktopHeartbeat(email, accessToken) {
  try {
    const payload = await fetchWithRetry(
      `${BASE_URL}/api/heartbeat/${encodeURIComponent(email)}`,
      { cache: 'no-store', headers: authHeaders(accessToken) }
    )
    return {
      ok: true,
      data: payload?.data ?? payload,
    }
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'Failed to fetch heartbeat',
      code: err?.code || 'unknown',
    }
  }
}

export async function triggerDesktopBackup(email, accessToken) {
  if (typeof window === 'undefined' || !window.guardian?.uploadNowRemote) {
    throw new Error('Desktop app not available. Please ensure Agent Guardian is running.')
  }
  try {
    const result = await window.guardian.uploadNowRemote()
    return { ok: true, data: result }
  } catch (err) {
    throw new Error(err?.message || 'Failed to trigger backup from desktop app')
  }
}

// Analytics API functions
export async function getAnalyticsMetrics(email, accessToken) {
  const response = await fetch(`${BASE_URL}/api/analytics/metrics?email=${encodeURIComponent(email)}`, {
    cache: 'no-store',
    headers: authHeaders(accessToken)
  })
  if (!response.ok) throw new Error('Failed to fetch analytics metrics')
  return response.json()
}

export async function getUsageTrends(days = 30, accessToken) {
  const response = await fetch(`${BASE_URL}/api/analytics/usage-trends?days=${days}`, {
    cache: 'no-store',
    headers: authHeaders(accessToken)
  })
  if (!response.ok) throw new Error('Failed to fetch usage trends')
  return response.json()
}

export async function getStorageByTier(accessToken) {
  const response = await fetch(`${BASE_URL}/api/analytics/storage-by-tier`, {
    cache: 'no-store',
    headers: authHeaders(accessToken)
  })
  if (!response.ok) throw new Error('Failed to fetch storage breakdown')
  return response.json()
}

// Webhook API functions
export async function createWebhookSubscription(source, event_types, trigger_action, config = {}, accessToken) {
  const response = await fetch(`${BASE_URL}/api/webhooks/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
    body: JSON.stringify({ source, event_types, trigger_action, config }),
  })
  if (!response.ok) throw new Error('Failed to create subscription')
  return response.json()
}

export async function getWebhookSubscriptions(accessToken) {
  const response = await fetch(`${BASE_URL}/api/webhooks/subscriptions`, {
    cache: 'no-store',
    headers: authHeaders(accessToken)
  })
  if (!response.ok) throw new Error('Failed to fetch subscriptions')
  return response.json()
}

export async function deleteWebhookSubscription(id, accessToken) {
  const response = await fetch(`${BASE_URL}/api/webhooks/subscriptions/${id}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken)
  })
  if (!response.ok) throw new Error('Failed to delete subscription')
  return response.json()
}
