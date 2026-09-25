import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

const AuthContext = createContext({
  user: null,
  session: null,
  business: null,
  loading: true,
  isConfigured: false,
  authError: null,
  signInWithGoogle: async () => {},
  signInWithIdToken: async () => {},
  signInWithDemo: async () => {},
  signOut: async () => {},
  refreshBusiness: async () => {},
  clearAuthError: () => {},
})

const DEMO_USER = {
  id: 'd0000000-0000-0000-0000-000000000001',
  email: 'owner@energize-u.com',
  user_metadata: { name: 'Demo MSME Owner' },
}

const DEMO_BUSINESS = {
  business_id: 'b0000000-0000-0000-0000-000000000001',
  owner_id: DEMO_USER.id,
  name: 'Apex Packaging & Offset Printers',
  sector: 'printing',
  location_state: 'Maharashtra',
  location_city: 'Pune (MIDC Bhosari)',
  employee_count: 24,
  shift_pattern: 'double_shift',
  has_solar: false,
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  const fetchBusiness = useCallback(async (userId) => {
    if (!userId || !isSupabaseConfigured) {
      setBusiness(null)
      return null
    }

    if (userId === DEMO_USER.id) {
      setBusiness(DEMO_BUSINESS)
      return DEMO_BUSINESS
    }

    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle()

      if (!error && data) {
        setBusiness(data)
        return data
      }

      // Auto-provision default business for Google user so they never get stuck
      const { data: userData } = await supabase.auth.getUser()
      const u = userData?.user
      const displayName = u?.user_metadata?.full_name || u?.email?.split('@')[0] || 'Facility'

      const defaultBiz = {
        owner_id: userId,
        name: `${displayName}'s Industrial Plant`,
        sector: 'printing',
        location_state: 'Maharashtra',
        location_city: 'Pune',
        employee_count: 20,
        shift_pattern: 'single_shift',
        has_solar: false,
      }

      try {
        const { data: createdBiz } = await supabase
          .from('businesses')
          .insert([defaultBiz])
          .select()
          .maybeSingle()

        if (createdBiz) {
          setBusiness(createdBiz)
          return createdBiz
        }
      } catch (insertErr) {
        console.warn('DB insert notice for new Google business:', insertErr)
      }

      const fallbackBiz = { business_id: userId, ...defaultBiz }
      setBusiness(fallbackBiz)
      return fallbackBiz
    } catch (err) {
      console.warn('Exception in fetchBusiness, using fallback profile:', err)
      const fallbackBiz = {
        business_id: userId,
        owner_id: userId,
        name: 'Industrial Plant',
        sector: 'printing',
        location_state: 'Maharashtra',
        shift_pattern: 'single_shift',
        has_solar: false,
      }
      setBusiness(fallbackBiz)
      return fallbackBiz
    }
  }, [])

  const refreshBusiness = useCallback(async () => {
    if (user?.id) {
      return await fetchBusiness(user.id)
    }
    return null
  }, [user, fetchBusiness])

  useEffect(() => {
    let mounted = true

    // 1. Check local demo session first
    const savedDemo = localStorage.getItem('energize_u_demo_session')
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo)
        if (parsed?.user) {
          setUser(parsed.user)
          setBusiness(parsed.business || DEMO_BUSINESS)
          setLoading(false)
          return
        }
      } catch (e) {
        localStorage.removeItem('energize_u_demo_session')
      }
    }

    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    // 2. Parse errors from URL hash or query params
    const urlParams = new URLSearchParams(window.location.search)
    const rawHash = window.location.hash.startsWith('#')
      ? window.location.hash.substring(1)
      : window.location.hash
    const hashParams = new URLSearchParams(rawHash)

    const rawError = hashParams.get('error_description') || urlParams.get('error_description') ||
                     hashParams.get('error') || urlParams.get('error')

    if (rawError) {
      const decodedError = decodeURIComponent(rawError.replace(/\+/g, ' '))
      console.warn('[Energize U Auth] OAuth redirect returned error:', decodedError)
      setAuthError(decodedError)
      // Clean URL so it doesn't persist on refresh
      window.history.replaceState({}, document.title, window.location.pathname)
      setLoading(false)
      return
    }

    // 3. Process session & OAuth callback
    const initSession = async () => {
      try {
        const code = urlParams.get('code')
        if (code) {
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code)
            if (!error && data?.session && mounted) {
              setSession(data.session)
              setUser(data.session.user)
              await fetchBusiness(data.session.user.id)
              window.history.replaceState({}, document.title, window.location.pathname)
              setLoading(false)
              return
            }
          } catch (codeErr) {
            console.warn('[Energize U Auth] PKCE exchange catch:', codeErr)
          }
        }

        const { data: { session: existingSession } } = await supabase.auth.getSession()
        if (!mounted) return

        if (existingSession?.user) {
          setSession(existingSession)
          setUser(existingSession.user)
          await fetchBusiness(existingSession.user.id)
          // Clean hash if access_token was present
          if (window.location.hash.includes('access_token')) {
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        }

        setLoading(false)
      } catch (err) {
        console.warn('[Energize U Auth] Session initialization warning:', err)
        if (mounted) setLoading(false)
      }
    }

    initSession()

    // 4. Subscribe to auth state transitions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (currentSession?.user) {
          setSession(currentSession)
          setUser(currentSession.user)
          await fetchBusiness(currentSession.user.id)
          if (window.location.hash.includes('access_token')) {
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        }
      } else if (event === 'SIGNED_OUT') {
        if (!localStorage.getItem('energize_u_demo_session')) {
          setUser(null)
          setSession(null)
          setBusiness(null)
        }
      }

      setLoading(false)
    })

    // Safety timeout: Ensure loading spinner never hangs indefinitely
    const timer = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 2500)

    return () => {
      mounted = false
      clearTimeout(timer)
      subscription?.unsubscribe()
    }
  }, [fetchBusiness])

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet. Please check .env.local.')
    }
    setAuthError(null)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) throw error
    return data
  }

  const signInWithIdToken = async (idToken) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet. Please check .env.local.')
    }
    setAuthError(null)
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    })
    if (error) throw error
    if (data?.session?.user) {
      setUser(data.session.user)
      setSession(data.session)
      await fetchBusiness(data.session.user.id)
    }
    return data
  }

  const signInWithDemo = async () => {
    setAuthError(null)
    localStorage.setItem(
      'energize_u_demo_session',
      JSON.stringify({ user: DEMO_USER, business: DEMO_BUSINESS })
    )
    setUser(DEMO_USER)
    setBusiness(DEMO_BUSINESS)
    setLoading(false)
    return { success: true, user: DEMO_USER, business: DEMO_BUSINESS }
  }

  const signOut = async () => {
    localStorage.removeItem('energize_u_demo_session')
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut()
      } catch (err) {
        console.warn('Sign out notice:', err)
      }
    }
    setUser(null)
    setSession(null)
    setBusiness(null)
    setAuthError(null)
  }

  const clearAuthError = () => setAuthError(null)

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        business,
        loading,
        isConfigured: isSupabaseConfigured,
        authError,
        signInWithGoogle,
        signInWithIdToken,
        signInWithDemo,
        signOut,
        refreshBusiness,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
