import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export default function ProtectedRoute({ children }) {
  const { user, loading, isConfigured, sessionValid, sessionError } = useAuth()

  if (!isConfigured) return children

  if (loading) {
    return <div className="min-h-screen p-8 text-slate-200">Checking session…</div>
  }

  if (!user) return <Navigate to="/login" replace />

  if (sessionError) {
    return (
      <div className="min-h-screen p-8 text-slate-200">
        <div className="mx-auto max-w-md rounded-2xl border border-rose-400/30 bg-rose-400/10 p-6 text-rose-100">
          <h2 className="mb-2 text-lg font-semibold">Session error</h2>
          <p className="text-sm">{sessionError}</p>
          <a href="/login" className="mt-4 inline-block rounded-lg bg-rose-400/20 px-4 py-2 text-sm font-medium hover:bg-rose-400/30">Sign in again</a>
        </div>
      </div>
    )
  }

  if (!sessionValid) {
    return (
      <div className="min-h-screen p-8 text-slate-200">
        <div className="mx-auto max-w-md rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6 text-amber-100">
          <h2 className="mb-2 text-lg font-semibold">Session expired</h2>
          <p className="text-sm">Your session is no longer valid. Please sign in again to continue.</p>
          <a href="/login" className="mt-4 inline-block rounded-lg bg-amber-400/20 px-4 py-2 text-sm font-medium hover:bg-amber-400/30">Sign in again</a>
        </div>
      </div>
    )
  }

  return children
}
