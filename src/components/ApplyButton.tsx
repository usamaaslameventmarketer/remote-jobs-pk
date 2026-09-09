'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Props {
  originalUrl: string
  className: string
  children?: React.ReactNode
}

export function ApplyButton({ originalUrl, className, children = 'Apply Now →' }: Props) {
  const [isPro, setIsPro] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setIsPro(false); return }
      const today = new Date().toISOString().split('T')[0]
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_pro, subscription_status, subscription_expiry')
        .eq('id', session.user.id)
        .single()
      const activeSub =
        profile?.subscription_status === 'paid' &&
        !!profile?.subscription_expiry &&
        profile.subscription_expiry >= today
      setIsPro(profile?.is_pro === true || activeSub)
    })
  }, [])

  // While checking auth, render a disabled-looking button to avoid layout shift
  if (isPro === null) {
    return (
      <span className={`${className} opacity-60 cursor-wait select-none`}>
        {children}
      </span>
    )
  }

  if (isPro) {
    return (
      <a href={originalUrl} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    )
  }

  return (
    <Link href="/login" className={className}>
      Sign up to Apply →
    </Link>
  )
}
