import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Metadata } from 'next'
import { CompanyLogo } from '@/components/CompanyLogo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Companies — Remote Jobs PK',
  description: 'Browse companies hiring remote talent from Pakistan.',
}

async function getCompaniesWithCounts() {
  const [{ data: companies }, { data: listings }] = await Promise.all([
    supabase.from('companies').select('id, name, logo_url, industry, website, pakistan_friendly').order('name'),
    supabase.from('listings').select('company_id').eq('is_active', true),
  ])

  const counts: Record<string, number> = {}
  for (const l of listings ?? []) {
    counts[l.company_id] = (counts[l.company_id] ?? 0) + 1
  }

  return (companies ?? []).map((c) => ({ ...c, listing_count: counts[c.id] ?? 0 }))
}

export default async function CompaniesPage() {
  const companies = await getCompaniesWithCounts()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight mb-1">
          Companies hiring remotely
        </h1>
        <p className="text-[#6B7A8D] text-sm">
          {companies.length} companies with open roles — all verified Pakistan-friendly employers.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {companies.map((company) => (
          <Link
            key={company.id}
            href={`/?company=${encodeURIComponent(company.name)}`}
            className="bg-white rounded-xl border border-[#D1D9E0] p-5 hover:border-[#9BAFC4] hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-4">
              <CompanyLogo
                name={company.name}
                logoUrl={company.logo_url}
                size={52}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-[#111827] text-base group-hover:text-[#1A6B4A] transition-colors leading-tight">
                    {company.name}
                  </h2>
                  {company.pakistan_friendly && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8F5EF] text-[#1A6B4A] border border-[#B6DFD0] text-xs font-semibold">
                      <svg
                        width="9"
                        height="9"
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
                      PK Friendly
                    </span>
                  )}
                </div>
                {company.industry && (
                  <p className="text-xs text-[#6B7A8D] mt-0.5">{company.industry}</p>
                )}
                <p className="text-xs text-[#6B7A8D] mt-2 font-medium">
                  {company.listing_count === 0
                    ? 'No open roles'
                    : company.listing_count === 1
                    ? '1 open role'
                    : `${company.listing_count} open roles`}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
