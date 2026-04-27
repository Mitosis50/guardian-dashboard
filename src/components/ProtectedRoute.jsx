import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export default function ProtectedRoute({ children }) {
  const { user, loading, isConfigured } = useAuth()

  if (!isConfigured) return children

  if (loading) {
    return <div className="min-h-screen bg-guardian-950 p-8 text-slate-200">Checking session…</div>
  }

  if (!user) return <Navigate to="/login" replace />

  return children
}
