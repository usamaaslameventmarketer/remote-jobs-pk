'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  BANK_ACCOUNT_NAME,
  BANK_NAME,
  BANK_ACCOUNT_NUMBER,
  BANK_IBAN,
  WHATSAPP_NUMBER,
  PRODUCT_NAME,
} from '@/lib/payment-config'

const PRICE_PKR = 2_000

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
    a: "Full access to every listing on the board — currently 1,300+ and growing nightly. Free users see the 5 most recent roles; subscribers unlock everything.",
  },
  {
    q: 'How does the manual payment work?',
    a: `Transfer PKR ${PRICE_PKR.toLocaleString()} to our bank account, then send us a WhatsApp message with your payment screenshot and the email you used to sign up. We confirm and unlock your account — usually within a few hours.`,
  },
  {
    q: 'Which payment methods are supported?',
    a: 'Bank transfer (HBL / UBL / Meezan) right now. JazzCash and card support coming soon.',
  },
  {
    q: 'Can I cancel anytime?',
    a: "Yes. Each payment covers 30 days. Just don't renew and access ends at the billing period close.",
  },
  {
    q: 'Are these jobs legitimate?',
    a: 'Every listing is manually reviewed before going live. We check that the company exists, the role is open, the link works, and the position is genuinely remote-eligible for Pakistan-based candidates.',
  },
  {
    q: 'Do I need an account?',
    a: 'Yes — create a free account at sign-up, then subscribe to unlock the full board.',
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
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7A8D"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button type="button" onClick={copy} className="text-xs text-[#1A6B4A] hover:underline font-medium shrink-0">
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function WhatsAppButton({ userEmail }: { userEmail: string | null }) {
  const waMessage = encodeURIComponent(
    `Hi, I've sent PKR ${PRICE_PKR.toLocaleString()} for ${PRODUCT_NAME} Pro subscription. My account email is: ${userEmail ?? '____@____.___'}`
  )
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`
  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 bg-[#25D366] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-[#1ebe5d] transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.528 5.855L.057 23.215a.75.75 0 0 0 .916.978l5.546-1.455A11.934 11.934 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.716 9.716 0 0 1-4.953-1.354l-.355-.21-3.676.965.984-3.595-.23-.37A9.718 9.718 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
      </svg>
      Message us on WhatsApp
    </a>
  )
}

function PaymentInstructions({ userEmail }: { userEmail: string | null }) {
  return (
    <div className="mt-5 space-y-4">
      <div className="bg-[#F8FAFC] rounded-xl border border-[#D1D9E0] p-5">
        <p className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-4">
          Step 1 — Bank transfer
        </p>
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#6B7A8D] shrink-0 w-28">Amount</span>
            <span className="font-bold text-[#111827]">PKR {PRICE_PKR.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#6B7A8D] shrink-0 w-28">Bank</span>
            <span className="font-medium text-[#111827]">{BANK_NAME}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#6B7A8D] shrink-0 w-28">Account name</span>
            <span className="font-medium text-[#111827]">{BANK_ACCOUNT_NAME}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#6B7A8D] shrink-0 w-28">Account no.</span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono font-medium text-[#111827] break-all">{BANK_ACCOUNT_NUMBER}</span>
              <CopyButton text={BANK_ACCOUNT_NUMBER} />
            </div>
          </div>
          {BANK_IBAN && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#6B7A8D] shrink-0 w-28">IBAN</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono font-medium text-[#111827] break-all text-xs">{BANK_IBAN}</span>
                <CopyButton text={BANK_IBAN} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#F8FAFC] rounded-xl border border-[#D1D9E0] p-5">
        <p className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-3">
          Step 2 — Send screenshot on WhatsApp
        </p>
        <p className="text-sm text-[#374151] mb-4">
          After transferring, message us with your payment screenshot
          {userEmail
            ? <> — your email <span className="font-medium text-[#111827]">{userEmail}</span> is pre-filled in the message.</>
            : <> and the email address you used to sign up.</>}
        </p>
        <WhatsAppButton userEmail={userEmail} />
      </div>

      <p className="text-xs text-[#9BAFC4] text-center">
        We confirm and unlock your account within a few hours of receiving your screenshot.
      </p>
    </div>
  )
}

export default function PricingPage() {
  const [showInstructions, setShowInstructions] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null)
      setSessionChecked(true)
    })
  }, [])

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
      <div className="bg-white rounded-2xl border-2 border-[#1A6B4A] p-8 mb-8">
        <div className="mb-6">
          <p className="text-sm font-semibold text-[#1A6B4A] uppercase tracking-wide mb-2">Pro Access</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-[#111827]">{PRICE_PKR.toLocaleString()}</span>
            <span className="text-xl font-semibold text-[#6B7A8D]">PKR</span>
            <span className="text-[#6B7A8D] text-sm">/month</span>
          </div>
          <p className="text-xs text-[#9BAFC4] mt-1">~$7 USD · 30 days per payment · cancel anytime</p>
        </div>

        <ul className="space-y-3 mb-8">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-[#374151]">
              <span className="mt-0.5 shrink-0"><CheckIcon /></span>
              {f}
            </li>
          ))}
        </ul>

        {!showInstructions ? (
          <>
            {sessionChecked && !userEmail ? (
              <div className="space-y-3">
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-[#1A6B4A] text-white text-sm font-semibold hover:bg-[#155a3d] transition-colors"
                >
                  Sign in to subscribe →
                </Link>
                <p className="text-center text-xs text-[#9BAFC4]">
                  No account?{' '}
                  <Link href="/signup" className="underline hover:text-[#6B7A8D]">Create one free</Link>
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowInstructions(true)}
                className="w-full py-3 px-4 rounded-xl bg-[#1A6B4A] text-white text-sm font-semibold hover:bg-[#155a3d] transition-colors"
              >
                Subscribe — PKR {PRICE_PKR.toLocaleString()}/month →
              </button>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#111827]">Payment instructions</p>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="text-xs text-[#9BAFC4] hover:text-[#6B7A8D] transition-colors"
              >
                ← Back
              </button>
            </div>
            <PaymentInstructions userEmail={userEmail} />
          </>
        )}
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
