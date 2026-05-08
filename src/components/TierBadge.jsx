import { Crown, Sparkles } from 'lucide-react'
import { getTierConfig, isPaidTier } from '../lib/tiers'

export default function TierBadge({ tier, onActivate }) {
  const config = getTierConfig(tier)
  const paid = isPaidTier(tier)

  return (
    <div className="flex items-center gap-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
        <div className="text-xs uppercase tracking-wide text-slate-500">Current plan</div>
        <div className={`mt-1 text-xl font-bold ${paid ? 'text-amber-200' : 'text-sky-200'}`}>
          {paid && <Sparkles size={16} className="mr-1 inline-block text-amber-300" />}
          {config.label}
        </div>
        <div className="mt-0.5 text-xs text-slate-500">{config.price}</div>
      </div>

      {!paid && (
        <button
          onClick={onActivate}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-400/20"
        >
          <Crown size={16} />
          Upgrade
        </button>
      )}
    </div>
  )
}
