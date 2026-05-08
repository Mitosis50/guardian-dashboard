import { Link, NavLink } from 'react-router-dom'
import { LogOut, BookOpen } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { tierLabel } from '../lib/format'

export default function AppHeader({ onOpenOnboarding }) {
  const { user, profile, signOut, isConfigured } = useAuth()
  const email = user?.email ?? profile?.email ?? 'demo@agentbotguardian.com'
  const tier = profile?.tier ?? 'free'

  return (
    <header className="border-b border-white/10 bg-white/[0.03] backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/dashboard" className="text-xl font-bold tracking-tight text-white">Agent Guardian 🛡️</Link>
          <div className="mt-1 text-sm text-slate-400">Immutable IPFS backups for agent memory files</div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'text-sky-300' : 'text-slate-300 hover:text-white'}>Dashboard</NavLink>
          <NavLink to="/history" className={({ isActive }) => isActive ? 'text-sky-300' : 'text-slate-300 hover:text-white'}>History</NavLink>
          <NavLink to="/restore" className={({ isActive }) => isActive ? 'text-sky-300' : 'text-slate-300 hover:text-white'}>Restore</NavLink>
          <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-sky-200">{tierLabel(tier)}</span>
          <span className="text-slate-300">{email}</span>
          {onOpenOnboarding && (
            <button onClick={onOpenOnboarding} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-slate-200 hover:bg-white/10">
              <BookOpen size={16} /> Onboarding
            </button>
          )}
          {isConfigured && (
            <button onClick={signOut} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-slate-200 hover:bg-white/10">
              <LogOut size={16} /> Logout
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
