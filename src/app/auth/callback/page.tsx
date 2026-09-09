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

    if (code) {
      // PKCE flow (?code=...)
      supabase.auth.exchangeCodeForSession(code).then(async ({ error }) => {
        if (error) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            router.replace('/onboarding/profile')
          } else {
            setError('This confirmation link is invalid or has already been used.')
          }
        } else {
          router.replace(next)
        }
      })
    } else if (window.location.hash.includes('access_token')) {
      // OTP/email-confirm flow — session is in the hash fragment.
      // Supabase JS picks it up automatically; wait for SIGNED_IN.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe()
          router.replace('/onboarding/profile')
        }
      })
      // Clean up if nothing fires within 5s
      const timeout = setTimeout(() => {
        subscription.unsubscribe()
        setError('This confirmation link is invalid or has already been used.')
      }, 5000)
      return () => { subscription.unsubscribe(); clearTimeout(timeout) }
    } else {
      router.replace('/')
    }
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
