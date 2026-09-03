import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Suspense } from 'react'
import { SearchBar } from '@/components/SearchBar'
import { FilterBar } from '@/components/FilterBar'
import { ListingGrid } from '@/components/ListingGrid'
import { AlertSubscribe } from '@/components/AlertSubscribe'
import { CategoryBrowse } from '@/components/CategoryBrowse'
import { Testimonials } from '@/components/Testimonials'
import { Search, ExternalLink, DollarSign, ShieldCheck } from 'lucide-react'

export const revalidate = 60

const PAGE_SIZE = 50

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

const WHY_PROPS = [
  {
    Icon: Search,
    title: 'Hand-curated listings',
    desc: 'Every role is reviewed for quality and Pakistan eligibility.',
  },
  {
    Icon: ExternalLink,
    title: 'Direct apply links',
    desc: "No middlemen. Apply straight to the employer's ATS.",
  },
  {
    Icon: DollarSign,
    title: 'USD income',
    desc: 'Build a career at global companies and earn in hard currency.',
  },
  {
    Icon: ShieldCheck,
    title: 'Verified companies',
    desc: 'We verify company legitimacy before listing their roles.',
  },
]

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

  // Build pagination base href preserving active filters
  const filterParams = new URLSearchParams()
  if (q) filterParams.set('q', q)
  if (seniority) filterParams.set('seniority', seniority)
  if (region) filterParams.set('region', region)
  if (category) filterParams.set('category', category)
  const baseHref = filterParams.toString() ? `/?${filterParams.toString()}&` : '/?'
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <>
      {/* Hero section */}
      <div style={{ background: 'linear-gradient(135deg, #0F2137 0%, #1A3050 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 py-14 text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 bg-[#1A6B4A] text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
            <span>🇵🇰</span>
            <span>For Pakistan-based talent</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3 leading-tight">
            Find Remote Work at the World&apos;s Best Companies
          </h1>
          <p className="text-[#8AAEC8] text-sm sm:text-base leading-relaxed mb-7">
            Every listing manually curated. Direct application links. USD income.
          </p>

          <Suspense>
            <SearchBar defaultValue={q} />
          </Suspense>

          {/* Stats row */}
          <div className="mt-6 flex items-center justify-center gap-0 divide-x divide-[#1A3050]">
            <div className="px-5 py-2 text-center">
              <p className="text-lg font-bold text-[#1A6B4A]">{totalCount.toLocaleString()}+</p>
              <p className="text-xs text-[#8AAEC8]">Listings</p>
            </div>
            <div className="px-5 py-2 text-center">
              <p className="text-lg font-bold text-white">90+</p>
              <p className="text-xs text-[#8AAEC8]">Top Companies</p>
            </div>
            <div className="px-5 py-2 text-center">
              <p className="text-lg font-bold text-white">Every 6h</p>
              <p className="text-xs text-[#8AAEC8]">Updated</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3 flex-col sm:flex-row max-w-sm mx-auto">
            <AlertSubscribe />
          </div>
        </div>
      </div>

      {/* Category browse section */}
      <div className="bg-white py-10">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-xl font-bold text-[#111827] mb-6 flex items-center gap-2">
            Browse by Department
          </h2>
          <CategoryBrowse />
        </div>
      </div>

      {/* Filter + listings section */}
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
            page={page}
            totalPages={totalPages}
            baseHref={baseHref}
          />
        )}
      </div>

      {/* Testimonials section */}
      <Testimonials />

      {/* Why section */}
      <div className="bg-white py-14">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-[#111827] mb-8 text-center">
            Why Remote Jobs PK?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WHY_PROPS.map(({ Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center text-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#E8F5EF] flex items-center justify-center shrink-0">
                  <Icon size={20} className="text-[#1A6B4A]" aria-hidden="true" />
                </div>
                <p className="font-semibold text-[#111827] text-sm">{title}</p>
                <p className="text-xs text-[#6B7A8D] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
