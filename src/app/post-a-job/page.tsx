'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const LISTING_PRICE_PKR = 15_000

const CATEGORIES = [
  'Software Development',
  'Sales',
  'Marketing',
  'HR',
  'Finance',
  'Legal',
]

const SENIORITY = [
  { value: 'entry', label: 'Entry-level' },
  { value: 'mid', label: 'Mid-level' },
  { value: 'senior', label: 'Senior' },
]

const REGIONS = ['Worldwide', 'Pakistan', 'APAC / EMEA']

type FormData = {
  company_name: string
  company_website: string
  company_logo_url: string
  title: string
  category: string
  seniority: string
  region_eligibility: string
  description: string
  application_url: string
  salary_range: string
  contact_email: string
}

const EMPTY: FormData = {
  company_name: '',
  company_website: '',
  company_logo_url: '',
  title: '',
  category: '',
  seniority: '',
  region_eligibility: '',
  description: '',
  application_url: '',
  salary_range: '',
  contact_email: '',
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[#D1D9E0] text-sm text-[#111827] placeholder:text-[#9BAFC4] focus:outline-none focus:border-[#1A6B4A] focus:ring-1 focus:ring-[#1A6B4A] transition-colors bg-white'

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#374151] mb-1.5">
        {label}
        {required && <span className="text-[#1A6B4A] ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-[#9BAFC4] mt-1">{hint}</p>}
    </div>
  )
}

