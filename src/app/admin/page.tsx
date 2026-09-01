'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'usama.aslam975@gmail.com'
const FEATURED_DAYS = 30
const SUB_DAYS = 30

const SENIORITY = [
  { value: 'entry', label: 'Entry-level' },
  { value: 'mid', label: 'Mid-level' },
  { value: 'senior', label: 'Senior' },
]
const REGIONS = ['Worldwide', 'Pakistan', 'APAC / EMEA']

type TabKey = 'review' | 'approved' | 'awaiting' | 'rejected'

type Submission = {
  id: string
  company_name: string
  company_website: string
  company_logo_url: string | null
  title: string
  category: string
  seniority: string
  region_eligibility: string
  description: string
  application_url: string
  salary_range: string | null
  contact_email: string
  payment_status: 'pending' | 'confirmed'
  approval_status: 'pending' | 'approved' | 'rejected'
  listing_id: string | null
  submitted_at: string
  reviewed_at: string | null
  admin_notes: string | null
}

type Bundle = {
  id: string
  contact_email: string
  credits_total: number
  credits_used: number
  payment_confirmed_at: string | null
}

type ListingDetail = {
  id: string
  is_active: boolean
  title: string
  short_summary: string | null
  tags: string[] | null
  seniority: string
  region_eligibility: string
  original_url: string
}

type ActionLoading = { id: string; action: 'payment' | 'approve' | 'reject' } | null

