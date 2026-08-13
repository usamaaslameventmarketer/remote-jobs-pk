import { supabase } from '@/lib/supabase'
import Link from 'next/link'

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

const seniorityColor: Record<string, string> = {
  entry: 'bg-green-100 text-green-800',
  mid: 'bg-blue-100 text-blue-800',
  senior: 'bg-purple-100 text-purple-800',
}

const locationColor: Record<string, string> = {
  remote: 'bg-teal-100 text-teal-800',
  hybrid: 'bg-yellow-100 text-yellow-800',
  onsite: 'bg-orange-100 text-orange-800',
}

export default async function HomePage() {
  const listings = await getListings()

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Remote Jobs PK</h1>
          <p className="mt-1 text-gray-500 text-sm">
            Curated remote opportunities for Pakistan-based talent — LUMS &amp; beyond
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {listings.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No listings yet. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{listings.length} open positions</p>
            {listings.map((listing) => {
              const company = Array.isArray(listing.companies)
                ? listing.companies[0]
                : listing.companies
              return (
                <Link key={listing.id} href={`/listings/${listing.id}`}>
                  <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-400 hover:shadow-sm transition-all cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {company?.logo_url && (
                            <img
                              src={company.logo_url}
                              alt={company?.name}
                              className="w-6 h-6 rounded object-contain"
                            />
                          )}
                          <span className="text-sm text-gray-500 font-medium">
                            {company?.name ?? 'Unknown Company'}
                          </span>
                          {listing.verified && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                              ✓ Verified
                            </span>
                          )}
                        </div>
                        <h2 className="text-base font-semibold text-gray-900 truncate">
                          {listing.title}
                        </h2>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {listing.short_summary}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          seniorityColor[listing.seniority] ?? 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {listing.seniority}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          locationColor[listing.location_type] ?? 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {listing.location_type}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {listing.region_eligibility}
                      </span>
                      {listing.salary_range && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {listing.salary_range}
                        </span>
                      )}
                      {listing.tags?.slice(0, 3).map((tag: string) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
