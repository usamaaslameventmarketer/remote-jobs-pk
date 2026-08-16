/**
 * Ingestion pipeline — Remotive, Arbeitnow, RemoteOK
 *
 * Three-stage filter:
 *   1. Region filter  — reject explicit single-country restrictions
 *   2. Quality filter — reject obvious low-skill/spam roles via title keywords
 *   3. Claude pass    — borderline listings (no clear quality signal) go to
 *                       claude-haiku-4-5 for a final include/exclude verdict
 *
 * Usage: node ingest.mjs
 * Safe to rerun — deduplicates by original_url.
 */

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = 'https://disouyodepqsbsmomkzj.supabase.co'
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpc291eW9kZXBxc2JzbW9ta3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUyODk5NywiZXhwIjoyMTAyMTA0OTk3fQ.Li4QdLi09i65chPFN5pbX3RQVn0iAkLO3eFhZ8cFWXk'

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null

// ---------------------------------------------------------------------------
// Stage 1 — Region filter
// ---------------------------------------------------------------------------

// Phrases that confirm a listing is genuinely globally accessible
const REGION_ALLOW = [
  'worldwide', 'global', 'anywhere', 'international', 'remote',
  'apac', 'emea', 'south asia', 'pakistan', 'latin america',
  'developing countries', 'emerging markets', 'any country', 'all countries',
]

