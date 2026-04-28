const BASE_URL = import.meta.env.VITE_API_URL || ''

export async function getAgents(email) {
  try {
    const res = await fetch(`${BASE_URL}/api/agents/${encodeURIComponent(email)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn('getAgents failed; returning []', err?.message)
    return []
  }
}

export async function getTier(email) {
  try {
    const res = await fetch(`${BASE_URL}/api/tier/${encodeURIComponent(email)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data?.tier ?? data ?? 'free'
  } catch (err) {
    console.warn('getTier failed; returning "free"', err?.message)
    return 'free'
  }
}
