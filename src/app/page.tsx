import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Suspense } from 'react'
import { CompanyLogo } from '@/components/CompanyLogo'
import { SearchBar } from '@/components/SearchBar'

export const dynamic = 'force-dynamic'

async function getListings() {
  const { data, error } = await supabase
    .from('listings')
    .select(`
      id,
      title,
      seniority,
      location_type,
      region_eligibility,
      tags,
      salary_range,
      short_summary,
      date_added,
      verified,
      companies (
        id,
        name,
        logo_url,
        industry
      )
    `)
    .eq('is_active', true)
    .order('date_added', { ascending: false })

  if (error) {
    console.error('Error fetching listings:', error)
    return []
  }
  return data || []
}

type Listing = Awaited<ReturnType<typeof getListings>>[number]

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8F5EF] text-[#1A6B4A] border border-[#B6DFD0] text-xs font-semibold">
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
      Verified
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
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
        styles[seniority] ?? 'bg-gray-100 text-gray-700 border-gray-200'
      }`}
    >
      {labels[seniority] ?? seniority}
    </span>
  )
}

function JobCard({ listing }: { listing: Listing }) {
  const company = Array.isArray(listing.companies)
    ? listing.companies[0]
    : listing.companies

  return (
    <Link href={`/listings/${listing.id}`}>
      <article className="bg-white rounded-xl border border-[#D1D9E0] p-4 sm:p-5 hover:border-[#9BAFC4] hover:shadow-sm transition-all cursor-pointer group">
        <div className="flex gap-4">
          <CompanyLogo
            name={company?.name ?? '?'}
            logoUrl={company?.logo_url}
            size={48}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-xs text-[#6B7A8D] font-medium uppercase tracking-wide">
                  {company?.name ?? 'Unknown Company'}
                </p>
                <h2 className="text-base font-semibold text-[#111827] mt-0.5 group-hover:text-[#1A6B4A] transition-colors leading-snug">
                  {listing.title}
                </h2>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
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
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-[#F0F4FF] text-[#3B4FBB]"
                >
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

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="text-center py-20">
      <div className="w-12 h-12 rounded-full bg-white border border-[#D1D9E0] flex items-center justify-center mx-auto mb-4">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6B7A8D"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </div>
      {hasFilters ? (
        <>
          <p className="text-[#111827] font-medium mb-1">
            No listings match your search
          </p>
          <p className="text-sm text-[#6B7A8D]">
            Try adjusting your filters or search terms.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm text-[#1A6B4A] hover:underline font-medium"
          >
            Clear filters
          </Link>
        </>
      ) : (
        <>
          <p className="text-[#111827] font-medium mb-1">
            New listings being reviewed
          </p>
          <p className="text-sm text-[#6B7A8D]">
            We manually vet every role before it goes live. Check back daily.
          </p>
        </>
      )}
    </div>
  )
}

const SENIORITY_FILTERS = [
  { label: 'All Levels', value: '' },
  { label: 'Entry-level', value: 'entry' },
  { label: 'Mid-level', value: 'mid' },
  { label: 'Senior', value: 'senior' },
]

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; seniority?: string }>
}) {
  const { q, seniority } = await searchParams
  const listings = await getListings()

  const filtered = listings.filter((l) => {
    if (seniority && l.seniority !== seniority) return false
    if (q) {
      const s = q.toLowerCase()
      const company = Array.isArray(l.companies) ? l.companies[0] : l.companies
      if (
        !l.title.toLowerCase().includes(s) &&
        !company?.name?.toLowerCase().includes(s) &&
        !l.tags?.some((t: string) => t.toLowerCase().includes(s))
      )
        return false
    }
    return true
  })

  const hasFilters = !!(q || seniority)

  return (
    <>
      {/* Search hero */}
      <div className="bg-white border-b border-[#D1D9E0]">
        <div className="max-w-4xl mx-auto px-4 py-10 sm:py-12 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight mb-2">
            Remote jobs for Pakistan-based talent
          </h1>
          <p className="text-[#6B7A8D] text-sm sm:text-base mb-7">
            Every listing manually reviewed — no scam postings, no dead links.
          </p>
          <Suspense>
            <SearchBar defaultValue={q} />
          </Suspense>
        </div>
      </div>

      {/* Filter + results */}
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* Seniority filter pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {SENIORITY_FILTERS.map(({ label, value }) => {
            const isActive = (seniority ?? '') === value
            const params = new URLSearchParams()
            if (q) params.set('q', q)
            if (value) params.set('seniority', value)
            return (
              <Link
                key={value}
                href={`/?${params.toString()}`}
                className={`text-sm px-4 py-1.5 rounded-full font-medium transition-colors ${
                  isActive
                    ? 'bg-[#111827] text-white'
                    : 'bg-white text-[#6B7A8D] border border-[#D1D9E0] hover:border-[#9BAFC4] hover:text-[#111827]'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {/* Results count */}
        <p className="text-sm text-[#6B7A8D] mb-4">
          {filtered.length}{' '}
          {filtered.length === 1 ? 'position' : 'positions'} found
          {hasFilters && ' — '}
          {hasFilters && (
            <Link href="/" className="text-[#1A6B4A] hover:underline">
              clear filters
            </Link>
          )}
        </p>

        {/* Card list */}
        {filtered.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <div className="space-y-3">
            {filtered.map((listing) => (
              <JobCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
