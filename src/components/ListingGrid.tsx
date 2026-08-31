'use client'

import Link from 'next/link'
import { CompanyLogo } from './CompanyLogo'

const FREE_COUNT = 5

type CompanyRow = {
  id: string
  name: string
  logo_url: string | null
  industry: string | null
}

export type ListingRow = {
  id: string
  title: string
  seniority: string
  location_type: string
  region_eligibility: string
  category: string
  tags: string[] | null
  salary_range: string | null
  short_summary: string | null
  date_added: string
  verified: boolean
  companies: CompanyRow | CompanyRow[] | null
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8F5EF] text-[#1A6B4A] border border-[#B6DFD0] text-xs font-semibold">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
      Verified
    </span>
  )
}

function HiresFromPakistanBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#054F2B] text-white text-xs font-semibold">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      Hires from Pakistan
    </span>
  )
}

function SeniorityBadge({ seniority }: { seniority: string }) {
  const styles: Record<string, string> = {
    entry: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    mid: 'bg-blue-50 text-blue-700 border-blue-200',
    senior: 'bg-violet-50 text-violet-700 border-violet-200',
  }
  const labels: Record<string, string> = {
    entry: 'Entry-level',
    mid: 'Mid-level',
    senior: 'Senior',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${styles[seniority] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {labels[seniority] ?? seniority}
    </span>
  )
}

function JobCard({ listing }: { listing: ListingRow }) {
  const company = Array.isArray(listing.companies) ? listing.companies[0] : listing.companies
  const isWorldwide = listing.region_eligibility === 'Worldwide'

  return (
    <Link href={`/listings/${listing.id}`}>
      <article className="bg-white rounded-xl border border-[#D1D9E0] p-4 sm:p-5 hover:border-[#9BAFC4] hover:shadow-sm transition-all cursor-pointer group">
        <div className="flex gap-4">
          <CompanyLogo name={company?.name ?? '?'} logoUrl={company?.logo_url} size={48} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-xs text-[#6B7A8D] font-medium uppercase tracking-wide">
                  {company?.name ?? 'Unknown Company'}
                </p>
                <h2 className="text-base font-semibold text-[#111827] mt-0.5 group-hover:text-[#1A6B4A] transition-colors leading-snug">
                  {listing.title}
                  {isWorldwide && <span className="font-normal text-[#1A6B4A]"> — Remote from Anywhere</span>}
                </h2>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {isWorldwide && <HiresFromPakistanBadge />}
                {listing.verified && <VerifiedBadge />}
                {listing.salary_range && (
                  <span className="text-sm font-semibold text-[#111827] whitespace-nowrap">
                    {listing.salary_range}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <SeniorityBadge seniority={listing.seniority} />
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#F0FAFB] text-[#0F766E] border border-[#99D6D1] font-medium">
                {listing.location_type}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#F3F5F7] text-[#6B7A8D] border border-[#D1D9E0]">
                {listing.region_eligibility}
              </span>
              {listing.tags?.slice(0, 3).map((tag: string) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-[#F0F4FF] text-[#3B4FBB]">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}

function PaywallGate({ lockedCount }: { lockedCount: number }) {
  return (
    <div className="rounded-xl border-2 border-[#1A6B4A] bg-gradient-to-b from-[#F0FAF5] to-white p-7 text-center my-2">
      <div className="w-11 h-11 rounded-full bg-[#1A6B4A] flex items-center justify-center mx-auto mb-4">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-[#111827] mb-1">
        {lockedCount.toLocaleString()} more listings — subscriber only
      </h3>
      <p className="text-sm text-[#6B7A8D] mb-5 max-w-xs mx-auto">
        Every role is manually curated for Pakistan-based talent. Subscribe to unlock the full board.
      </p>
      <Link
        href="/pricing"
        className="inline-flex items-center gap-2 bg-[#1A6B4A] text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-[#155a3d] transition-colors"
      >
        Unlock full access — 2,000 PKR/month
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
      <p className="text-xs text-[#9BAFC4] mt-3">Payment coming soon — join the waitlist on the pricing page</p>
    </div>
  )
}

export function ListingGrid({ listings }: { listings: ListingRow[] }) {
  const free = listings.slice(0, FREE_COUNT)
  const locked = listings.slice(FREE_COUNT)

  if (listings.length === 0) return null

  return (
    <div className="space-y-3">
      {free.map((listing) => (
        <JobCard key={listing.id} listing={listing} />
      ))}

      {locked.length > 0 && (
        <>
          <PaywallGate lockedCount={locked.length} />

          {/* Blurred preview of locked listings */}
          <div className="relative overflow-hidden rounded-xl" style={{ maxHeight: '520px' }}>
            <div className="space-y-3 pointer-events-none select-none">
              {locked.slice(0, 6).map((listing, i) => (
                <div
                  key={listing.id}
                  style={{ filter: 'blur(5px)', opacity: Math.max(0.15, 1 - i * 0.18) }}
                >
                  <JobCard listing={listing} />
                </div>
              ))}
            </div>
            {/* Gradient fade */}
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-white pointer-events-none" />
          </div>
        </>
      )}
    </div>
  )
}
