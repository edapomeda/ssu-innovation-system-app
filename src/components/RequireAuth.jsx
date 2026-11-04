import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AccountLoadingSkeleton } from './LoadingSkeleton'

export default function RequireAuth() {
  const { loading, profile, profileError, profileLoading, session, supabase } = useAuth()
  const [logoutError, setLogoutError] = useState('')

  async function handleLogout() {
    setLogoutError('')

    try {
      const { error } = await supabase.auth.signOut()

      if (error) setLogoutError(error.message)
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Unable to log out. Please try again.')
    }
  }

  if (loading || (session && profileLoading)) {
    return <AccountLoadingSkeleton />
  }

  if (!session) {
    return <Navigate replace to="/login" />
  }

  if (profileError || !profile) {
    return (
      <main className="mx-auto grid min-h-screen max-w-xl content-center gap-4 px-6 text-center">
        <h1 className="text-xl font-bold text-ink">Unable to load your account</h1>
        <p className="text-sm text-muted" role="alert">
          {profileError || 'Your profile could not be loaded.'}
        </p>
        <p className="text-xs text-muted">
          Check that row-level security is enabled and your account can read its own profile.
        </p>
        <button
          className="mx-auto min-h-10 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-[#102d4f]"
          onClick={handleLogout}
          type="button"
        >
          Log out
        </button>
        {logoutError && <p className="text-sm text-[#a23e3e]" role="alert">{logoutError}</p>}
      </main>
    )
  }

  if (!profile.is_active) {
    return (
      <main className="mx-auto grid min-h-screen max-w-xl content-center gap-4 px-6 text-center">
        <h1 className="text-xl font-bold text-ink">Account inactive</h1>
        <p className="text-sm text-muted" role="alert">
          This account is inactive. Contact an administrator for access.
        </p>
        <button
          className="mx-auto min-h-10 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-[#102d4f]"
          onClick={handleLogout}
          type="button"
        >
          Log out
        </button>
        {logoutError && <p className="text-sm text-[#a23e3e]" role="alert">{logoutError}</p>}
      </main>
    )
  }

  return <Outlet />
}
