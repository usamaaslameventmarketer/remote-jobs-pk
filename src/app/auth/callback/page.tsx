'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const next = params.get('next') ?? '/onboarding/profile'

    if (!code) {
      // No code — may be a hash-based flow or a stale link; go home
      router.replace('/')
      return
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setError('This confirmation link is invalid or has already been used.')
      } else {
        router.replace(next)
      }
    })
  }, [router])

  if (error) {
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
        <div className="bg-white rounded-xl border border-[#D1D9E0] p-8 text-center">
          <p className="text-sm text-[#6B7A8D]">Confirming your email…</p>
        </div>
      </div>
    </div>
  )
}
