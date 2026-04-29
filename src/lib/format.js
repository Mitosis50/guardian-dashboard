export function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function truncateCid(cid = '') {
  if (cid.length <= 14) return cid
  return `${cid.slice(0, 7)}...${cid.slice(-5)}`
}

export function nextBackupTime(lastBackup, tier = 'free') {
  if (!lastBackup) return 'Not scheduled'
  const hoursByTier = {
    free: 24,
    guardian: 6,
    pro: 1,
    lifetime: 1,
  }
  const hours = hoursByTier[tier] ?? 24
  return formatDateTime(new Date(new Date(lastBackup).getTime() + hours * 60 * 60 * 1000))
}

export function tierLabel(tier = 'free') {
  return {
    free: 'Free',
    guardian: 'Guardian',
    pro: 'Pro',
    lifetime: 'Lifetime',
  }[tier] ?? 'Free'
}