function PaymentScreen({ email, submissionId }: { email: string; submissionId: string }) {
  const ref = submissionId.split('-')[0].toUpperCase()
  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-full bg-[#E8F5EF] flex items-center justify-center mx-auto mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A6B4A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#111827] mb-1">Listing received!</h1>
        <p className="text-sm text-[#9BAFC4]">
          Reference: <span className="font-mono font-medium text-[#374151]">{ref}</span>
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#D1D9E0] p-6 mb-5">
        <h2 className="text-sm font-semibold text-[#111827] mb-4">Payment instructions</h2>
        <div className="space-y-3 text-sm text-[#374151]">
          <p>
            We&apos;ll send an invoice and bank transfer details to{' '}
            <span className="font-medium text-[#111827]">{email}</span>{' '}
            within 24 hours.
          </p>
          <div className="bg-[#F8FAFC] rounded-lg border border-[#E5E7EB] p-4">
            <p className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-wide mb-3">Listing fee</p>
            <div className="flex justify-between items-center">
              <span className="text-[#6B7A8D]">30-day job listing</span>
              <span className="font-bold text-[#111827] text-base">
                PKR {LISTING_PRICE_PKR.toLocaleString()}
              </span>
            </div>
          </div>
          <p className="text-xs text-[#9BAFC4]">
            Payment via bank transfer (HBL / UBL / Meezan). JazzCash and card support coming soon.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#D1D9E0] p-6">
        <h2 className="text-sm font-semibold text-[#111827] mb-4">What happens next</h2>
        <ol className="space-y-3">
          {[
            "We'll email you payment instructions within 24 hours",
            'Once payment is confirmed, our team reviews your listing (usually same day)',
            'Your listing goes live and starts reaching Pakistan-based talent immediately',
            "After 30 days we'll reach out if you'd like to renew",
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-[#374151]">
              <span className="w-5 h-5 rounded-full bg-[#F0FAF5] border border-[#B6DFD0] text-[#1A6B4A] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

export default function PostAJobPage() {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [step, setStep] = useState<'form' | 'payment'>('form')
  const [submissionId, setSubmissionId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function field(key: keyof FormData) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: err } = await supabase
      .from('submissions')
      .insert({
        company_name: form.company_name.trim(),
        company_website: form.company_website.trim(),
        company_logo_url: form.company_logo_url.trim() || null,
        title: form.title.trim(),
        category: form.category,
        seniority: form.seniority,
        region_eligibility: form.region_eligibility,
        description: form.description.trim(),
        application_url: form.application_url.trim(),
        salary_range: form.salary_range.trim() || null,
        contact_email: form.contact_email.trim(),
      })
      .select('id')
      .single()

    setLoading(false)

    if (err) {
      setError('Something went wrong. Please try again or email us directly.')
      return
    }

    setSubmissionId(data.id)
    setStep('payment')
  }

  if (step === 'payment') {
    return <PaymentScreen email={form.contact_email} submissionId={submissionId} />
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight mb-2">
          Post a Job
        </h1>
        <p className="text-[#6B7A8D] text-sm sm:text-base mb-4">
          Reach Pakistan-based remote talent. Every listing is manually reviewed before going live.
        </p>
        <div className="inline-flex items-center gap-2 bg-[#F0FAF5] border border-[#B6DFD0] text-[#1A6B4A] text-sm px-3 py-1.5 rounded-lg font-medium">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          One-time fee: PKR {LISTING_PRICE_PKR.toLocaleString()} · 30-day listing
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company */}
        <section className="bg-white rounded-xl border border-[#D1D9E0] p-6 space-y-4">
          <h2 className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest">Company</h2>

          <Field label="Company Name" required>
            <input
              type="text"
              required
              value={form.company_name}
              onChange={field('company_name')}
              placeholder="Acme Corp"
              className={inputClass}
            />
          </Field>

          <Field label="Company Website" required>
            <input
              type="url"
              required
              value={form.company_website}
              onChange={field('company_website')}
              placeholder="https://acme.com"
              className={inputClass}
            />
          </Field>

          <Field
            label="Company Logo URL"
            hint="Optional — paste a direct link to your logo (PNG/SVG, min 48×48 px)"
          >
            <input
              type="url"
              value={form.company_logo_url}
              onChange={field('company_logo_url')}
              placeholder="https://acme.com/logo.png"
              className={inputClass}
            />
          </Field>
        </section>

        {/* Role */}
        <section className="bg-white rounded-xl border border-[#D1D9E0] p-6 space-y-4">
          <h2 className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest">Role</h2>

          <Field label="Job Title" required>
            <input
              type="text"
              required
              value={form.title}
              onChange={field('title')}
              placeholder="Senior Product Designer"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Department" required>
              <select
                required
                value={form.category}
                onChange={field('category')}
                className={inputClass}
              >
                <option value="">Select…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>

            <Field label="Seniority" required>
              <select
                required
                value={form.seniority}
                onChange={field('seniority')}
                className={inputClass}
              >
                <option value="">Select…</option>
                {SENIORITY.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label="Region Eligibility"
            required
            hint="Who can apply? Choose the broadest region you accept."
          >
            <select
              required
              value={form.region_eligibility}
              onChange={field('region_eligibility')}
              className={inputClass}
            >
              <option value="">Select…</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>

          <Field
            label="Salary Range"
            hint="Optional — listings with salary info get significantly more clicks"
          >
            <input
              type="text"
              value={form.salary_range}
              onChange={field('salary_range')}
              placeholder="e.g. $3,000–$5,000/mo or PKR 150,000–250,000/mo"
              className={inputClass}
            />
          </Field>

          <Field
            label="Job Description"
            required
            hint={`${form.description.length}/1,000 characters`}
          >
            <textarea
              required
              maxLength={1000}
              rows={6}
              value={form.description}
              onChange={field('description')}
              placeholder="Describe the role, responsibilities, and what makes your company a great place to work…"
              className={`${inputClass} resize-none`}
            />
          </Field>

          <Field
            label="Application URL"
            required
            hint="Where should candidates apply? (Your careers page or ATS link)"
          >
            <input
              type="url"
              required
              value={form.application_url}
              onChange={field('application_url')}
              placeholder="https://jobs.acme.com/senior-designer"
              className={inputClass}
            />
          </Field>
        </section>

        {/* Contact */}
        <section className="bg-white rounded-xl border border-[#D1D9E0] p-6 space-y-4">
          <h2 className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest">Contact</h2>
          <Field
            label="Your Email"
            required
            hint="We'll send payment instructions and listing confirmation here"
          >
            <input
              type="email"
              required
              value={form.contact_email}
              onChange={field('contact_email')}
              placeholder="hiring@acme.com"
              className={inputClass}
            />
          </Field>
        </section>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-[#1A6B4A] text-white text-sm font-semibold hover:bg-[#155a3d] transition-colors disabled:opacity-60"
        >
          {loading ? 'Submitting…' : 'Submit listing →'}
        </button>

        <p className="text-xs text-[#9BAFC4] text-center">
          Your listing won&apos;t go live until payment is confirmed and our team has reviewed it.
          Typically within 1–2 business days.
        </p>
      </form>
    </div>
  )
}
