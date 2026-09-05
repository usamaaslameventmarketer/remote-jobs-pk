'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
const ORIGINAL_PRICE_PKR = 4_000

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="text-xs text-[#1A6B4A] hover:underline font-medium shrink-0"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

export default function OnboardingSubscribePage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [whatsappClicked, setWhatsappClicked] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }
      setUserEmail(session.user.email ?? null)
      setLoading(false)
    })
  }, [router])

  const waMessage = encodeURIComponent(
    `Hi, I've sent PKR ${PRICE_PKR.toLocaleString()} for ${PRODUCT_NAME} Pro subscription. My account email is: ${userEmail ?? '____@____.___'}`
  )
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`

  function handleWhatsApp() {
    window.open(waUrl, '_blank', 'noopener,noreferrer')
    setWhatsappClicked(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl border border-[#D1D9E0] p-8 text-center">
            <p className="text-sm text-[#6B7A8D]">Loading…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#1A6B4A]">
            <span className="w-5 h-5 rounded-full bg-[#E8F5EF] text-[#1A6B4A] flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            Profile
          </div>
          <div className="h-px w-8 bg-[#1A6B4A]" />
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#1A6B4A]">
            <span className="w-5 h-5 rounded-full bg-[#1A6B4A] text-white flex items-center justify-center text-[10px] font-bold">2</span>
            Subscribe
          </div>
        </div>

        {whatsappClicked ? (
          /* Confirmation state */
          <div className="bg-white rounded-2xl border border-[#D1D9E0] p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[#E8F5EF] flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1A6B4A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-[#111827] mb-2">Request received!</h2>
            <p className="text-sm text-[#6B7A8D] leading-relaxed mb-6">
              Once we confirm your payment, we'll activate your account — usually within a few hours. We'll message you back on WhatsApp.
            </p>
            <div className="bg-[#F8FAFC] rounded-xl border border-[#D1D9E0] px-4 py-3 text-sm text-[#374151] mb-6">
              Activating for <span className="font-medium text-[#111827]">{userEmail}</span>
            </div>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="text-sm text-[#1A6B4A] hover:underline font-medium"
            >
              Re-open WhatsApp →
            </button>
          </div>
        ) : (
          /* Payment details state */
          <div className="bg-white rounded-2xl border-2 border-[#1A6B4A] p-8">
            {/* Price block */}
            <div className="mb-7 pb-6 border-b border-[#F3F5F7]">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-semibold text-[#1A6B4A] uppercase tracking-wide">Pro Access</p>
                <span className="inline-block bg-[#DC2626] text-white text-xs font-bold px-2 py-0.5 rounded-full tracking-wide">
                  50% OFF
                </span>
              </div>
              <p className="text-sm text-[#9BAFC4] line-through mb-1">
                PKR {ORIGINAL_PRICE_PKR.toLocaleString()}/month
              </p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold text-[#111827]">{PRICE_PKR.toLocaleString()}</span>
                <span className="text-xl font-semibold text-[#6B7A8D]">PKR</span>
                <span className="text-[#6B7A8D] text-sm">/month</span>
              </div>
              <p className="text-xs text-[#9BAFC4]">~$7 USD · 30 days · cancel anytime</p>
              <p className="text-xs font-medium text-[#DC2626] mt-1.5">Offer ends September 30</p>
            </div>

            {/* Step 1 — Bank transfer */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-3">
                Step 1 — Bank transfer
              </p>
              <div className="bg-[#F8FAFC] rounded-xl border border-[#D1D9E0] p-4 space-y-2.5 text-sm">
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

            {/* Step 2 — WhatsApp */}
            <div>
              <p className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-3">
                Step 2 — Confirm on WhatsApp
              </p>
              <p className="text-sm text-[#374151] mb-4">
                After transferring, tap the button below to send us your payment screenshot.
                {userEmail && (
                  <> Your email <span className="font-medium text-[#111827]">{userEmail}</span> is pre-filled.</>
                )}
              </p>
              <button
                type="button"
                onClick={handleWhatsApp}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-[#1ebe5d] transition-colors"
              >
                <WhatsAppIcon />
                Send payment screenshot on WhatsApp
              </button>
            </div>

            <p className="text-xs text-[#9BAFC4] text-center mt-5">
              We confirm and activate your account within a few hours of receiving your screenshot.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.528 5.855L.057 23.215a.75.75 0 0 0 .916.978l5.546-1.455A11.934 11.934 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.716 9.716 0 0 1-4.953-1.354l-.355-.21-3.676.965.984-3.595-.23-.37A9.718 9.718 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
    </svg>
  )
}
