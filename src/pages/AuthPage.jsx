import { useState } from 'react'
import AppLink from '../components/AppLink'
import Brand from '../components/Brand'
import Icon from '../components/Icon'

export default function AuthPage({ type, onSubmit, isConfigured }) {
  const isLogin = type === 'login'
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('error')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setMessageType('error')

    const formData = new FormData(event.currentTarget)

    if (!isLogin && formData.get('password') !== formData.get('confirmPassword')) {
      setMessage('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await onSubmit(event)

      if (result) {
        setMessageType('success')
        setMessage(result)
      }
    } catch (error) {
      setMessageType('error')
      setMessage(error instanceof Error ? error.message : 'Authentication failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center bg-[radial-gradient(ellipse_at_15%_15%,rgb(23_59_101/8%),transparent_32%),#f6f8fb] px-5 py-8.75 max-sm:px-3.75 max-sm:pb-5 max-sm:pt-13.75">
      <AppLink
        aria-label="Back to welcome page"
        className="absolute left-8.75 top-7.5 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm text-muted no-underline hover:bg-white/70 hover:text-accent max-sm:left-4.5 max-sm:top-4.75"
        to="welcome"
      >
        <Icon className="h-3.75 w-3.75 rotate-180" name="chevron" /> Back
      </AppLink>
      <section className="w-full max-w-110 rounded-4.25 border border-line bg-white px-9.5 py-8.5 shadow-[0_18px_60px_rgb(15_23_42/8%)] max-sm:px-5.5 max-sm:py-6.75">
        <div className="mb-7.75"><Brand /></div>
        <p className="eyebrow">{isLogin ? 'WELCOME BACK' : 'JOIN THE COMMUNITY'}</p>
        <h1 className="mb-2 mt-2 text-balance text-2xl font-bold tracking-[-0.035em] text-ink">
          {isLogin ? 'Log in to your account' : 'Create your account'}
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          {isLogin
            ? 'Continue to your Innovation Office workspace.'
            : 'Set up your profile to get started.'}
        </p>
        <p className="mt-3 rounded-lg border border-[#e5d8b8] bg-[#fffaf0] px-3 py-2.5 text-xs leading-relaxed text-[#72551c]">
          Public prototype demo. Do not use real passwords or enter sensitive information.
        </p>
        <form className="mt-5.75 grid gap-3.5" onSubmit={handleSubmit}>
          {!isLogin && (
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Full name
              <input
                autoComplete="name"
                className="form-input"
                name="name"
                placeholder="Your full name"
                required
              />
            </label>
          )}
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Email address
            <input
              autoComplete="email"
              className="form-input"
              name="email"
              placeholder="name@example.com"
              required
              type="email"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Password
            <input
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              className="form-input"
              minLength={8}
              name="password"
              placeholder="At least 8 characters"
              required
              type="password"
            />
          </label>
          {!isLogin && (
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Confirm password
              <input
                autoComplete="new-password"
                className="form-input"
                name="confirmPassword"
                placeholder="Re-enter your password"
                required
                type="password"
              />
            </label>
          )}
          <button
            className="mt-1 flex min-h-11 w-full items-center justify-center rounded-lg bg-accent px-4.25 text-sm font-bold text-white transition hover:bg-[#102d4f] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!isConfigured || isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Please wait...' : isLogin ? 'Log in' : 'Create account'}
          </button>
          {!isConfigured && (
            <p className="text-center text-xs leading-relaxed text-[#a23e3e]" role="alert">
              Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to
              .env.local.
            </p>
          )}
          {message && (
            <p
              aria-live="polite"
              className={`rounded-lg border px-3.5 py-3 text-center text-xs leading-relaxed ${messageType === 'success' ? 'border-[#cce8d5] bg-[#f1fbf4] text-[#287a4b]' : 'border-[#f1caca] bg-[#fff4f4] text-[#9b3434]'}`}
              role={messageType === 'error' ? 'alert' : 'status'}
            >
              {message}
            </p>
          )}
        </form>
        <p className="mt-5.25 text-center text-sm text-muted">
          {isLogin ? 'New to the Innovation Office?' : 'Already have an account?'}{' '}
          <AppLink className="font-bold text-purple no-underline" to={isLogin ? 'signup' : 'login'}>
            {isLogin ? 'Sign up' : 'Log in'}
          </AppLink>
        </p>
      </section>
    </main>
  )
}
