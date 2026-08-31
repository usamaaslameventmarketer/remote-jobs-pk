'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const FEATURES = [
  'Unlimited access to all 1,300+ curated listings',
  'New roles added nightly — never miss a fresh posting',
  'Filter by department, seniority, and region',
  'Every listing manually vetted — no scams, no dead links',
  'Pakistan-focused: companies that actively hire remote talent here',
  'Priority access to new features as we build them',
]

const FAQS = [
  {
    q: 'What do I get with a subscription?',
    a: 'Full access to every listing on the board — currently 1,300+ and growing nightly. Free users see the 5 most recent roles; subscribers unlock everything.',
  },
  {
    q: 'When does billing go live?',
    a: 'Payment integration is in progress. Join the waitlist below and you\'ll be the first to know when subscriptions open — and we\'ll honour an early-bird rate for waitlist members.',
  },
  {
    q: 'Which payment methods will be supported?',
    a: 'We\'re evaluating JazzCash, Easypaisa, and card payments. The goal is to support all major options used in Pakistan — no international card required.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. You can cancel at any time and you\'ll keep access until the end of your current billing period. No questions asked.',
  },
  {
    q: 'Are these jobs legitimate?',
    a: 'Every listing is manually reviewed before going live. We check that the company exists, the role is open, the link works, and the position is genuinely remote-eligible for Pakistan-based candidates.',
  },
  {
    q: 'Do I need to create an account?',
    a: 'Not to join the waitlist — just your email. You\'ll need an account when subscriptions open to manage your billing and access the full board.',
  },
]

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A6B4A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[#E5E7EB] last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-medium text-[#111827]">{q}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6B7A8D"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <p className="text-sm text-[#6B7A8D] pb-4 leading-relaxed">{a}</p>}
    </div>
  )
}

function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    const { error } = await supabase.from('waitlist').insert({ email: email.trim() })
    if (error) {
      if (error.code === '23505') {
        // unique violation — already on list
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMsg('Something went wrong. Please try again.')
      }
      return
    }
    setStatus('success')
  }

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 justify-center text-sm text-[#1A6B4A] font-medium py-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        You&apos;re on the list — we&apos;ll email you when subscriptions open.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-sm mx-auto">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="flex-1 px-3 py-2 rounded-lg border border-[#D1D9E0] text-sm text-[#111827] placeholder:text-[#9BAFC4] focus:outline-none focus:border-[#1A6B4A] focus:ring-1 focus:ring-[#1A6B4A] transition-colors"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-4 py-2 rounded-lg bg-[#1A6B4A] text-white text-sm font-medium hover:bg-[#155a3d] transition-colors disabled:opacity-60 whitespace-nowrap"
      >
        {status === 'loading' ? 'Joining…' : 'Notify me'}
      </button>
      {errorMsg && <p className="text-xs text-red-600 mt-1 absolute">{errorMsg}</p>}
    </form>
  )
}

export default function PricingPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight mb-3">
          Simple, honest pricing
        </h1>
        <p className="text-[#6B7A8D] text-sm sm:text-base">
          One plan. Full access. Built for Pakistan-based talent.
        </p>
      </div>

      {/* Pricing card */}
      <div className="bg-white rounded-2xl border-2 border-[#1A6B4A] p-8 mb-8 relative overflow-hidden">
        {/* Coming soon ribbon */}
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] text-xs font-semibold border border-[#FDE68A]">
            Coming soon
          </span>
        </div>

        <div className="mb-6">
          <p className="text-sm font-semibold text-[#1A6B4A] uppercase tracking-wide mb-2">Pro Access</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-[#111827]">2,000</span>
            <span className="text-xl font-semibold text-[#6B7A8D]">PKR</span>
            <span className="text-[#6B7A8D] text-sm">/month</span>
          </div>
          <p className="text-xs text-[#9BAFC4] mt-1">~$7 USD · billed monthly · cancel anytime</p>
        </div>

        <ul className="space-y-3 mb-8">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-[#374151]">
              <span className="mt-0.5 shrink-0"><CheckIcon /></span>
              {f}
            </li>
          ))}
        </ul>

        {/* Coming soon button */}
        <button
          type="button"
          disabled
          className="w-full py-3 px-4 rounded-xl bg-[#D1D9E0] text-[#6B7A8D] text-sm font-semibold cursor-not-allowed select-none"
        >
          Subscribe — coming soon
        </button>

        <p className="text-center text-xs text-[#9BAFC4] mt-3">
          Join the waitlist below to be notified when payments go live
        </p>
      </div>

      {/* Waitlist */}
      <div className="bg-[#F8FAFC] rounded-xl border border-[#D1D9E0] p-6 mb-10 text-center">
        <h2 className="text-sm font-semibold text-[#111827] mb-1">Get notified when subscriptions open</h2>
        <p className="text-xs text-[#6B7A8D] mb-4">
          Waitlist members get early access and a discounted first month.
        </p>
        <WaitlistForm />
      </div>

      {/* Free tier note */}
      <div className="flex items-start gap-2 text-sm text-[#6B7A8D] bg-white border border-[#D1D9E0] rounded-lg px-4 py-3 mb-10">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9BAFC4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>
          The free tier shows the 5 most recent listings.{' '}
          <Link href="/" className="text-[#1A6B4A] hover:underline font-medium">Browse free listings →</Link>
        </span>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-base font-bold text-[#111827] mb-4">Frequently asked questions</h2>
        <div className="bg-white rounded-xl border border-[#D1D9E0] px-5">
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>

    </div>
  )
}
