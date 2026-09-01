'use client'

import { useState } from 'react'

export function AlertSubscribe() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setStatus(res.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="flex items-center gap-2 text-sm text-[#1A6B4A] font-medium">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Check your inbox to confirm
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap sm:flex-nowrap">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[#D1D9E0] text-sm text-[#111827] placeholder:text-[#9BAFC4] focus:outline-none focus:border-[#1A6B4A] focus:ring-1 focus:ring-[#1A6B4A] transition-colors bg-white"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="shrink-0 px-4 py-2 rounded-lg bg-[#1A6B4A] text-white text-sm font-semibold hover:bg-[#155a3d] transition-colors disabled:opacity-60"
      >
        {status === 'loading' ? 'Sending…' : 'Get daily alerts'}
      </button>
      {status === 'error' && (
        <p className="w-full text-xs text-red-600 mt-1">Something went wrong — please try again.</p>
      )}
    </form>
  )
}