// Patterns that indicate a single-country restriction
const REGION_REJECT = [
  /\b(must be|need to be|you('re| are) expected to be)\s+(based|located|residing?|resident)\s+in\b/i,
  /\bright\s+to\s+work\s+in\b/i,
  /\beligib(le|ility)\s+to\s+work\s+in\b/i,
  /\bwork\s+(authoriz|permit|visa)\s+(required|needed)\s+in\b/i,
  /\b(uk|united kingdom|great britain)\s+(only|residents?|based|citizens?)\b/i,
  /\b(us|usa|united states|america)\s+(only|residents?|based|citizens?)\b/i,
  /\b(eu|europe|european union)\s+(only|residents?|based|citizens?)\b/i,
  /\b(canada|australia|germany|france|netherlands)\s+(only|residents?|based|citizens?)\b/i,
  /\b(must|need to)\s+(live|reside|be located)\s+in\s+(the\s+)?(uk|us|eu|canada|australia|germany|france)\b/i,
]

function passesRegionFilter(location, description = '') {
  if (!location) return true

  const loc = location.toLowerCase()

  // Explicit allow phrases → definitely keep
  if (REGION_ALLOW.some((s) => loc.includes(s))) return true

  // Scan both location field and start of description for rejection language
  const text = (location + ' ' + (description || '').slice(0, 1000)).toLowerCase()
  if (REGION_REJECT.some((p) => p.test(text))) return false

  return true
}

// ---------------------------------------------------------------------------
// Stage 2 — Quality filter (deterministic keyword pass)
// ---------------------------------------------------------------------------

// Titles that clearly signal a quality professional role → fast-track include
const QUALITY_TITLE_RE =
  /engineer|developer|programmer|architect|scientist|analyst|designer|ux|ui\s|product\s(manager|owner|lead)|devops|sre|cloud|infrastructure|security|cyber|machine learning|mlops|nlp|backend|front.?end|full.?stack|mobile|ios|android|data\s(engineer|scientist|analyst)|marketing\s(manager|director|strategist|lead)|content\s(strategist|manager)|operations\s(manager|lead)|project\s+manager|program\s+manager|scrum|agile\s+coach|finance\s+manager|financial\s+analyst|accountant|qa\s+engineer|quality\s+engineer|technical\s+writer|growth\s+hacker|seo\s+manager|customer\s+success\s+manager|copywriter|brand\s+strategist|cto|cpo|vp\s+of/i

// Titles/categories that signal clearly low-skill or spam → fast-track exclude
const SPAM_TITLE_RE =
  /\bdata\s+entry\b|\btranscri(ption|ber)\b|\bclick.?worker\b|\bmicro.?task\b|\bcall\s+center\b|\bchatter\b|\bsurvey\s+(taker|completer)\b|\bform\s+filler\b|\bcaptcha\b|\bsocial\s+media\s+poster\b/i

// API category strings that are low-quality signals (Remotive / RemoteOK use these)
const SPAM_CATEGORY_RE =
  /\bdata\s+entry\b|\btranscription\b|\bcustomer\s+service\b|\bclerical\b|\badmin\s+assistant\b|\bvirtual\s+assistant\b/i

// Returns: 'include' | 'exclude' | 'borderline'
function qualityPass(title, tags = [], category = '') {
  if (SPAM_TITLE_RE.test(title)) return 'exclude'
  if (SPAM_CATEGORY_RE.test(category)) return 'exclude'
  // Tag-based spam check (RemoteOK tags)
  const tagStr = tags.join(' ')
  if (SPAM_CATEGORY_RE.test(tagStr)) return 'exclude'

  if (QUALITY_TITLE_RE.test(title)) return 'include'

  return 'borderline'
}

// ---------------------------------------------------------------------------
// Stage 3 — Claude classification for borderline listings
// ---------------------------------------------------------------------------

async function claudeClassify(listing) {
  if (!anthropic) return 'include' // no API key — skip Claude pass silently
  const prompt = `You are a filter for a remote job board targeting skilled Pakistani university graduates and experienced professionals.

Classify this job listing as exactly one of: "include" or "exclude"

INCLUDE if: genuine professional-grade remote role (software engineering, product, design, data/analytics, strategic marketing, operations, finance, PM, QA engineering, technical writing, cybersecurity, etc.) at a real company, open to worldwide or Pakistan-based applicants.

EXCLUDE if: low-skill or gig-style role (generic data entry, basic customer support with no specialization, transcription, micro-tasks, suspiciously vague employer), OR explicitly restricted to a single country that excludes Pakistan.

Title: ${listing.title}
Company: ${listing.company_name}
Region/Location: ${listing.region}
Tags: ${(listing.tags ?? []).join(', ')}
Description excerpt: ${(listing.short_summary ?? '').slice(0, 300)}

Reply with ONLY the word "include" or "exclude".`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: prompt }],
    })
    const verdict = msg.content[0].text.trim().toLowerCase()
    return verdict === 'include' ? 'include' : 'exclude'
  } catch (err) {
    console.error('  Claude classify error:', err.message)
    return 'include' // default to include on API error
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripHtml(html) {
  return (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500)
}

function deriveSeniority(title) {
  const t = title.toLowerCase()
  if (/senior|lead|principal|staff|\bhead of\b|\bvp\b|director/.test(t)) return 'senior'
  if (/junior|entry.?level|intern|graduate|associate|trainee/.test(t)) return 'entry'
  return 'mid'
}

function normalizeRegion(location) {
  if (!location) return 'Worldwide'
  const l = location.toLowerCase()
  if (!l || l.includes('worldwide') || l.includes('global') || l.includes('anywhere') || l === 'remote') return 'Worldwide'
  if (l.includes('pakistan')) return 'Pakistan'
  if (l.includes('south asia')) return 'South Asia'
  if (l.includes('apac') || l.includes('asia pacific')) return 'APAC'
  if (l.includes('emea')) return 'EMEA'
  if (l.includes('latin')) return 'Latin America'
  return location.slice(0, 60)
}

function brandFetchLogo(domain) {
  if (!domain) return null
  const d = domain.replace(/^https?:\/\//, '').split('/')[0]
  return `https://cdn.brandfetch.io/${d}/w/200/h/200`
}

// ---------------------------------------------------------------------------
// Company upsert
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
    .filter((j) => j.url)
    .map((j) => ({
      title: j.title,
      company_name: j.company_name,
      company_logo: j.company_logo_url || null,
      company_website: j.company_url || null,
      original_url: j.url,
      tags: (j.tags ?? []).slice(0, 8),
      category: j.category ?? '',
      location: j.candidate_required_location ?? '',
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
      original_url: j.url,
      tags: (j.tags ?? []).slice(0, 8),
      category: (j.tags ?? []).join(' '),
      location: '',
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

  return raw
    .slice(1)
    .filter((j) => j.position && j.url)
    .map((j) => ({
      title: j.position,
      company_name: j.company,
      company_logo: j.company_logo || null,
      company_website: null,
      original_url: j.url,
      tags: (j.tags ?? []).slice(0, 8),
      category: (j.tags ?? []).join(' '),
      location: j.location ?? '',
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
  // Load already-ingested URLs
  const { data: existing } = await sb.from('listings').select('original_url')
  const existingUrls = new Set((existing ?? []).map((r) => r.original_url))
  console.log(`DB has ${existingUrls.size} listings already\n`)

  // Fetch all sources
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
    console.log(`${source}: ${r.value.length} raw jobs`)
    return r.value
  })

  // Deduplicate by URL
  const seen = new Set(existingUrls)
  const newJobs = allJobs.filter((j) => {
    if (!j.original_url || seen.has(j.original_url)) return false
    seen.add(j.original_url)
    return true
  })
  console.log(`\n${newJobs.length} new (not yet in DB)\n`)

  // ── Stage 1: Region filter ────────────────────────────────────────────────
  const afterRegion = newJobs.filter((j) =>
    passesRegionFilter(j.location, j.short_summary),
  )
  const regionRejected = newJobs.length - afterRegion.length
  console.log(`Stage 1 (region):    ${afterRegion.length} pass, ${regionRejected} rejected`)

  // ── Stage 2: Quality filter ───────────────────────────────────────────────
  const include = []
  const borderline = []
  const qualityRejected = { count: 0 }

  for (const j of afterRegion) {
    const verdict = qualityPass(j.title, j.tags, j.category)
    if (verdict === 'include') include.push(j)
    else if (verdict === 'borderline') borderline.push(j)
    else qualityRejected.count++
  }
  console.log(
    `Stage 2 (quality):   ${include.length} include, ${borderline.length} borderline, ${qualityRejected.count} rejected`,
  )

  // ── Stage 3: Claude pass on borderline ───────────────────────────────────
  let claudeIncluded = 0
  let claudeExcluded = 0

  if (borderline.length > 0) {
    if (!anthropic) {
      console.log(`Stage 3 (Claude):    skipped (no ANTHROPIC_API_KEY) — ${borderline.length} borderline listings included by default`)
      include.push(...borderline)
    } else {
      console.log(`\nStage 3 (Claude):    classifying ${borderline.length} borderline listings...`)
      for (const j of borderline) {
        const verdict = await claudeClassify({
          title: j.title,
          company_name: j.company_name,
          region: normalizeRegion(j.location),
          tags: j.tags,
          short_summary: j.short_summary,
        })
        if (verdict === 'include') {
          include.push(j)
          claudeIncluded++
        } else {
          claudeExcluded++
        }
      }
      console.log(`  Claude: ${claudeIncluded} included, ${claudeExcluded} excluded`)
    }
  }

  const totalRejected = regionRejected + qualityRejected.count + claudeExcluded
  console.log(`\nFinal: ${include.length} to insert, ${totalRejected} total rejected`)

  if (include.length === 0) {
    console.log('Nothing to insert.')
    return
  }

  // ── Insert ────────────────────────────────────────────────────────────────
  let inserted = 0
  let failed = 0

  for (const job of include) {
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
      region_eligibility: normalizeRegion(job.location),
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
  console.log(`Rejection breakdown: ${regionRejected} region | ${qualityRejected.count} quality keywords | ${claudeExcluded} Claude`)
}

ingest().catch(console.error)
