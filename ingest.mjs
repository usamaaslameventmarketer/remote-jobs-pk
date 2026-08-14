/**
 * Ingestion pipeline — fetches remote jobs from Remotive, Arbeitnow, and RemoteOK
 * and upserts them into Supabase.
 *
 * Usage: node ingest.mjs
 *
 * Safe to run repeatedly — deduplicates by original_url.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://disouyodepqsbsmomkzj.supabase.co'
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpc291eW9kZXBxc2JzbW9ta3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUyODk5NywiZXhwIjoyMTAyMTA0OTk3fQ.Li4QdLi09i65chPFN5pbX3RQVn0iAkLO3eFhZ8cFWXk'

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripHtml(html) {
  return (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500)
}

function deriveSeniority(title) {
  const t = title.toLowerCase()
  if (/senior|lead|principal|staff|head of|\bvp\b|director|manager/.test(t)) return 'senior'
  if (/junior|entry.level|intern|graduate|associate|trainee/.test(t)) return 'entry'
  return 'mid'
}

/**
 * Returns false if the location string explicitly restricts to a region
 * that excludes Pakistan (US-only, EU-only, etc.).
 */
function isEligible(location) {
  if (!location) return true
  const l = location.toLowerCase()
  return !/\b(us|usa|united states|eu|europe|uk|united kingdom|canada|australia)\s+only\b/.test(l)
}

function normalizeRegion(location) {
  if (!location) return 'Worldwide'
  const l = location.toLowerCase()
  if (l.includes('worldwide') || l.includes('global') || l.includes('anywhere') || l === 'remote') return 'Worldwide'
  if (l.includes('pakistan')) return 'Pakistan'
  if (l.includes('south asia')) return 'South Asia'
  if (l.includes('asia') || l.includes('apac')) return 'APAC'
  if (l.includes('emea')) return 'EMEA'
  // Return as-is but cap length
  return location.slice(0, 60)
}

