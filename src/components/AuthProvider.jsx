import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { hasSupabaseConfig, supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(hasSupabaseConfig)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (!hasSupabaseConfig) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

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
    signOut: () => supabase?.auth.signOut(),
  }), [session, profile, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
