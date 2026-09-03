import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { CompanyLogo } from '@/components/CompanyLogo'

export const dynamic = 'force-dynamic'

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
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const listing = await getListing(id)
  if (!listing) return { title: 'Job Not Found' }

  const company = Array.isArray(listing.companies)
    ? listing.companies[0]
    : listing.companies

  return {
    title: `${listing.title} at ${company?.name ?? 'Unknown'} — Earn Remotely`,
    description: listing.short_summary,
  }
}

const seniorityLabel: Record<string, string> = {
  entry: 'Entry-level',
  mid: 'Mid-level',
  senior: 'Senior',
}

const seniorityStyle: Record<string, string> = {
  entry: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  mid: 'bg-blue-50 text-blue-700 border-blue-200',
  senior: 'bg-violet-50 text-violet-700 border-violet-200',
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const listing = await getListing(id)
  if (!listing) notFound()

  const company = Array.isArray(listing.companies)
    ? listing.companies[0]
    : listing.companies

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 pb-28 md:pb-10">
        {/* Breadcrumb */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#6B7A8D] hover:text-[#1A6B4A] transition-colors font-medium mb-8"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          All jobs
        </Link>

        <div className="bg-white rounded-xl border border-[#D1D9E0] overflow-hidden">
          {/* Company header bar */}
          <div className="px-6 sm:px-8 pt-7 pb-6 border-b border-[#F3F5F7]">
            <div className="flex items-center gap-3 mb-5">
              <CompanyLogo
                name={company?.name ?? '?'}
                logoUrl={company?.logo_url}
                size={52}
              />
              <div>
                <p className="font-semibold text-[#111827] text-base leading-tight">
                  {company?.name ?? 'Unknown Company'}
                </p>
                {company?.industry && (
                  <p className="text-sm text-[#6B7A8D] mt-0.5">{company.industry}</p>
                )}
                {company?.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#1A6B4A] hover:underline mt-0.5 inline-block"
                  >
                    {company.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-[#111827] leading-snug mb-4">
              {listing.title}
            </h1>

            {/* Badge row */}
            <div className="flex flex-wrap gap-2 items-center">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                  seniorityStyle[listing.seniority] ??
                  'bg-gray-100 text-gray-700 border-gray-200'
                }`}
              >
                {seniorityLabel[listing.seniority] ?? listing.seniority}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#F0FAFB] text-[#0F766E] border border-[#99D6D1] font-medium">
                {listing.location_type}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#F3F5F7] text-[#6B7A8D] border border-[#D1D9E0]">
                {listing.region_eligibility}
              </span>
              {listing.verified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E8F5EF] text-[#1A6B4A] border border-[#B6DFD0] text-xs font-semibold">
                  <svg
                    width="11"
                    height="11"
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
                  Verified by Earn Remotely
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="px-6 sm:px-8 py-6 space-y-7">
            {/* Salary */}
            {listing.salary_range && (
              <div className="inline-flex items-center gap-3 px-4 py-3 bg-[#F3F5F7] rounded-lg border border-[#D1D9E0]">
                <span className="text-xs text-[#6B7A8D] font-medium uppercase tracking-wide">
                  Salary
                </span>
                <span className="text-lg font-bold text-[#111827]">
                  {listing.salary_range}
                </span>
              </div>
            )}

            {/* Pakistan-friendly callout */}
            {company?.pakistan_friendly && (
              <div className="flex items-center gap-2 px-4 py-3 bg-[#E8F5EF] rounded-lg border border-[#B6DFD0]">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1A6B4A"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
                <p className="text-sm text-[#1A6B4A] font-medium">
                  Pakistan-friendly employer — has hired from Pakistan before.
                </p>
              </div>
            )}

            {/* About */}
            <div>
              <h2 className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-3">
                About this role
              </h2>
              <p className="text-[#111827] leading-relaxed text-sm sm:text-base">
                {listing.short_summary}
              </p>
            </div>

            {/* Skills */}
            {listing.tags?.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-[#6B7A8D] uppercase tracking-widest mb-3">
                  Skills &amp; Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {listing.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="text-sm px-3 py-1 rounded-full bg-[#F0F4FF] text-[#3B4FBB] border border-[#C7D2FE]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="text-xs text-[#6B7A8D] pt-2 border-t border-[#F3F5F7] space-y-1">
              {listing.date_posted && (
                <p>
                  Posted{' '}
                  {new Date(listing.date_posted).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>

            {/* Desktop apply CTA */}
            <a
              href={listing.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex w-full items-center justify-center bg-[#1A6B4A] hover:bg-[#155a3d] text-white font-semibold py-3.5 px-6 rounded-lg transition-colors text-sm"
            >
              Apply Now →
            </a>
          </div>
        </div>
      </div>

      {/* Sticky mobile apply CTA */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-white border-t border-[#D1D9E0] md:hidden z-40">
        <a
          href={listing.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-[#1A6B4A] hover:bg-[#155a3d] text-white font-semibold py-3.5 px-6 rounded-lg transition-colors text-sm"
        >
          Apply Now →
        </a>
      </div>
    </>
  )
}
