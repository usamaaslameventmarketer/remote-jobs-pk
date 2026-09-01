import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Suspense } from 'react'
import { SearchBar } from '@/components/SearchBar'
import { FilterBar } from '@/components/FilterBar'
import { ListingGrid } from '@/components/ListingGrid'

export const dynamic = 'force-dynamic'

async function getListings({
  seniority,
  region,
  category,
}: {
  seniority?: string
  region?: string
  category?: string
}) {
  let query = supabase
    .from('listings')
    .select(`
      id,
      title,
      seniority,
      location_type,
      region_eligibility,
      category,
      tags,
      salary_range,
      short_summary,
      date_added,
      verified,
      source,
      featured,
      featured_until,
      companies (
        id,
        name,
        logo_url,
        industry
      )
    `)
    .eq('is_active', true)
    .order('date_added', { ascending: false })
    .range(0, 4999)

  if (seniority) query = query.eq('seniority', seniority)
  if (region) query = query.eq('region_eligibility', region)
  if (category) query = query.eq('category', category)

  const { data, error } = await query

  if (error) {
    console.error('Error fetching listings:', error)
    return []
  }
  return data || []
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="text-center py-20">
      <div className="w-12 h-12 rounded-full bg-white border border-[#D1D9E0] flex items-center justify-center mx-auto mb-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7A8D" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </div>
      {hasFilters ? (
        <>
          <p className="text-[#111827] font-medium mb-1">No listings match your search</p>
          <p className="text-sm text-[#6B7A8D]">Try adjusting your filters or search terms.</p>
          <Link href="/" className="mt-4 inline-block text-sm text-[#1A6B4A] hover:underline font-medium">
            Clear filters
          </Link>
        </>
      ) : (
        <>
          <p className="text-[#111827] font-medium mb-1">New listings being reviewed</p>
          <p className="text-sm text-[#6B7A8D]">We manually vet every role before it goes live. Check back daily.</p>
        </>
      )}
    </div>
  )
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; seniority?: string; region?: string; category?: string }>
}) {
  const { q, seniority, region, category } = await searchParams

  const listings = await getListings({ seniority, region, category })

  const filtered = q
    ? listings.filter((l) => {
        const s = q.toLowerCase()
        const co = Array.isArray(l.companies) ? l.companies[0] : l.companies
        return (
          l.title.toLowerCase().includes(s) ||
          co?.name?.toLowerCase().includes(s) ||
          l.tags?.some((t: string) => t.toLowerCase().includes(s))
        )
      })
    : listings

  const hasFilters = !!(q || seniority || region || category)

  // Pin active featured listings to the top; preserve DB order (date_added desc) within each group
  const today = new Date().toISOString().split('T')[0]
  const sorted = [...filtered].sort((a, b) => {
    const aF = (a as any).featured && (a as any).featured_until >= today ? 1 : 0
    const bF = (b as any).featured && (b as any).featured_until >= today ? 1 : 0
    return bF - aF
  })

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
        <div className="mb-5">
          <FilterBar
            region={region ?? ''}
            category={category ?? ''}
            seniority={seniority ?? ''}
            q={q ?? ''}
          />
        </div>

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

        {filtered.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <ListingGrid listings={sorted as any} />
        )}
      </div>
    </>
  )
}
