import { useEffect, useState } from 'react'
import { AuthContext } from './context'
import { supabase } from '../lib/supabase'
import { clearDataCache } from '../lib/dataCache'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(Boolean(supabase))
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    if (!supabase) return undefined

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') clearDataCache()
      setSession(nextSession)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setProfile(null)
      setProfileError('')

      if (!session?.user.id || !supabase) {
        setProfileLoading(false)
        return
      }

      setProfileLoading(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, is_active')
          .eq('id', session.user.id)
          .maybeSingle()

        if (!active) return

        if (error) {
          setProfileError(`Unable to load your profile: ${error.message}`)
        } else if (!data) {
          setProfileError('Your account profile was not found. Contact an administrator.')
        } else {
          setProfile(data)
        }
      } catch (error) {
        if (active) {
          const reason = error instanceof Error ? error.message : String(error)
          setProfileError(`Unable to load your profile: ${reason}`)
        }
      } finally {
        if (active) setProfileLoading(false)
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [session?.user.id])

  return (
    <AuthContext.Provider
      value={{
        isConfigured: Boolean(supabase),
        loading,
        profile,
        profileError,
        profileLoading,
        session,
        supabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
