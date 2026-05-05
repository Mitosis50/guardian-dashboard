import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { hasSupabaseConfig, supabase } from '../lib/supabase'

const AuthContext = createContext(null)

function isTokenExpired(session) {
  if (!session?.expires_at) return true
  const expiresAt = session.expires_at * 1000
  return Date.now() >= expiresAt
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(hasSupabaseConfig)
  const [profile, setProfile] = useState(null)
  const [sessionValid, setSessionValid] = useState(false)
  const [sessionError, setSessionError] = useState(null)

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setLoading(false)
      setSessionValid(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      const s = data.session ?? null
      setSession(s)
      setSessionValid(s ? !isTokenExpired(s) : false)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setSessionValid(nextSession ? !isTokenExpired(nextSession) : false)
      setSessionError(null)
      setLoading(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // Periodic session validation
  useEffect(() => {
    if (!hasSupabaseConfig || !session) return

    function validate() {
      const expired = isTokenExpired(session)
      setSessionValid(!expired)
      if (expired) {
        setSessionError('Your session has expired. Please sign in again.')
      }
    }

    validate()
    const timer = setInterval(validate, 60_000)
    return () => clearInterval(timer)
  }, [session])

  useEffect(() => {
    async function loadProfile() {
      if (!hasSupabaseConfig || !session?.user?.id) {
        setProfile(null)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,tier,created_at')
        .eq('id', session.user.id)
        .maybeSingle()

      if (error) {
        console.warn('Profile load failed; falling back to session metadata.', error.message)
      }

      setProfile(data ?? {
        id: session.user.id,
        email: session.user.email,
        tier: 'free',
      })
    }

    loadProfile()
  }, [session])

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    isConfigured: hasSupabaseConfig,
    sessionValid,
    sessionError,
    signOut: () => supabase?.auth.signOut(),
  }), [session, profile, loading, sessionValid, sessionError])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
