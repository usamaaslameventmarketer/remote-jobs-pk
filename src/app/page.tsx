import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Suspense } from 'react'
import { SearchBar } from '@/components/SearchBar'
import { FilterBar } from '@/components/FilterBar'
import { ListingGrid } from '@/components/ListingGrid'
import { AlertSubscribe } from '@/components/AlertSubscribe'

export const revalidate = 60

const PAGE_SIZE = 20

async function getListings({
  q,
  seniority,
  region,
  category,
  page,
}: {
  q?: string
  seniority?: string
  region?: string
  category?: string
  page: number
}) {
  const offset = page * PAGE_SIZE

  let query = supabase
    .from('listings')
    .select(`
      id,
      title,
      seniority,
      location_type,
      region_eligibility,
      region_confidence,
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
    `, { count: 'exact' })
    .eq('is_active', true)
    .order('date_added', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (q) query = query.ilike('title', `%${q}%`)
  if (seniority) query = query.eq('seniority', seniority)
  if (region) query = query.eq('region_eligibility', region)
  if (category) query = query.eq('category', category)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching listings:', error)
    return { listings: [], totalCount: 0 }
  }
  return { listings: data || [], totalCount: count ?? 0 }
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
  searchParams: Promise<{ q?: string; seniority?: string; region?: string; category?: string; page?: string }>
}) {
  const { q, seniority, region, category, page: pageStr } = await searchParams
  const page = Math.max(0, parseInt(pageStr ?? '0', 10) || 0)

  const { listings, totalCount } = await getListings({ q, seniority, region, category, page })

  const hasFilters = !!(q || seniority || region || category)

  // Sort order: featured → confirmed_open → unclear → restricted_other_region
  // Within each tier, preserve DB order (date_added desc)
  const today = new Date().toISOString().split('T')[0]
  const CONFIDENCE_RANK: Record<string, number> = {
    confirmed_open: 2,
    unclear: 1,
    restricted_other_region: 0,
  }
  const sorted = [...listings].sort((a, b) => {
    const aF = (a as any).featured && (a as any).featured_until >= today ? 1 : 0
    const bF = (b as any).featured && (b as any).featured_until >= today ? 1 : 0
    if (bF !== aF) return bF - aF
    const aC = CONFIDENCE_RANK[(a as any).region_confidence ?? 'unclear'] ?? 1
    const bC = CONFIDENCE_RANK[(b as any).region_confidence ?? 'unclear'] ?? 1
    return bC - aC
  })

  // Build pagination hrefs preserving active filters
  const filterParams = new URLSearchParams()
  if (q) filterParams.set('q', q)
  if (seniority) filterParams.set('seniority', seniority)
  if (region) filterParams.set('region', region)
  if (category) filterParams.set('category', category)
  const base = filterParams.toString() ? `/?${filterParams.toString()}&` : '/?'
  const hasMore = (page + 1) * PAGE_SIZE < totalCount
  const prevHref = page > 0 ? `${base}page=${page - 1}` : null
  const nextHref = hasMore ? `${base}page=${page + 1}` : null

  return (
    <>
      {/* Search hero */}
      <div className="bg-white border-b border-[#D1D9E0]">
        <div className="max-w-4xl mx-auto px-4 py-10 sm:py-12 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight mb-3">
            Carefully curated remote jobs for Pakistani talent
          </h1>
          <p className="text-[#6B7A8D] text-sm sm:text-base leading-relaxed mb-7">
            Earn in USD from the comfort of home.<br className="hidden sm:block" />{' '}
            Build a career at reputable global companies.
          </p>
          <Suspense>
            <SearchBar defaultValue={q} />
          </Suspense>
          <div className="mt-5 flex items-center gap-3 flex-col sm:flex-row max-w-sm mx-auto">
            <AlertSubscribe />
          </div>
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
          {totalCount}{' '}
          {totalCount === 1 ? 'position' : 'positions'} found
          {hasFilters && ' — '}
          {hasFilters && (
            <Link href="/" className="text-[#1A6B4A] hover:underline">
              clear filters
            </Link>
          )}
        </p>

        {sorted.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <ListingGrid
            listings={sorted as any}
            totalCount={totalCount}
            prevHref={prevHref}
            nextHref={nextHref}
          />
        )}
      </div>
    </>
  )
}
