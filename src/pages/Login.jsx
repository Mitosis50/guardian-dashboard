import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '../components/AuthProvider'
import { supabase } from '../lib/supabase'

export default function Login() {
  const { user, isConfigured } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!isConfigured) {
      setMessage('Demo mode: Supabase env vars are not set, so opening the dashboard with mock data.')
      setTimeout(() => navigate('/dashboard'), 450)
      return
    }

    setSending(true)
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })
    setSending(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    setMessage('Magic link sent. Check your email, then click the link to open your dashboard.')
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.05] p-8 shadow-2xl shadow-black/30">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl bg-sky-400/10 p-3 text-sky-300"><ShieldCheck /></div>
          <div>
            <h1 className="text-2xl font-bold text-white">Agent Guardian 🛡️</h1>
            <p className="text-sm text-slate-400">Sign in with a secure magic link.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-300" htmlFor="email">Email address</label>
          <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none ring-sky-400/50 placeholder:text-slate-600 focus:ring-2" />
          <button disabled={sending} className="w-full rounded-xl bg-sky-400 px-4 py-3 font-semibold text-slate-950 hover:bg-sky-300 disabled:cursor-wait disabled:opacity-70">
            {sending ? 'Sending…' : 'Send magic link'}
          </button>
        </form>

        {!isConfigured && <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">Demo mode: add Supabase env vars to enable real auth.</p>}
        {message && <p className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">{message}</p>}
        {error && <p className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</p>}
      </section>
    </main>
  )
}
