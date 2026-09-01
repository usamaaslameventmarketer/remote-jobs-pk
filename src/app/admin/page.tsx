'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'usama.aslam975@gmail.com'

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

type ActionLoading = { id: string; action: 'payment' | 'approve' | 'reject' } | null

function StatusBadge({ label, color }: { label: string; color: 'amber' | 'green' | 'red' | 'gray' }) {
  const styles = {
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${styles[color]}`}>
      {label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SubmissionCard({
  sub,
  actionLoading,
  onConfirmPayment,
  onApprove,
  onReject,
}: {
  sub: Submission
  actionLoading: ActionLoading
  onConfirmPayment: (sub: Submission) => void
  onApprove: (sub: Submission) => void
  onReject: (sub: Submission) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isLoading = actionLoading?.id === sub.id

  const seniorityLabel: Record<string, string> = { entry: 'Entry-level', mid: 'Mid-level', senior: 'Senior' }

  return (
    <div className="bg-white rounded-xl border border-[#D1D9E0] overflow-hidden">
      {/* Header row */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs text-[#6B7A8D] font-medium uppercase tracking-wide mb-0.5">
              {sub.company_name}
            </p>
            <h3 className="text-base font-semibold text-[#111827]">{sub.title}</h3>
            <p className="text-xs text-[#9BAFC4] mt-1">{formatDate(sub.submitted_at)}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Payment status */}
            {sub.payment_status === 'pending' ? (
              <StatusBadge label="Awaiting payment" color="amber" />
            ) : (
              <StatusBadge label="Payment confirmed" color="green" />
            )}
            {/* Approval status */}
            {sub.approval_status === 'pending' && <StatusBadge label="Pending review" color="gray" />}
            {sub.approval_status === 'approved' && <StatusBadge label="Approved" color="green" />}
            {sub.approval_status === 'rejected' && <StatusBadge label="Rejected" color="red" />}
          </div>
        </div>

        {/* Quick info */}
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-[#F3F5F7] text-[#6B7A8D] border border-[#D1D9E0]">
            {sub.category}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#F3F5F7] text-[#6B7A8D] border border-[#D1D9E0]">
            {seniorityLabel[sub.seniority] ?? sub.seniority}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#F3F5F7] text-[#6B7A8D] border border-[#D1D9E0]">
            {sub.region_eligibility}
          </span>
          {sub.salary_range && (
            <span className="px-2 py-0.5 rounded-full bg-[#F3F5F7] text-[#6B7A8D] border border-[#D1D9E0]">
              {sub.salary_range}
            </span>
          )}
        </div>

        {/* Action buttons */}
        {sub.approval_status === 'pending' && (
          <div className="mt-4 flex flex-wrap gap-2">
            {sub.payment_status === 'pending' && (
              <button
                type="button"
                disabled={isLoading}
                onClick={() => onConfirmPayment(sub)}
                className="text-sm px-4 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-medium hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                {isLoading && actionLoading?.action === 'payment' ? 'Confirming…' : 'Confirm Payment Received'}
              </button>
            )}
            {sub.payment_status === 'confirmed' && (
              <>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => onApprove(sub)}
                  className="text-sm px-4 py-1.5 rounded-lg bg-[#1A6B4A] text-white font-medium hover:bg-[#155a3d] transition-colors disabled:opacity-50"
                >
                  {isLoading && actionLoading?.action === 'approve' ? 'Publishing…' : 'Approve & Publish'}
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => onReject(sub)}
                  className="text-sm px-4 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {isLoading && actionLoading?.action === 'reject' ? 'Rejecting…' : 'Reject'}
                </button>
              </>
            )}
          </div>
        )}

        {sub.approval_status === 'approved' && sub.listing_id && (
          <p className="mt-3 text-xs text-emerald-700">
            Live listing ID:{' '}
            <span className="font-mono">{sub.listing_id}</span>
          </p>
        )}
      </div>

      {/* Expandable details */}
      <div className="border-t border-[#F3F5F7]">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-xs text-[#6B7A8D] hover:bg-[#F8FAFC] transition-colors font-medium"
        >
          <span>Contact: {sub.contact_email}</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {expanded && (
          <div className="px-5 pb-5 space-y-4 border-t border-[#F3F5F7]">
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-[#9BAFC4] mb-0.5">Company website</p>
                <a href={sub.company_website} target="_blank" rel="noopener noreferrer" className="text-[#1A6B4A] hover:underline truncate block">
                  {sub.company_website}
                </a>
              </div>
              {sub.company_logo_url && (
                <div>
                  <p className="text-xs text-[#9BAFC4] mb-0.5">Logo URL</p>
                  <a href={sub.company_logo_url} target="_blank" rel="noopener noreferrer" className="text-[#1A6B4A] hover:underline truncate block">
                    {sub.company_logo_url}
                  </a>
                </div>
              )}
              <div>
                <p className="text-xs text-[#9BAFC4] mb-0.5">Application URL</p>
                <a href={sub.application_url} target="_blank" rel="noopener noreferrer" className="text-[#1A6B4A] hover:underline truncate block">
                  {sub.application_url}
                </a>
              </div>
            </div>

            <div>
              <p className="text-xs text-[#9BAFC4] mb-1">Job description</p>
              <p className="text-sm text-[#374151] whitespace-pre-wrap bg-[#F8FAFC] rounded-lg p-3 border border-[#E5E7EB]">
                {sub.description}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [actionLoading, setActionLoading] = useState<ActionLoading>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email === ADMIN_EMAIL) {
        setIsAdmin(true)
        fetchSubmissions()
      }
      setAuthChecked(true)
    })
  }, [])

  async function fetchSubmissions() {
    setLoadingData(true)
    const { data, error: err } = await supabase
      .from('submissions')
      .select('*')
      .order('submitted_at', { ascending: false })
    setLoadingData(false)
    if (err) {
      setError('Failed to load submissions: ' + err.message)
      return
    }
    setSubmissions((data as Submission[]) ?? [])
  }

  async function handleConfirmPayment(sub: Submission) {
    setActionLoading({ id: sub.id, action: 'payment' })
    const { error: err } = await supabase
      .from('submissions')
      .update({ payment_status: 'confirmed' })
      .eq('id', sub.id)
    setActionLoading(null)
    if (err) { setError(err.message); return }
    fetchSubmissions()
  }

  async function handleApprove(sub: Submission) {
    setActionLoading({ id: sub.id, action: 'approve' })

    // Find or create company
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .ilike('name', sub.company_name)
      .maybeSingle()

    let companyId: string

    if (existing) {
      companyId = existing.id
    } else {
      const { data: newCo, error: coErr } = await supabase
        .from('companies')
        .insert({
          name: sub.company_name,
          website: sub.company_website,
          logo_url: sub.company_logo_url,
          pakistan_friendly: true,
        })
        .select('id')
        .single()
      if (coErr) { setActionLoading(null); setError('Company create failed: ' + coErr.message); return }
      companyId = newCo.id
    }

    // Insert listing
    const today = new Date().toISOString().split('T')[0]
    const { data: listing, error: listErr } = await supabase
      .from('listings')
      .insert({
        title: sub.title,
        seniority: sub.seniority,
        location_type: 'remote',
        region_eligibility: sub.region_eligibility,
        category: sub.category,
        tags: null,
        salary_range: sub.salary_range,
        short_summary: sub.description.slice(0, 500),
        original_url: sub.application_url,
        date_posted: today,
        date_added: new Date().toISOString(),
        verified: true,
        is_active: true,
        source: 'employer_submitted',
        company_id: companyId,
      })
      .select('id')
      .single()
    if (listErr) { setActionLoading(null); setError('Listing create failed: ' + listErr.message); return }

    // Update submission
    const { error: subErr } = await supabase
      .from('submissions')
      .update({
        approval_status: 'approved',
        listing_id: listing.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', sub.id)

    setActionLoading(null)
    if (subErr) { setError('Submission update failed: ' + subErr.message); return }
    fetchSubmissions()
  }

  async function handleReject(sub: Submission) {
    if (!confirm(`Reject "${sub.title}" from ${sub.company_name}?`)) return
    setActionLoading({ id: sub.id, action: 'reject' })
    const { error: err } = await supabase
      .from('submissions')
      .update({ approval_status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', sub.id)
    setActionLoading(null)
    if (err) { setError(err.message); return }
    fetchSubmissions()
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
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="text-sm text-[#1A6B4A] hover:underline font-medium"
        >
          Sign in →
        </button>
      </div>
    )
  }

  const pending = submissions.filter(
    (s) => s.payment_status === 'pending' && s.approval_status === 'pending'
  )
  const readyToReview = submissions.filter(
    (s) => s.payment_status === 'confirmed' && s.approval_status === 'pending'
  )
  const approved = submissions.filter((s) => s.approval_status === 'approved')
  const rejected = submissions.filter((s) => s.approval_status === 'rejected')

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#111827] mb-1">Admin — Submissions</h1>
        <p className="text-sm text-[#6B7A8D]">Review and publish employer job submissions.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total', value: submissions.length, color: 'text-[#111827]' },
          { label: 'Awaiting payment', value: pending.length, color: 'text-amber-600' },
          { label: 'Ready to review', value: readyToReview.length, color: 'text-blue-600' },
          { label: 'Approved', value: approved.length, color: 'text-emerald-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-[#D1D9E0] p-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-[#6B7A8D] mt-0.5">{stat.label}</p>
          </div>
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

      {!loadingData && submissions.length === 0 && (
        <div className="text-center py-16 text-[#6B7A8D] text-sm">
          No submissions yet.
        </div>
      )}

      {/* Ready to review first, then pending payment, then approved/rejected */}
      {!loadingData && (
        <div className="space-y-4">
          {[...readyToReview, ...pending, ...approved, ...rejected].map((sub) => (
            <SubmissionCard
              key={sub.id}
              sub={sub}
              actionLoading={actionLoading}
              onConfirmPayment={handleConfirmPayment}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  )
}
