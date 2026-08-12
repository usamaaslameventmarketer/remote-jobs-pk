import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

async function getListing(id: string) {
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
      original_url,
      date_posted,
      date_added,
      verified,
      companies (
        id,
        name,
        logo_url,
        website,
        industry,
        pakistan_friendly
      )
    `)
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return data
}

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  const listing = await getListing(params.id)
  if (!listing) return { title: 'Job Not Found' }

  const company = Array.isArray(listing.companies)
    ? listing.companies[0]
    : listing.companies

  return {
    title: `${listing.title} at ${company?.name ?? 'Unknown'} — Remote Jobs PK`,
    description: listing.short_summary,
  }
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

export default async function ListingDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const listing = await getListing(params.id)
  if (!listing) notFound()

  const company = Array.isArray(listing.companies)
    ? listing.companies[0]
    : listing.companies

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link
            href="/"
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Back to all jobs
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-4">
            {company?.logo_url && (
              <img
                src={company.logo_url}
                alt={company.name}
                className="w-10 h-10 rounded-lg object-contain border border-gray-100"
              />
            )}
            <div>
              <p className="font-semibold text-gray-900">{company?.name ?? 'Unknown Company'}</p>
              {company?.industry && (
                <p className="text-sm text-gray-500">{company.industry}</p>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">{listing.title}</h1>

          <div className="flex flex-wrap gap-2 mb-6">
            <span
              className={`text-sm px-3 py-1 rounded-full font-medium ${
                seniorityColor[listing.seniority] ?? 'bg-gray-100 text-gray-700'
              }`}
            >
              {listing.seniority}
            </span>
            <span
              className={`text-sm px-3 py-1 rounded-full font-medium ${
                locationColor[listing.location_type] ?? 'bg-gray-100 text-gray-700'
              }`}
            >
              {listing.location_type}
            </span>
            <span className="text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-700">
              {listing.region_eligibility}
            </span>
            {listing.verified && (
              <span className="text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                ✓ Verified
              </span>
            )}
            {listing.salary_range && (
              <span className="text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                {listing.salary_range}
              </span>
            )}
          </div>

          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              About this role
            </h2>
            <p className="text-gray-700 leading-relaxed">{listing.short_summary}</p>
          </div>

          {listing.tags?.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Skills &amp; Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {listing.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="text-sm px-3 py-1 rounded-full bg-indigo-50 text-indigo-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mb-8 text-sm text-gray-500 space-y-1">
            {listing.date_posted && (
              <p>Posted: {new Date(listing.date_posted).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            )}
            {company?.website && (
              <p>
                Company:{' '}
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  {company.website}
                </a>
              </p>
            )}
            {company?.pakistan_friendly && (
              <p className="text-green-700 font-medium">Pakistan-friendly employer</p>
            )}
          </div>

          <a
            href={listing.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Apply Now →
          </a>
        </div>
      </div>
    </main>
  )
}