function brandFetchLogo(domain) {
  if (!domain) return null
  const d = domain.replace(/^https?:\/\//, '').split('/')[0]
  return `https://cdn.brandfetch.io/${d}/w/200/h/200`
}

// ---------------------------------------------------------------------------
// Company upsert — get existing or create new, return id
// ---------------------------------------------------------------------------

const companyCache = {}

async function upsertCompany({ name, logo_url, website }) {
  if (companyCache[name]) return companyCache[name]

  const { data: existing } = await sb
    .from('companies')
    .select('id')
    .eq('name', name)
    .maybeSingle()

  if (existing) {
    companyCache[name] = existing.id
    return existing.id
  }

  const domain = website?.replace(/^https?:\/\//, '').split('/')[0] ?? null
  const { data, error } = await sb
    .from('companies')
    .insert({
      name,
      logo_url: logo_url || brandFetchLogo(domain),
      website: website || null,
      industry: null,
      pakistan_friendly: false,
    })
    .select('id')
    .single()

  if (error) {
    console.error(`  Company insert failed (${name}):`, error.message)
    return null
  }

  companyCache[name] = data.id
  return data.id
}

// ---------------------------------------------------------------------------
// Fetch already-ingested URLs so we don't duplicate
// ---------------------------------------------------------------------------

async function getExistingUrls() {
  const { data } = await sb.from('listings').select('original_url')
  return new Set((data ?? []).map((r) => r.original_url))
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

async function fetchRemotive() {
  console.log('Fetching Remotive...')
  const res = await fetch('https://remotive.com/api/remote-jobs?limit=100', {
    headers: { 'User-Agent': 'RemoteJobsPK/1.0' },
  })
  if (!res.ok) throw new Error(`Remotive HTTP ${res.status}`)
  const { jobs } = await res.json()

  return jobs
    .filter((j) => j.url && isEligible(j.candidate_required_location))
    .map((j) => ({
      title: j.title,
      company_name: j.company_name,
      company_logo: j.company_logo_url || null,
      company_website: j.company_url || null,
      original_url: j.url,                          // ← specific job URL
      tags: (j.tags ?? []).slice(0, 8),
      region: normalizeRegion(j.candidate_required_location),
      salary_range: j.salary || null,
      short_summary: stripHtml(j.description),
      date_posted: j.publication_date?.split('T')[0] ?? null,
      seniority: deriveSeniority(j.title),
    }))
}

async function fetchArbeitnow() {
  console.log('Fetching Arbeitnow...')
  const res = await fetch('https://www.arbeitnow.com/api/job-board-api', {
    headers: { 'User-Agent': 'RemoteJobsPK/1.0' },
  })
  if (!res.ok) throw new Error(`Arbeitnow HTTP ${res.status}`)
  const { data: jobs } = await res.json()

  return jobs
    .filter((j) => j.url && j.remote)
    .map((j) => ({
      title: j.title,
      company_name: j.company_name,
      company_logo: null,
      company_website: null,
      original_url: j.url,                          // ← specific job URL
      tags: (j.tags ?? []).slice(0, 8),
      region: 'Worldwide',
      salary_range: null,
      short_summary: stripHtml(j.description),
      date_posted: j.created_at
        ? new Date(j.created_at * 1000).toISOString().split('T')[0]
        : null,
      seniority: deriveSeniority(j.title),
    }))
}

async function fetchRemoteOK() {
  console.log('Fetching RemoteOK...')
  const res = await fetch('https://remoteok.com/api', {
    headers: { 'User-Agent': 'RemoteJobsPK/1.0 (remotejobs.pk)' },
  })
  if (!res.ok) throw new Error(`RemoteOK HTTP ${res.status}`)
  const raw = await res.json()
  const jobs = raw.slice(1) // first element is API metadata

  return jobs
    .filter((j) => j.position && j.url && isEligible(j.location))
    .map((j) => ({
      title: j.position,
      company_name: j.company,
      company_logo: j.company_logo || null,
      company_website: null,
      original_url: j.url,                          // ← specific job URL
      tags: (j.tags ?? []).slice(0, 8),
      region: normalizeRegion(j.location),
      salary_range: j.salary_min
        ? `$${Number(j.salary_min).toLocaleString()}–$${Number(j.salary_max).toLocaleString()}/yr`
        : null,
      short_summary: stripHtml(j.description),
      date_posted: j.date?.split('T')[0] ?? null,
      seniority: deriveSeniority(j.position),
    }))
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function ingest() {
  const existingUrls = await getExistingUrls()
  console.log(`Already have ${existingUrls.size} listings in DB`)

  // Fetch all sources — continue if one fails
  const results = await Promise.allSettled([
    fetchRemotive(),
    fetchArbeitnow(),
    fetchRemoteOK(),
  ])

  const allJobs = results.flatMap((r, i) => {
    const source = ['Remotive', 'Arbeitnow', 'RemoteOK'][i]
    if (r.status === 'rejected') {
      console.error(`${source} failed:`, r.reason.message)
      return []
    }
    console.log(`${source}: ${r.value.length} eligible jobs`)
    return r.value
  })

  // Deduplicate by URL (across sources and against DB)
  const seen = new Set(existingUrls)
  const newJobs = allJobs.filter((j) => {
    if (!j.original_url || seen.has(j.original_url)) return false
    seen.add(j.original_url)
    return true
  })

  console.log(`\n${newJobs.length} new jobs to insert`)
  if (newJobs.length === 0) {
    console.log('Nothing to do.')
    return
  }

  let inserted = 0
  let failed = 0

  for (const job of newJobs) {
    const company_id = await upsertCompany({
      name: job.company_name,
      logo_url: job.company_logo,
      website: job.company_website,
    })
    if (!company_id) { failed++; continue }

    const { error } = await sb.from('listings').insert({
      title: job.title,
      seniority: job.seniority,
      location_type: 'remote',
      region_eligibility: job.region,
      tags: job.tags,
      salary_range: job.salary_range,
      short_summary: job.short_summary || 'No description available.',
      original_url: job.original_url,
      date_posted: job.date_posted,
      verified: false,
      is_active: true,
      date_added: new Date().toISOString(),
      company_id,
    })

    if (error) {
      console.error(`  Insert failed (${job.title}):`, error.message)
      failed++
    } else {
      inserted++
      if (inserted % 10 === 0) process.stdout.write(`  ${inserted} inserted...\n`)
    }
  }

  console.log(`\nDone. Inserted: ${inserted}, Failed: ${failed}`)
}

ingest().catch(console.error)