type ProfileRow = {
  id: string
  email: string | null
  is_pro: boolean
  subscription_status: string
  subscription_expiry: string | null
  created_at: string
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[#D1D9E0] text-sm text-[#111827] placeholder:text-[#9BAFC4] focus:outline-none focus:border-[#1A6B4A] focus:ring-1 focus:ring-[#1A6B4A] transition-colors bg-white'

function StatusBadge({ label, color }: { label: string; color: 'amber' | 'green' | 'red' | 'gray' | 'blue' }) {
  const styles = {
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${styles[color]}`}>
      {label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Approved card with inline editing ───────────────────────────────────────

function ApprovedCard({
  sub,
  bundle,
  detail,
  onDeactivate,
  onReactivate,
  onRefresh,
}: {
  sub: Submission
  bundle: Bundle | undefined
  detail: ListingDetail | undefined
  onDeactivate: (id: string) => void
  onReactivate: (id: string) => void
  onRefresh: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    title: '', short_summary: '', tags: '', seniority: '', region_eligibility: '', original_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [expanded, setExpanded] = useState(false)
  const seniorityLabel: Record<string, string> = { entry: 'Entry-level', mid: 'Mid-level', senior: 'Senior' }

  function startEdit() {
    if (!detail) return
    setForm({
      title: detail.title,
      short_summary: detail.short_summary ?? '',
      tags: (detail.tags ?? []).join(', '),
      seniority: detail.seniority,
      region_eligibility: detail.region_eligibility,
      original_url: detail.original_url,
    })
    setEditing(true)
    setSaveError('')
  }

  function f(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }))
  }

  async function saveEdit() {
    if (!detail) return
    setSaving(true)
    setSaveError('')
    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean)
    const { error } = await supabase
      .from('listings')
      .update({
        title: form.title.trim(),
        short_summary: form.short_summary.trim(),
        tags,
        seniority: form.seniority,
        region_eligibility: form.region_eligibility,
        original_url: form.original_url.trim(),
      })
      .eq('id', detail.id)
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setEditing(false)
    onRefresh()
  }

  return (
    <div className="bg-white rounded-xl border border-[#D1D9E0] overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs text-[#6B7A8D] font-medium uppercase tracking-wide mb-0.5">{sub.company_name}</p>
            <h3 className="text-base font-semibold text-[#111827]">{detail?.title ?? sub.title}</h3>
            <p className="text-xs text-[#9BAFC4] mt-1">Approved {sub.reviewed_at ? formatDate(sub.reviewed_at) : '—'}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="flex gap-2 flex-wrap justify-end">
              {detail && !detail.is_active && <StatusBadge label="Deactivated" color="red" />}
              {detail?.is_active && <StatusBadge label="Live" color="green" />}
            </div>
            {bundle && (
              <span className="text-xs text-[#6B7A8D]">Credits: {bundle.credits_used}/{bundle.credits_total} used</span>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-[#F3F5F7] text-[#6B7A8D] border border-[#D1D9E0]">{sub.category}</span>
          <span className="px-2 py-0.5 rounded-full bg-[#F3F5F7] text-[#6B7A8D] border border-[#D1D9E0]">{seniorityLabel[detail?.seniority ?? sub.seniority] ?? sub.seniority}</span>
          <span className="px-2 py-0.5 rounded-full bg-[#F3F5F7] text-[#6B7A8D] border border-[#D1D9E0]">{detail?.region_eligibility ?? sub.region_eligibility}</span>
        </div>

        {/* Actions */}
        {!editing && (
          <div className="mt-4 flex flex-wrap gap-2">
            {sub.listing_id && (
              <a
                href={`/listings/${sub.listing_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm px-3 py-1.5 rounded-lg border border-[#D1D9E0] text-[#374151] font-medium hover:bg-[#F8FAFC] transition-colors"
              >
                View listing ↗
              </a>
            )}
            {detail && (
              <button
                type="button"
                onClick={startEdit}
                className="text-sm px-3 py-1.5 rounded-lg border border-[#D1D9E0] text-[#374151] font-medium hover:bg-[#F8FAFC] transition-colors"
              >
                Edit
              </button>
            )}
            {detail?.is_active && sub.listing_id && (
              <button
                type="button"
                onClick={() => onDeactivate(sub.listing_id!)}
                className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-600 font-medium hover:bg-red-50 transition-colors"
              >
                Deactivate
              </button>
            )}
            {detail && !detail.is_active && sub.listing_id && (
              <button
                type="button"
                onClick={() => onReactivate(sub.listing_id!)}
                className="text-sm px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 font-medium hover:bg-emerald-50 transition-colors"
              >
                Reactivate
              </button>
            )}
          </div>
        )}

        {/* Inline edit form */}
        {editing && (
          <div className="mt-4 border border-[#D1D9E0] rounded-xl p-4 space-y-3 bg-[#F8FAFC]">
            <p className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-1">Editing listing</p>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Title</label>
              <input type="text" value={form.title} onChange={f('title')} className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Description</label>
              <textarea rows={4} value={form.short_summary} onChange={f('short_summary')} className={`${inputClass} resize-none`} />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Tags <span className="text-[#9BAFC4] font-normal">(comma-separated)</span></label>
              <input type="text" value={form.tags} onChange={f('tags')} placeholder="React, TypeScript, Node.js" className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Seniority</label>
                <select value={form.seniority} onChange={f('seniority')} className={inputClass}>
                  {SENIORITY.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Region</label>
                <select value={form.region_eligibility} onChange={f('region_eligibility')} className={inputClass}>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Application URL</label>
              <input type="url" value={form.original_url} onChange={f('original_url')} className={inputClass} />
            </div>

            {saveError && <p className="text-xs text-red-600">{saveError}</p>}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="text-sm px-4 py-1.5 rounded-lg bg-[#1A6B4A] text-white font-medium hover:bg-[#155a3d] transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-sm px-4 py-1.5 rounded-lg border border-[#D1D9E0] text-[#374151] font-medium hover:bg-[#F3F5F7] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Expand for submission details */}
      <div className="border-t border-[#F3F5F7]">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-xs text-[#6B7A8D] hover:bg-[#F8FAFC] transition-colors font-medium"
        >
          <span>Contact: {sub.contact_email}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {expanded && (
          <div className="px-5 pb-5 border-t border-[#F3F5F7] space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-[#9BAFC4] mb-0.5">Company website</p>
                <a href={sub.company_website} target="_blank" rel="noopener noreferrer" className="text-[#1A6B4A] hover:underline truncate block">{sub.company_website}</a>
              </div>
              <div>
                <p className="text-xs text-[#9BAFC4] mb-0.5">Application URL</p>
                <a href={sub.application_url} target="_blank" rel="noopener noreferrer" className="text-[#1A6B4A] hover:underline truncate block">{sub.application_url}</a>
              </div>
            </div>
            <div>
              <p className="text-xs text-[#9BAFC4] mb-1">Original description</p>
              <p className="text-sm text-[#374151] whitespace-pre-wrap bg-white rounded-lg p-3 border border-[#E5E7EB]">{sub.description}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Pending submission card ──────────────────────────────────────────────────

function SubmissionCard({
  sub,
  bundle,
  actionLoading,
  onConfirmPayment,
  onApprove,
  onReject,
}: {
  sub: Submission
  bundle: Bundle | undefined
  actionLoading: ActionLoading
  onConfirmPayment: (sub: Submission) => void
  onApprove: (sub: Submission) => void
  onReject: (sub: Submission) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isLoading = actionLoading?.id === sub.id
  const seniorityLabel: Record<string, string> = { entry: 'Entry-level', mid: 'Mid-level', senior: 'Senior' }
  const creditsRemaining = bundle ? bundle.credits_total - bundle.credits_used : null
  const bundleExhausted = creditsRemaining !== null && creditsRemaining <= 0

  return (
    <div className="bg-white rounded-xl border border-[#D1D9E0] overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs text-[#6B7A8D] font-medium uppercase tracking-wide mb-0.5">{sub.company_name}</p>
            <h3 className="text-base font-semibold text-[#111827]">{sub.title}</h3>
            <p className="text-xs text-[#9BAFC4] mt-1">{formatDate(sub.submitted_at)}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="flex gap-2 flex-wrap justify-end">
              {sub.payment_status === 'pending'
                ? <StatusBadge label="Awaiting payment" color="amber" />
                : <StatusBadge label="Payment confirmed" color="green" />}
              {sub.approval_status === 'rejected' && <StatusBadge label="Rejected" color="red" />}
            </div>
            {bundle
              ? <span className={`text-xs font-medium ${bundleExhausted ? 'text-red-600' : 'text-[#6B7A8D]'}`}>Bundle: {bundle.credits_used}/{bundle.credits_total} credits used{bundleExhausted ? ' — exhausted' : ''}</span>
              : <span className="text-xs text-[#9BAFC4]">No bundle yet</span>}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-[#F3F5F7] text-[#6B7A8D] border border-[#D1D9E0]">{sub.category}</span>
          <span className="px-2 py-0.5 rounded-full bg-[#F3F5F7] text-[#6B7A8D] border border-[#D1D9E0]">{seniorityLabel[sub.seniority] ?? sub.seniority}</span>
          <span className="px-2 py-0.5 rounded-full bg-[#F3F5F7] text-[#6B7A8D] border border-[#D1D9E0]">{sub.region_eligibility}</span>
          {sub.salary_range && <span className="px-2 py-0.5 rounded-full bg-[#F3F5F7] text-[#6B7A8D] border border-[#D1D9E0]">{sub.salary_range}</span>}
        </div>

        {sub.approval_status === 'pending' && (
          <div className="mt-4 flex flex-wrap gap-2">
            {sub.payment_status === 'pending' && (
              <button type="button" disabled={isLoading} onClick={() => onConfirmPayment(sub)}
                className="text-sm px-4 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-medium hover:bg-amber-100 transition-colors disabled:opacity-50">
                {isLoading && actionLoading?.action === 'payment' ? 'Confirming…' : 'Confirm Payment Received'}
              </button>
            )}
            {sub.payment_status === 'confirmed' && (
              <>
                <button type="button" disabled={isLoading} onClick={() => onApprove(sub)}
                  className="text-sm px-4 py-1.5 rounded-lg bg-[#1A6B4A] text-white font-medium hover:bg-[#155a3d] transition-colors disabled:opacity-50">
                  {isLoading && actionLoading?.action === 'approve' ? 'Publishing…' : `Approve & Publish (Featured ${FEATURED_DAYS}d)`}
                </button>
                <button type="button" disabled={isLoading} onClick={() => onReject(sub)}
                  className="text-sm px-4 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 font-medium hover:bg-red-100 transition-colors disabled:opacity-50">
                  {isLoading && actionLoading?.action === 'reject' ? 'Rejecting…' : 'Reject'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-[#F3F5F7]">
        <button type="button" onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-xs text-[#6B7A8D] hover:bg-[#F8FAFC] transition-colors font-medium">
          <span>Contact: {sub.contact_email}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {expanded && (
          <div className="px-5 pb-5 space-y-4 border-t border-[#F3F5F7] pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-[#9BAFC4] mb-0.5">Company website</p>
                <a href={sub.company_website} target="_blank" rel="noopener noreferrer" className="text-[#1A6B4A] hover:underline truncate block">{sub.company_website}</a>
              </div>
              {sub.company_logo_url && (
                <div>
                  <p className="text-xs text-[#9BAFC4] mb-0.5">Logo URL</p>
                  <a href={sub.company_logo_url} target="_blank" rel="noopener noreferrer" className="text-[#1A6B4A] hover:underline truncate block">{sub.company_logo_url}</a>
                </div>
              )}
              <div>
                <p className="text-xs text-[#9BAFC4] mb-0.5">Application URL</p>
                <a href={sub.application_url} target="_blank" rel="noopener noreferrer" className="text-[#1A6B4A] hover:underline truncate block">{sub.application_url}</a>
              </div>
            </div>
            <div>
              <p className="text-xs text-[#9BAFC4] mb-1">Job description</p>
              <p className="text-sm text-[#374151] whitespace-pre-wrap bg-[#F8FAFC] rounded-lg p-3 border border-[#E5E7EB]">{sub.description}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main admin page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('review')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [bundlesByEmail, setBundlesByEmail] = useState<Map<string, Bundle>>(new Map())
  const [listingDetails, setListingDetails] = useState<Record<string, ListingDetail>>({})
  const [loadingData, setLoadingData] = useState(false)
  const [actionLoading, setActionLoading] = useState<ActionLoading>(null)
  const [error, setError] = useState('')

  // Subscriber management
  const [subSearchEmail, setSubSearchEmail] = useState('')
  const [subSearchResult, setSubSearchResult] = useState<ProfileRow | null | 'not-found'>('not-found')
  const [subSearchLoading, setSubSearchLoading] = useState(false)
  const [subActionLoading, setSubActionLoading] = useState<string | null>(null)
  const [activeSubscribers, setActiveSubscribers] = useState<ProfileRow[]>([])
  const [recentlyExpired, setRecentlyExpired] = useState<ProfileRow[]>([])
  const [subError, setSubError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email === ADMIN_EMAIL) {
        setIsAdmin(true)
        fetchData()
        loadActiveSubscribers()
      }
      setAuthChecked(true)
    })
  }, [])

  async function fetchData() {
    setLoadingData(true)
    const [{ data: subs }, { data: bdls }] = await Promise.all([
      supabase.from('submissions').select('*').order('submitted_at', { ascending: false }),
      supabase.from('employer_bundles').select('*'),
    ])

    const subList = (subs as Submission[]) ?? []
    setSubmissions(subList)

    const map = new Map<string, Bundle>()
    ;((bdls as Bundle[]) ?? []).forEach((b) => map.set(b.contact_email.toLowerCase(), b))
    setBundlesByEmail(map)

    // Fetch listing details for approved submissions
    const listingIds = subList
      .filter((s) => s.approval_status === 'approved' && s.listing_id)
      .map((s) => s.listing_id!)

    if (listingIds.length > 0) {
      const { data: listings } = await supabase
        .from('listings')
        .select('id, is_active, title, short_summary, tags, seniority, region_eligibility, original_url')
        .in('id', listingIds)
      const details: Record<string, ListingDetail> = {}
      ;((listings as ListingDetail[]) ?? []).forEach((l) => { details[l.id] = l })
      setListingDetails(details)
    }

    setLoadingData(false)
  }

  async function handleConfirmPayment(sub: Submission) {
    setActionLoading({ id: sub.id, action: 'payment' })
    const emailKey = sub.contact_email.toLowerCase()
    const existingBundle = bundlesByEmail.get(emailKey)

    if (!existingBundle) {
      const { error: bundleErr } = await supabase.from('employer_bundles').insert({
        contact_email: emailKey,
        payment_confirmed_at: new Date().toISOString(),
      })
      if (bundleErr) { setActionLoading(null); setError('Bundle create: ' + bundleErr.message); return }
    } else if (!existingBundle.payment_confirmed_at) {
      await supabase.from('employer_bundles').update({ payment_confirmed_at: new Date().toISOString() }).eq('id', existingBundle.id)
    }

    const { error: subErr } = await supabase.from('submissions').update({ payment_status: 'confirmed' }).eq('id', sub.id)
    setActionLoading(null)
    if (subErr) { setError(subErr.message); return }
    fetchData()
  }

  async function handleApprove(sub: Submission) {
    setActionLoading({ id: sub.id, action: 'approve' })

    const { data: existing } = await supabase.from('companies').select('id').ilike('name', sub.company_name).maybeSingle()
    let companyId: string
    if (existing) {
      companyId = existing.id
    } else {
      const { data: newCo, error: coErr } = await supabase
        .from('companies')
        .insert({ name: sub.company_name, website: sub.company_website, logo_url: sub.company_logo_url, pakistan_friendly: true })
        .select('id').single()
      if (coErr) { setActionLoading(null); setError('Company: ' + coErr.message); return }
      companyId = newCo.id
    }

    const featuredUntil = new Date()
    featuredUntil.setDate(featuredUntil.getDate() + FEATURED_DAYS)
    const today = new Date().toISOString().split('T')[0]

    const { data: listing, error: listErr } = await supabase
      .from('listings')
      .insert({
        title: sub.title, seniority: sub.seniority, location_type: 'remote',
        region_eligibility: sub.region_eligibility, category: sub.category, tags: [],
        salary_range: sub.salary_range, short_summary: sub.description.slice(0, 500),
        original_url: sub.application_url, date_posted: today,
        date_added: new Date().toISOString(), verified: true, is_active: true,
        source: 'employer_submitted', featured: true,
        featured_until: featuredUntil.toISOString().split('T')[0],
        company_id: companyId,
      })
      .select('id').single()
    if (listErr) { setActionLoading(null); setError('Listing: ' + listErr.message); return }

    const { error: subErr } = await supabase.from('submissions')
      .update({ approval_status: 'approved', listing_id: listing.id, reviewed_at: new Date().toISOString() })
      .eq('id', sub.id)
    if (subErr) { setActionLoading(null); setError('Submission: ' + subErr.message); return }

    const bundle = bundlesByEmail.get(sub.contact_email.toLowerCase())
    if (bundle) {
      await supabase.from('employer_bundles').update({ credits_used: bundle.credits_used + 1 }).eq('id', bundle.id)
    }

    setActionLoading(null)
    setActiveTab('approved')
    fetchData()
  }

  async function handleReject(sub: Submission) {
    if (!confirm(`Reject "${sub.title}" from ${sub.company_name}?`)) return
    setActionLoading({ id: sub.id, action: 'reject' })
    const { error: err } = await supabase.from('submissions')
      .update({ approval_status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', sub.id)
    setActionLoading(null)
    if (err) { setError(err.message); return }
    fetchData()
  }

  async function handleDeactivate(listingId: string) {
    if (!confirm('Deactivate this listing? It will be removed from the public feed.')) return
    const { error } = await supabase.from('listings').update({ is_active: false }).eq('id', listingId)
    if (error) { setError(error.message); return }
    fetchData()
  }

  async function handleReactivate(listingId: string) {
    const { error } = await supabase.from('listings').update({ is_active: true }).eq('id', listingId)
    if (error) { setError(error.message); return }
    fetchData()
  }

  async function loadActiveSubscribers() {
    const today = new Date().toISOString().split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [{ data: active, error: err1 }, { data: expired, error: err2 }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, is_pro, subscription_status, subscription_expiry, created_at')
        .eq('subscription_status', 'paid')
        .gte('subscription_expiry', today)
        .order('subscription_expiry', { ascending: true }),
      supabase
        .from('profiles')
        .select('id, email, is_pro, subscription_status, subscription_expiry, created_at')
        .eq('subscription_status', 'paid')
        .lt('subscription_expiry', today)
        .gte('subscription_expiry', sevenDaysAgo)
        .order('subscription_expiry', { ascending: false }),
    ])

    if (err1) { setSubError(err1.message); return }
    if (err2) { setSubError(err2.message); return }
    setActiveSubscribers((active as ProfileRow[]) ?? [])
    setRecentlyExpired((expired as ProfileRow[]) ?? [])
  }

  async function searchSubscriber() {
    if (!subSearchEmail.trim()) return
    setSubSearchLoading(true)
    setSubSearchResult('not-found')
    setSubError('')
    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, email, is_pro, subscription_status, subscription_expiry, created_at')
      .ilike('email', subSearchEmail.trim())
      .maybeSingle()
    setSubSearchLoading(false)
    if (err) { setSubError(err.message); return }
    setSubSearchResult(data ? (data as ProfileRow) : 'not-found')
  }

  async function handleActivateSub(profileId: string) {
    setSubActionLoading(profileId + ':activate')
    setSubError('')
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + SUB_DAYS)
    const { error: err } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'paid',
        subscription_expiry: expiry.toISOString().split('T')[0],
      })
      .eq('id', profileId)
    setSubActionLoading(null)
    if (err) { setSubError(err.message); return }
    // Refresh search result and active list
    await Promise.all([searchSubscriber(), loadActiveSubscribers()])
  }

  async function handleExtendSub(profile: ProfileRow) {
    setSubActionLoading(profile.id + ':extend')
    setSubError('')
    const base = profile.subscription_expiry && profile.subscription_expiry >= new Date().toISOString().split('T')[0]
      ? new Date(profile.subscription_expiry)
      : new Date()
    base.setDate(base.getDate() + SUB_DAYS)
    const { error: err } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'paid',
        subscription_expiry: base.toISOString().split('T')[0],
      })
      .eq('id', profile.id)
    setSubActionLoading(null)
    if (err) { setSubError(err.message); return }
    await Promise.all([searchSubscriber(), loadActiveSubscribers()])
  }

  async function handleRevokeSub(profileId: string) {
    if (!confirm('Revoke this subscription? The user will lose access immediately.')) return
    setSubActionLoading(profileId + ':revoke')
    setSubError('')
    const { error: err } = await supabase
      .from('profiles')
      .update({ subscription_status: 'free', subscription_expiry: null })
      .eq('id', profileId)
    setSubActionLoading(null)
    if (err) { setSubError(err.message); return }
    await Promise.all([searchSubscriber(), loadActiveSubscribers()])
  }

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-5 h-5 border-2 border-[#1A6B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <p className="text-lg font-semibold text-[#111827] mb-2">Access denied</p>
        <p className="text-sm text-[#6B7A8D] mb-4">You need to be signed in as the admin account.</p>
        <button type="button" onClick={() => router.push('/login')} className="text-sm text-[#1A6B4A] hover:underline font-medium">Sign in →</button>
      </div>
    )
  }

  const readyToReview = submissions.filter((s) => s.payment_status === 'confirmed' && s.approval_status === 'pending')
  const approved = submissions.filter((s) => s.approval_status === 'approved')
  const awaitingPayment = submissions.filter((s) => s.payment_status === 'pending' && s.approval_status === 'pending')
  const rejected = submissions.filter((s) => s.approval_status === 'rejected')

  const tabs: { key: TabKey; label: string; count: number; dot?: string }[] = [
    { key: 'review', label: 'Ready to Review', count: readyToReview.length, dot: readyToReview.length > 0 ? 'bg-blue-500' : undefined },
    { key: 'approved', label: 'Approved', count: approved.length },
    { key: 'awaiting', label: 'Awaiting Payment', count: awaitingPayment.length },
    { key: 'rejected', label: 'Rejected', count: rejected.length },
  ]

  const tabItems: Record<TabKey, Submission[]> = { review: readyToReview, approved, awaiting: awaitingPayment, rejected }
  const statToTab: Record<string, TabKey> = { 'Awaiting payment': 'awaiting', 'Ready to review': 'review', 'Approved': 'approved' }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#111827] mb-1">Admin — Submissions</h1>
        <p className="text-sm text-[#6B7A8D]">Review and publish employer job submissions.</p>
      </div>

      {/* Stats — clicking jumps to that tab */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: submissions.length, color: 'text-[#111827]', tab: null },
          { label: 'Awaiting payment', value: awaitingPayment.length, color: 'text-amber-600', tab: 'awaiting' as TabKey },
          { label: 'Ready to review', value: readyToReview.length, color: 'text-blue-600', tab: 'review' as TabKey },
          { label: 'Approved', value: approved.length, color: 'text-emerald-600', tab: 'approved' as TabKey },
        ].map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={() => stat.tab && setActiveTab(stat.tab)}
            className={`bg-white rounded-xl border border-[#D1D9E0] p-4 text-center transition-colors ${stat.tab ? 'hover:border-[#9BAFC4] cursor-pointer' : 'cursor-default'}`}
          >
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-[#6B7A8D] mt-0.5">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#D1D9E0] mb-6 gap-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'text-[#1A6B4A] border-b-2 border-[#1A6B4A] -mb-px'
                : 'text-[#6B7A8D] hover:text-[#111827]'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                activeTab === tab.key ? 'bg-[#E8F5EF] text-[#1A6B4A]' : 'bg-[#F3F5F7] text-[#6B7A8D]'
              }`}>
                {tab.count}
              </span>
            )}
            {tab.dot && activeTab !== tab.key && (
              <span className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${tab.dot}`} />
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="ml-4 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {loadingData && (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-[#1A6B4A] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loadingData && tabItems[activeTab].length === 0 && (
        <div className="text-center py-16 text-[#6B7A8D] text-sm">
          Nothing here yet.
        </div>
      )}

      {!loadingData && (
        <div className="space-y-4">
          {activeTab === 'approved'
            ? approved.map((sub) => (
                <ApprovedCard
                  key={sub.id}
                  sub={sub}
                  bundle={bundlesByEmail.get(sub.contact_email.toLowerCase())}
                  detail={sub.listing_id ? listingDetails[sub.listing_id] : undefined}
                  onDeactivate={handleDeactivate}
                  onReactivate={handleReactivate}
                  onRefresh={fetchData}
                />
              ))
            : tabItems[activeTab].map((sub) => (
                <SubmissionCard
                  key={sub.id}
                  sub={sub}
                  bundle={bundlesByEmail.get(sub.contact_email.toLowerCase())}
                  actionLoading={actionLoading}
                  onConfirmPayment={handleConfirmPayment}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
        </div>
      )}

      {/* ─── Subscriber Management ─────────────────────────────────────────── */}
      <div className="mt-14 pt-10 border-t border-[#D1D9E0]">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#111827] mb-1">Subscriber Management</h2>
          <p className="text-sm text-[#6B7A8D]">Look up a user by email to activate or extend their subscription.</p>
        </div>

        {subError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <span>{subError}</span>
            <button type="button" onClick={() => setSubError('')} className="ml-4 text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-xl border border-[#D1D9E0] p-5 mb-6">
          <p className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-3">Look up user</p>
          <form
            onSubmit={(e) => { e.preventDefault(); searchSubscriber() }}
            className="flex gap-2"
          >
            <input
              type="email"
              value={subSearchEmail}
              onChange={(e) => setSubSearchEmail(e.target.value)}
              placeholder="user@example.com"
              className={inputClass}
            />
            <button
              type="submit"
              disabled={subSearchLoading}
              className="shrink-0 px-4 py-2 rounded-lg bg-[#1A6B4A] text-white text-sm font-semibold hover:bg-[#155a3d] transition-colors disabled:opacity-60"
            >
              {subSearchLoading ? 'Searching…' : 'Search'}
            </button>
          </form>

          {subSearchResult && subSearchResult !== 'not-found' && (() => {
            const p = subSearchResult
            const today = new Date().toISOString().split('T')[0]
            const isActive = p.subscription_status === 'paid' && !!p.subscription_expiry && p.subscription_expiry >= today
            const isExpired = p.subscription_status === 'paid' && !!p.subscription_expiry && p.subscription_expiry < today
            return (
              <div className="mt-4 bg-[#F8FAFC] rounded-xl border border-[#D1D9E0] p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">{p.email ?? '—'}</p>
                    <p className="text-xs text-[#9BAFC4] mt-0.5">ID: {p.id.split('-')[0]}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {p.is_pro && <StatusBadge label="Legacy Pro" color="blue" />}
                    {isActive && <StatusBadge label="Active subscriber" color="green" />}
                    {isExpired && <StatusBadge label="Expired" color="red" />}
                    {!isActive && !isExpired && !p.is_pro && <StatusBadge label="Free" color="gray" />}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <p className="text-xs text-[#9BAFC4] mb-0.5">Subscription status</p>
                    <p className="font-medium text-[#111827]">{p.subscription_status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9BAFC4] mb-0.5">Expires</p>
                    <p className="font-medium text-[#111827]">
                      {p.subscription_expiry
                        ? new Date(p.subscription_expiry).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {!isActive && (
                    <button
                      type="button"
                      disabled={subActionLoading === p.id + ':activate'}
                      onClick={() => handleActivateSub(p.id)}
                      className="text-sm px-4 py-1.5 rounded-lg bg-[#1A6B4A] text-white font-medium hover:bg-[#155a3d] transition-colors disabled:opacity-50"
                    >
                      {subActionLoading === p.id + ':activate' ? 'Activating…' : `Activate (${SUB_DAYS} days from today)`}
                    </button>
                  )}
                  {isActive && (
                    <button
                      type="button"
                      disabled={subActionLoading === p.id + ':extend'}
                      onClick={() => handleExtendSub(p)}
                      className="text-sm px-4 py-1.5 rounded-lg bg-[#1A6B4A] text-white font-medium hover:bg-[#155a3d] transition-colors disabled:opacity-50"
                    >
                      {subActionLoading === p.id + ':extend' ? 'Extending…' : `Extend +${SUB_DAYS} days`}
                    </button>
                  )}
                  {(isActive || isExpired) && (
                    <button
                      type="button"
                      disabled={subActionLoading === p.id + ':revoke'}
                      onClick={() => handleRevokeSub(p.id)}
                      className="text-sm px-4 py-1.5 rounded-lg border border-red-200 text-red-600 font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {subActionLoading === p.id + ':revoke' ? 'Revoking…' : 'Revoke'}
                    </button>
                  )}
                </div>
              </div>
            )
          })()}

          {subSearchResult === 'not-found' && subSearchEmail && !subSearchLoading && (
            <p className="mt-3 text-sm text-[#9BAFC4]">No user found with that email.</p>
          )}
        </div>

        {/* Active subscribers list */}
        <div className="bg-white rounded-xl border border-[#D1D9E0] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F3F5F7] flex items-center justify-between">
            <p className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest">
              Active subscribers ({activeSubscribers.length})
            </p>
            <button
              type="button"
              onClick={loadActiveSubscribers}
              className="text-xs text-[#1A6B4A] hover:underline font-medium"
            >
              Refresh
            </button>
          </div>
          {activeSubscribers.length === 0 ? (
            <p className="text-sm text-[#9BAFC4] text-center py-10">No active paid subscribers yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F3F5F7]">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-[#6B7A8D]">Email</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-[#6B7A8D]">Expires</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {activeSubscribers.map((p) => (
                  <tr key={p.id} className="border-b border-[#F3F5F7] last:border-0 hover:bg-[#F8FAFC]">
                    <td className="px-5 py-3 text-[#111827] font-medium">{p.email ?? '—'}</td>
                    <td className="px-5 py-3 text-[#374151]">
                      {p.subscription_expiry
                        ? new Date(p.subscription_expiry).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        disabled={subActionLoading === p.id + ':extend'}
                        onClick={() => handleExtendSub(p)}
                        className="text-xs px-3 py-1 rounded-lg border border-[#D1D9E0] text-[#374151] font-medium hover:bg-[#F3F5F7] transition-colors disabled:opacity-50"
                      >
                        {subActionLoading === p.id + ':extend' ? '…' : `+${SUB_DAYS}d`}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recently expired — follow-up candidates */}
        {recentlyExpired.length > 0 && (
          <div className="bg-white rounded-xl border border-amber-200 overflow-hidden mt-4">
            <div className="px-5 py-4 border-b border-amber-100 bg-amber-50">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest">
                Expired in last 7 days ({recentlyExpired.length}) — follow up for renewal
              </p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F3F5F7]">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-[#6B7A8D]">Email</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-[#6B7A8D]">Expired</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {recentlyExpired.map((p) => (
                  <tr key={p.id} className="border-b border-[#F3F5F7] last:border-0 hover:bg-[#F8FAFC]">
                    <td className="px-5 py-3 text-[#111827] font-medium">{p.email ?? '—'}</td>
                    <td className="px-5 py-3 text-amber-600 font-medium">
                      {p.subscription_expiry
                        ? new Date(p.subscription_expiry).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        disabled={subActionLoading === p.id + ':extend'}
                        onClick={() => handleExtendSub(p)}
                        className="text-xs px-3 py-1 rounded-lg border border-amber-200 text-amber-700 font-medium hover:bg-amber-50 transition-colors disabled:opacity-50"
                      >
                        {subActionLoading === p.id + ':extend' ? '…' : 'Renew +30d'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
