'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const REGIONS = ['Worldwide', 'USA', 'UK', 'EMEA', 'APAC']

const SALARY_RANGES = [
  'Under $30k/year',
  '$30k–$50k/year',
  '$50k–$80k/year',
  '$80k–$120k/year',
  '$120k+/year',
]

const SENIORITY_LEVELS = ['Entry-level', 'Mid-level', 'Senior', 'Lead / Principal']

const CATEGORIES = [
  'Software Development',
  'Sales',
  'Marketing',
  'HR',
  'Legal',
  'Finance',
]

const inputClass =
  'w-full px-4 py-2.5 rounded-lg border border-[#D1D9E0] bg-white text-[#111827] placeholder:text-[#9BAFC4] text-sm focus:outline-none focus:border-[#1A6B4A] focus:ring-1 focus:ring-[#1A6B4A] transition-colors'

const selectClass =
  'w-full px-4 py-2.5 rounded-lg border border-[#D1D9E0] bg-white text-[#111827] text-sm focus:outline-none focus:border-[#1A6B4A] focus:ring-1 focus:ring-[#1A6B4A] transition-colors appearance-none cursor-pointer'

const labelClass = 'block text-sm font-medium text-[#111827] mb-1.5'

export default function OnboardingProfilePage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [phone, setPhone] = useState('')
  const [region, setRegion] = useState('')
  const [salary, setSalary] = useState('')
  const [seniority, setSeniority] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login?tab=signup')
        return
      }
      const uid = session.user.id
      setUserId(uid)

      // Pre-fill if profile data already exists
      supabase
        .from('profiles')
        .select('phone_number, preferred_region, desired_salary_range, seniority_level, category_interest')
        .eq('id', uid)
        .single()
        .then(({ data }) => {
          if (data) {
            setPhone(data.phone_number ?? '')
            setRegion(data.preferred_region ?? '')
            setSalary(data.desired_salary_range ?? '')
            setSeniority(data.seniority_level ?? '')
            setCategory(data.category_interest ?? '')
          }
          setLoading(false)
        })
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!phone.trim()) {
      setError('Phone number is required.')
      return
    }
    if (!userId) return

    setSaving(true)
    const { error: saveError } = await supabase
      .from('profiles')
      .update({
        phone_number: phone.trim(),
        preferred_region: region || null,
        desired_salary_range: salary || null,
        seniority_level: seniority || null,
        category_interest: category || null,
      })
      .eq('id', userId)
    setSaving(false)

    if (saveError) {
      setError('Failed to save. Please try again.')
      return
    }

    router.push('/onboarding/subscribe')
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
            <span className="w-5 h-5 rounded-full bg-[#1A6B4A] text-white flex items-center justify-center text-[10px] font-bold">1</span>
            Profile
          </div>
          <div className="h-px w-8 bg-[#D1D9E0]" />
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#9BAFC4]">
            <span className="w-5 h-5 rounded-full border border-[#D1D9E0] text-[#9BAFC4] flex items-center justify-center text-[10px] font-bold">2</span>
            Subscribe
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D1D9E0] p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-[#111827] mb-1">Complete your profile</h1>
            <p className="text-sm text-[#6B7A8D] leading-relaxed">
              Help us match you to the right roles. Takes less than a minute.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Phone — required */}
            <div>
              <label htmlFor="phone" className={labelClass}>
                Phone number <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 0000000"
                className={inputClass}
              />
            </div>

            {/* Preferred region — optional */}
            <div>
              <label htmlFor="region" className={labelClass}>
                Preferred job region
                <span className="text-[#9BAFC4] font-normal ml-1">(optional)</span>
              </label>
              <div className="relative">
                <select
                  id="region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Any region</option>
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <ChevronDown />
              </div>
            </div>

            {/* Desired salary — optional */}
            <div>
              <label htmlFor="salary" className={labelClass}>
                Desired salary
                <span className="text-[#9BAFC4] font-normal ml-1">(optional)</span>
              </label>
              <div className="relative">
                <select
                  id="salary"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select a range</option>
                  {SALARY_RANGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown />
              </div>
            </div>

            {/* Seniority — optional */}
            <div>
              <label htmlFor="seniority" className={labelClass}>
                Seniority level
                <span className="text-[#9BAFC4] font-normal ml-1">(optional)</span>
              </label>
              <div className="relative">
                <select
                  id="seniority"
                  value={seniority}
                  onChange={(e) => setSeniority(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select level</option>
                  {SENIORITY_LEVELS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown />
              </div>
            </div>

            {/* Category — optional */}
            <div>
              <label htmlFor="category" className={labelClass}>
                Area of interest
                <span className="text-[#9BAFC4] font-normal ml-1">(optional)</span>
              </label>
              <div className="relative">
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select a department</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">{error}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 px-4 rounded-xl bg-[#1A6B4A] text-white text-sm font-semibold hover:bg-[#155a3d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {saving ? 'Saving…' : 'Next — Unlock full access →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function ChevronDown() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9BAFC4]"
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
