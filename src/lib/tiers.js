export const TIER_CONFIG = {
  free: {
    label: 'Free',
    maxBackups: 3,
    minIntervalHours: 24,
    arweave: false,
    bulkRestore: false,
    price: '$0',
  },
  guardian: {
    label: 'Guardian',
    maxBackups: 10,
    minIntervalHours: 6,
    arweave: true,
    bulkRestore: true,
    price: '$9/mo',
  },
  pro: {
    label: 'Pro',
    maxBackups: Infinity,
    minIntervalHours: 1,
    arweave: true,
    bulkRestore: true,
    price: '$29/mo',
  },
  lifetime: {
    label: 'Lifetime',
    maxBackups: Infinity,
    minIntervalHours: 1,
    arweave: true,
    bulkRestore: true,
    price: '$199 one-time',
  },
}

export function getTierConfig(tier) {
  return TIER_CONFIG[tier] || TIER_CONFIG.free
}

export function isPaidTier(tier) {
  return tier !== 'free'
}

export function canUseArweave(tier) {
  return getTierConfig(tier).arweave
}

export function canUseBulkRestore(tier) {
  return getTierConfig(tier).bulkRestore
}

export function hasBackupSpace(tier, currentCount) {
  const limit = getTierConfig(tier).maxBackups
  return limit === Infinity || currentCount < limit
}

export function backupsRemaining(tier, currentCount) {
  const limit = getTierConfig(tier).maxBackups
  if (limit === Infinity) return Infinity
  return Math.max(0, limit - currentCount)
}
