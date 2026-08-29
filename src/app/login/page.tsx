'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Tab = 'signin' | 'signup' | 'forgot'

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A6B4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

const inputClass =
  'w-full px-4 py-2.5 rounded-lg border border-[#D1D9E0] bg-white text-[#111827] placeholder:text-[#9BAFC4] text-sm focus:outline-none focus:border-[#1A6B4A] focus:ring-1 focus:ring-[#1A6B4A] transition-colors'

const btnPrimary =
  'w-full py-2.5 px-4 rounded-lg bg-[#1A6B4A] text-white text-sm font-medium hover:bg-[#155a3d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed'

const btnGhost =
  'w-full text-center text-sm text-[#6B7A8D] hover:text-[#1A6B4A] transition-colors py-1'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function switchTab(t: Tab) {
    setTab(t)
    setError('')
    setMessage('')
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(
        error.message.includes('Invalid login')
          ? 'Incorrect email or password.'
          : error.message
      )
      return
    }
    router.push('/')
    router.refresh()
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      setError(
        error.message.includes('already registered')
          ? 'An account with this email already exists. Try signing in.'
          : error.message
      )
      return
    }
    setMessage('Account created! Check your email to confirm your address, then sign in.')
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setMessage('Check your email for a password reset link.')
  }

  // Success screen
  if (message) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-xl border border-[#D1D9E0] p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[#E8F5EF] flex items-center justify-center mx-auto mb-4">
              <CheckIcon />
            </div>
            <p className="text-[#111827] font-medium mb-2 leading-relaxed">{message}</p>
            <button
              type="button"
              onClick={() => { setMessage(''); switchTab('signin') }}
              className="mt-4 text-sm text-[#1A6B4A] hover:underline font-medium"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl border border-[#D1D9E0] p-8">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl font-bold text-[#111827] mb-1">
              {tab === 'signin' ? 'Sign in' : tab === 'signup' ? 'Create account' : 'Reset password'}
            </h1>
            <p className="text-sm text-[#6B7A8D] leading-relaxed">
              {tab === 'signin'
                ? 'Save listings and get alerts for new roles.'
                : tab === 'signup'
                ? 'Join to save listings and track opportunities.'
                : "Enter your email and we'll send a reset link."}
            </p>
          </div>

          {/* Tab switcher */}
          {tab !== 'forgot' && (
            <div className="flex gap-1 p-1 bg-[#F3F5F7] rounded-lg mb-6">
              {(['signin', 'signup'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchTab(t)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    tab === t
                      ? 'bg-white text-[#111827] shadow-sm'
                      : 'text-[#6B7A8D] hover:text-[#111827]'
                  }`}
                >
                  {t === 'signin' ? 'Sign in' : 'Sign up'}
                </button>
              ))}
            </div>
          )}

          {/* Sign In */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label htmlFor="si-email" className="block text-sm font-medium text-[#111827] mb-1.5">Email</label>
                <input id="si-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
              </div>
              <div>
                <label htmlFor="si-password" className="block text-sm font-medium text-[#111827] mb-1.5">Password</label>
                <input id="si-password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={inputClass} />
              </div>
              {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
              <button type="submit" disabled={loading} className={btnPrimary}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
              <button type="button" onClick={() => switchTab('forgot')} className={btnGhost}>
                Forgot password?
              </button>
            </form>
          )}

          {/* Sign Up */}
          {tab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label htmlFor="su-email" className="block text-sm font-medium text-[#111827] mb-1.5">Email</label>
                <input id="su-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
              </div>
              <div>
                <label htmlFor="su-password" className="block text-sm font-medium text-[#111827] mb-1.5">Password</label>
                <input id="su-password" type="password" required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" className={inputClass} />
              </div>
              <div>
                <label htmlFor="su-confirm" className="block text-sm font-medium text-[#111827] mb-1.5">Confirm password</label>
                <input id="su-confirm" type="password" required autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" className={inputClass} />
              </div>
              {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
              <button type="submit" disabled={loading} className={btnPrimary}>
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}

          {/* Forgot Password */}
          {tab === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label htmlFor="fp-email" className="block text-sm font-medium text-[#111827] mb-1.5">Email</label>
                <input id="fp-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
              </div>
              {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
              <button type="submit" disabled={loading} className={btnPrimary}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <button type="button" onClick={() => switchTab('signin')} className={btnGhost}>
                ← Back to sign in
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
