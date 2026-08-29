'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const inputClass =
  'w-full px-4 py-2.5 rounded-lg border border-[#D1D9E0] bg-white text-[#111827] placeholder:text-[#9BAFC4] text-sm focus:outline-none focus:border-[#1A6B4A] focus:ring-1 focus:ring-[#1A6B4A] transition-colors'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Handle PKCE code exchange (code in query string)
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) setReady(true)
        else setError('This reset link is invalid or has expired.')
      })
      return
    }

    // Handle hash-based recovery (access_token in hash — legacy flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })

    // Give the hash-based flow a moment to fire; if nothing, show error
    const timeout = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setReady(true)
        else setError('This reset link is invalid or has expired. Please request a new one.')
      })
    }, 1500)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    // Sign out after reset so user logs in fresh
    await supabase.auth.signOut()
    router.push('/login?reset=success')
  }

  if (!ready && !error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-xl border border-[#D1D9E0] p-8 text-center">
            <p className="text-sm text-[#6B7A8D]">Verifying reset link…</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !ready) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-xl border border-[#D1D9E0] p-8 text-center">
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <a href="/login" className="text-sm text-[#1A6B4A] hover:underline font-medium">
              Back to sign in
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl border border-[#D1D9E0] p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-[#111827] mb-1">Set new password</h1>
            <p className="text-sm text-[#6B7A8D] leading-relaxed">
              Choose a strong password for your account.
            </p>
          </div>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label htmlFor="new-pw" className="block text-sm font-medium text-[#111827] mb-1.5">
                New password
              </label>
              <input
                id="new-pw"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="confirm-pw" className="block text-sm font-medium text-[#111827] mb-1.5">
                Confirm password
              </label>
              <input
                id="confirm-pw"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#1A6B4A] text-white text-sm font-medium hover:bg-[#155a3d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
