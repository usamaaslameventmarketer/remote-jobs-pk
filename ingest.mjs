/**
 * Ingestion pipeline — Remotive, Arbeitnow, RemoteOK, Himalayas, WorkingNomads,
 *                      Greenhouse, Lever
 *
 * Four-stage filter:
 *   0. Language filter  — reject non-English titles/descriptions
 *   1. Region filter    — 4-tier priority system (see classifyRegion)
 *                         Tier 1: Worldwide / Anywhere (no restriction)
 *                         Tier 3 approved: EMEA and APAC only.
 *                         Plain "Europe" / continent names alone → REJECT.
 *                         Single-country restrictions → REJECT.
 *                         Timezone-restricted descriptions → borderline (Claude)
 *   2. Category filter  — EXACTLY 6 allowed: Sales, Marketing, Software Dev,
 *                         HR, Legal, Finance. Everything else rejected.
 *   3. Claude pass      — borderline listings sent to claude-haiku with the
 *                         same 6-category + region rule as explicit instruction.
 *
 * Usage: ANTHROPIC_API_KEY=sk-... node ingest.mjs [--wipe]
 *   --wipe  Delete all rows from listings and companies before ingesting.
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

const WIPE = process.argv.includes('--wipe')

// ---------------------------------------------------------------------------
// Greenhouse / Lever seed list
// Add company slugs here as we identify more globally-remote employers.
// Each slug is tried independently; 404s are silently skipped.
// ---------------------------------------------------------------------------

const GREENHOUSE_SLUGS = [
  // Infrastructure / Cloud
  'stripe', 'datadog', 'mongodb', 'okta', 'canonical', 'cloudflare', 'elastic',
  'hashicorp', 'digitalocean', 'netlify', 'vercel', 'grafana', 'sentry',
  'confluent', 'cockroachdb', 'fastly', 'influxdata', 'newrelic',

  // Software / Dev tools
  'anthropic', 'gitlab', 'coinbase', 'figma', 'twilio', 'postman', 'dropbox',
  'airtable', 'contentful', 'sourcegraph', 'posthog', 'linear', 'algolia',
  'loom', 'squarespace', 'shopify', 'replit', 'crowdin', 'lokalise', 'miro',
  'webflow', 'coda', 'invision',

  // Data / Analytics / ML
  'databricks', 'airbyte', 'fivetran', 'hightouch', 'prefect', 'temporal',

  // Sales / Marketing / CRM
  'hubspot', 'zendesk', 'intercom', 'outreach', 'gong', 'salesloft', 'apollo',
  'pipedrive', 'klaviyo', 'braze', 'amplitude',
  'hootsuite', 'sproutsocial', 'iterable', 'activecampaign', 'drift',
  'aircall', 'pandadoc', 'sendbird', 'helpscout', 'close',

  // HR / People Ops
  'remote', 'deel', 'rippling', 'lattice', 'gusto', 'checkr',
  'personio', '15five', 'cultureamp', 'hibob',

  // Legal
  'ironclad', 'clio',

  // Finance
  'brex', 'robinhood', 'paddle', 'xero', 'chargebee', 'plaid',
  'nubank', 'wise', 'carta', 'pilot',

  // General / Other
  'asana', 'pagerduty', '1password', 'notion', 'scale',
  'freshworks', 'pluralsight',
]

const LEVER_SLUGS = [
  'toptal', 'canonical', 'zapier', 'buffer', 'doist', 'automattic',
  'hotjar', 'pitch', 'typeform', 'whereby', 'convertkit',
  'deel', 'remote', 'oyster', 'loom',
  // New additions
  'duckduckgo', 'wikimedia', 'close', 'helpscout', 'percona',
  'invision', 'dbt-labs', 'turing',
]

// ---------------------------------------------------------------------------
// Stage 0 — Language filter (English only)
//
// Reject listings where the title or description is not in English.
// Uses character-level heuristics — no external library required.
// ---------------------------------------------------------------------------

// Characters specific to non-English European languages (ä ö ü ß etc.)
const NON_ENGLISH_CHARS_RE = /[äöüßÄÖÜàáâãçèéêëìíîïñòóôõùúûýœæøšžÀÁÂÃÇÈÉÊËÌÍÎÏÑÒÓÔÕÙÚÛÝŒÆØŠŽ]/g

// Non-Latin script characters: CJK (Chinese/Japanese/Korean), Arabic, Cyrillic, Hebrew, Thai, etc.
// Any occurrence in the title, or 2+ in the description → reject immediately.
const NON_LATIN_SCRIPT_RE = /[\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u3000-\u9FFF\uAC00-\uD7AF\u0E00-\u0E7F\u1100-\u11FF\u4E00-\u9FFF\u3040-\u30FF]/g

// German signal words — expanded list, threshold lowered to 2 matches
const GERMAN_SIGNALS_RE = /\b(und|für|mit|der|die|das|wir|sind|werden|einem|einer|unsere|oder|haben|können|ist|des|dem|den|von|als|auf|bei|nach|nicht|auch|noch|aber|wenn|dann|über|gegen|ohne|sein|ihre?|uns|zum|zur|eine|kein|nur|sehr|alle|diese|dieser|diesem|diesen|dass|damit|sowie|sowohl|jedoch|daher|welche|welches|bitte|bewirb|dich|bewerbung|stelle|stellenanzeige|aufgaben|anforderungen|qualifikationen|gehalt|vollzeit|teilzeit|festanstellung|erfahrung|kenntnisse|unternehmen|gesellschaft|bereich|entwicklung|vertrieb|kunden|lösung|projekt|anstellung|standort|suchen|bieten|gesucht|arbeiten|gestalten|deutschkenntnisse|berufserfahrung|willkommen)\b/gi

// French signal words — clearly non-English terms (accented French words are caught by NON_ENGLISH_CHARS_RE)
const FRENCH_SIGNALS_RE = /\b(vous|votre|notre|avec|pour|dans|rejoignez|postulez|recherchons|contrat|candidature|travail|rejoindre)\b/gi

// Dutch signal words — clearly non-English terms
const DUTCH_SIGNALS_RE = /\b(wij|jij|bij|zijn|worden|hebben|ook|maar|niet|naar|zoeken|werken|vacature|werkgever|solliciteer|bedrijf|ervaring|salaris|functie|stellen)\b/gi

/**
 * Returns true if the combined title + description appears to be English.
 * 2+ non-English European chars → reject.
 * 2+ German signal words → reject (stricter than before).
 * 3+ French signal words → reject.
 * 3+ Dutch signal words → reject.
 * Samples up to 1500 chars of description for better coverage.
 */
function isEnglish(title, description) {
  const sample = `${title} ${(description ?? '').slice(0, 1500)}`

  // Any non-Latin script character in the title → reject (Japanese, Arabic, Cyrillic, etc.)
  if (NON_LATIN_SCRIPT_RE.test(title)) return false
  NON_LATIN_SCRIPT_RE.lastIndex = 0 // reset global regex state

  // 2+ non-Latin script chars anywhere in sample → reject
  const nonLatinChars = sample.match(NON_LATIN_SCRIPT_RE) ?? []
  if (nonLatinChars.length >= 2) return false

  const nonEnglishChars = sample.match(NON_ENGLISH_CHARS_RE) ?? []
  if (nonEnglishChars.length >= 2) return false

  const germanSignals = sample.match(GERMAN_SIGNALS_RE) ?? []
  if (germanSignals.length >= 2) return false

  const frenchSignals = sample.match(FRENCH_SIGNALS_RE) ?? []
  if (frenchSignals.length >= 3) return false

  const dutchSignals = sample.match(DUTCH_SIGNALS_RE) ?? []
  if (dutchSignals.length >= 3) return false

  return true
}

// ---------------------------------------------------------------------------
// Stage 1 — Region filter (4-tier)
//
// Tier 1: Worldwide / Anywhere / no restriction   → highest priority
// Tier 2: Explicitly Pakistan / South Asia
// Tier 3: EMEA or APAC only (other continental labels → REJECT)
// Tier 4: Visa sponsorship for Pakistani talent   → lowest priority
// null  : Single-country restriction (not Pakistan) → REJECT
// ---------------------------------------------------------------------------

const SINGLE_COUNTRIES = [
  'usa', 'united states', 'us only', 'u.s.', 'america',
  'uk', 'united kingdom', 'britain', 'england', 'great britain',
  'germany', 'deutschland', 'france', 'spain', 'italy',
  'netherlands', 'holland', 'canada', 'australia',
  'india', 'brazil', 'mexico', 'portugal', 'sweden',
  'norway', 'denmark', 'finland', 'poland', 'czech republic',
  'czechia', 'romania', 'ukraine', 'israel', 'turkey',
  'japan', 'south korea', 'singapore', 'hong kong',
  'new zealand', 'ireland', 'austria', 'belgium', 'switzerland',
  'malaysia', 'thailand', 'philippines', 'indonesia',
  'vietnam', 'greece', 'hungary', 'bulgaria', 'croatia',
  'serbia', 'slovakia', 'slovenia', 'latvia', 'estonia',
  'lithuania', 'cyprus', 'malta', 'egypt', 'kenya', 'nigeria',
  'argentina', 'colombia', 'chile', 'peru', 'ecuador',
]

/**
 * @returns {{ tier: number, normalized: string } | null}
 * null = reject
 */
function classifyRegion(location) {
  const raw = (location ?? '').trim()
  if (!raw || raw.toLowerCase() === 'remote') return { tier: 1, normalized: 'Worldwide' }

  const l = raw.toLowerCase()

  // Tier 1 — Worldwide
  if (/worldwide|global|anywhere|international|no location restriction|open globally|location independent|work from anywhere|\bwfa\b|all countries|fully remote|any country|no geographic restriction/.test(l)) {
    return { tier: 1, normalized: 'Worldwide' }
  }

  // Tier 2 — Pakistan / South Asia explicitly
  if (/pakistan|south asia/.test(l)) {
    return { tier: 2, normalized: /south asia/.test(l) ? 'South Asia' : 'Pakistan' }
  }

  // Tier 3 — Approved broad multi-country regions: EMEA and APAC only
  // Plain "Europe", "Asia", "Latin America", "Africa", "Middle East" alone → REJECT
  if (/\bemea\b/.test(l)) return { tier: 3, normalized: 'EMEA' }
  if (/\bapac\b|asia[- ]pacific/.test(l)) return { tier: 3, normalized: 'APAC' }

  // Tier 4 — Visa sponsorship / relocation
  if (/visa sponsorship|relocation (support|assistance)|work authorization|sponsorship available/.test(l)) {
    return { tier: 4, normalized: 'Visa Sponsorship Available' }
  }

  // Single-country detection — strip common prefixes then match
  const stripped = l
    .replace(/^remote\s*[-–—(]?\s*/i, '')
    .replace(/\)$/, '')
    .trim()

  if (SINGLE_COUNTRIES.some((c) => stripped === c || stripped === c + ' only')) {
    return null // reject
  }

  // Also reject if location contains restriction language + a single country name
  if (/\b(only|residents?|citizens?|must be (based|located) in)\b/.test(l)) {
    if (SINGLE_COUNTRIES.some((c) => l.includes(c))) return null
  }

  // Ambiguous / specific city / plain continent name — reject
  return null
}

// Timezone restriction detection — descriptions requiring overlap with a
// specific timezone are borderline (sent to Claude) rather than auto-included.
const TIMEZONE_RESTRICTION_RE = /\b(must|required?|need(ed)?|expect(ed)?|preference for|mandatory)\b.{0,100}\b(EST|CST|MST|PST|CET|CEST|AEST|IST|JST|GMT[-+]\d|eastern|pacific|central|mountain)\b.{0,50}\b(time\s*zone|timezone|hours?|overlap|availability)\b|\b(EST|CST|MST|PST|CET|CEST|AEST)\b.{0,80}\b(required?|mandatory|preferred?|must|need(ed)?)\b|\bUS\s+(?:business\s+)?hours?\s+(?:required?|preferred?|mandatory|only)\b|\bEastern\s+time(?:\s+zone)?\s+(?:required?|preferred?|mandatory)\b/i

function hasTimezoneRestriction(description) {
  return TIMEZONE_RESTRICTION_RE.test(description ?? '')
}

// ---------------------------------------------------------------------------
// Stage 2 — Category filter (exactly 6 allowed)
// Returns: 'include' | 'exclude' | 'borderline'
// ---------------------------------------------------------------------------

function classifyCategory(title, tags = [], apiCategory = '') {
  const t = title
  const cat = apiCategory

  // ── Hard blocklist — checked FIRST, before any include patterns ───────────
  if (/customer\s+(service|support|success|liaison)|liaison\s+officer|\bexpeditor\b|support\s+specialist|help\s+desk|\bux\s+designer\b|\bui\s+designer\b|graphic\s+designer|product\s+(manager|designer|owner|lead)|visual\s+designer|operations\s+manager|project\s+manager|program\s+manager|\bscrum\b|agile\s+coach|technical\s+writer|community\s+manager|social\s+media\s+manager|content\s+creator|data\s+entry|transcri|virtual\s+assistant|supply\s+chain|logistics|procurement|purchasing|copywriter|creative\s+director|store\s+manager|retail|barber|cleaner|cleaning|maintenance\s+(tech|planner|worker)|room\s+attendant|bell\s+(person|hop)|lifeguard|painter\b|sandblaster|infanteer|surveyor|estimator|porter\b|coffee\s+roaster|merchandis|loss\s+prevention|facilities\s+planner|operator\s+sewing|sub\s+agent|general\s+manager|cabin\s+clean/i.test(t)) return 'exclude'

  // ── Software Development / Engineering ──────────────────────────────────
  if (/\b(software\s+engineer|software\s+developer|software\s+architect|web\s+developer|backend\s+engineer|frontend\s+engineer|front.?end\s+engineer|full.?stack\s+engineer|full.?stack\s+developer|mobile\s+engineer|mobile\s+developer|ios\s+engineer|android\s+engineer|devops\s+engineer|\bsre\b|site\s+reliability\s+engineer|platform\s+engineer|data\s+engineer|ml\s+engineer|machine\s+learning\s+engineer|ai\s+engineer|security\s+engineer|network\s+engineer|solutions\s+architect|cloud\s+engineer|cloud\s+architect|firmware\s+engineer|embedded\s+engineer|blockchain\s+developer|data\s+scientist|programmer|developer|qa\s+engineer|quality\s+engineer|database\s+admin|\bdba\b|\bdevops\b|\bsysadmin\b)\b/i.test(t)) return 'include'
  if (/\bsoftware.?dev(elopment)?\b|\bdevops\b|\bsysadmin\b|\bdata\s+science\b|\bmachine\s+learning\b/i.test(cat)) return 'include'

  // ── Sales ────────────────────────────────────────────────────────────────
  if (/\bsales\b|account\s+executive|account\s+manager|business\s+development|\bbdr\b|\bsdr\b|\badr\b|revenue\s+operations|\brevops\b|sales\s+engineer|inside\s+sales/i.test(t)) return 'include'
  if (/\bsales\b/i.test(cat) && !/engineer|software|developer/i.test(t)) return 'include'

  // ── Marketing ────────────────────────────────────────────────────────────
  if (/\bmarketing\b|\bseo\b|content\s+market|email\s+market|digital\s+market|growth\s+market|brand\s+manager|demand\s+gen(eration)?|performance\s+market|paid\s+(media|social|search|ads)|affiliate\s+market/i.test(t)) return 'include'
  if (/\bmarketing\b/i.test(cat) && /\bmarketing\b/i.test(t)) return 'include'

  // ── HR / Human Resources ─────────────────────────────────────────────────
  if (/human\s+resources|\bhr\b|recruiter|recruiting|talent\s+acquisition|people\s+ops|people\s+operations|hr\s+manager|hr\s+director|workforce\s+planning|\bhrbp\b|compensation\s+&\s+benefits|employee\s+relations/i.test(t)) return 'include'
  if (/\bhuman\s+resources\b|\brecruiter\b|\btalent\s+acquisition\b/i.test(cat)) return 'include'

  // ── Legal ────────────────────────────────────────────────────────────────
  if (/\blegal\b|\bcounsel\b|compliance\s+officer|paralegal|\battorney\b|\blawyer\b|contract\s+manager|general\s+counsel|in.?house\s+counsel|gdpr|privacy\s+counsel|legal\s+ops/i.test(t)) return 'include'
  if (/\blegal\b/i.test(cat) && /\blegal\b|\bcounsel\b|\bcompliance\b|\bparalegal\b|\battorney\b/i.test(t)) return 'include'

  // ── Finance ──────────────────────────────────────────────────────────────
  if (/\bfinance\b|\bfinancial\b|accountant|accounting|\bcfo\b|\bcontroller\b|\bfp&a\b|\bfpa\b|bookkeeper|payroll|treasury|tax\s+specialist|financial\s+analyst|revenue\s+analyst|financial\s+controller|\baudit\b|financial\s+reporting/i.test(t)) return 'include'
  if (/\bfinance\b|\baccounting\b/i.test(cat) && /\bfinance\b|\bfinancial\b|\baccountant\b|\baccounting\b|\bpayroll\b|\baudit\b/i.test(t)) return 'include'

  // ── Secondary exclude by api_category (if clearly out of scope) ──────────
  if (/customer.?service|support|design|product\s+management|content\s+writing|writing/i.test(cat) && !/marketing|finance|legal|hr|sales|software|engineering/i.test(cat)) return 'exclude'

  return 'borderline'
}

// ---------------------------------------------------------------------------
// Stage 3 — Claude classification (borderline listings)
// ---------------------------------------------------------------------------

async function claudeClassify(listing) {
  if (!anthropic) return 'exclude' // safe default when no key

  const prompt = `You are a strict filter for a remote job board targeting skilled Pakistani university graduates and professionals.

INCLUDE only if BOTH conditions are true:

1. CATEGORY — the role clearly belongs to one of EXACTLY these 6 categories:
   • Sales (account executives, BDRs, SDRs, business development)
   • Marketing (digital marketing, SEO, content marketing, growth marketing, paid ads)
   • Software Development / Engineering (software engineers, devops, data engineers, ML engineers, QA engineers, security engineers, architects)
   • HR / Human Resources (recruiters, talent acquisition, HR managers, people ops)
   • Legal (counsel, compliance, paralegal, contract managers)
   • Finance (financial analysts, accountants, FP&A, controllers, payroll)
   Do NOT include: Customer Support, Product Management, UX/UI Design, Project Management, Technical Writing, Operations, Data Analytics (standalone), or anything else not in the 6 above.

2. REGION — the role is open to one of:
   • Worldwide / Anywhere / Fully Remote (no country restriction)
   • Explicitly names Pakistan or South Asia as eligible
   • Broad multi-country region: EMEA or APAC specifically (not plain "Europe" or "Asia" alone)
   Do NOT include: roles restricted to a single country other than Pakistan (e.g. "Remote - UK", "US only", "must be based in Germany"), or plain continent labels like "Europe (Remote)" without EMEA/APAC framing. Also EXCLUDE if the description requires working specific hours in a timezone that effectively excludes Pakistani candidates (e.g. "must be available 9am-5pm EST", "US business hours required").

Title: ${listing.title}
Category/Tags: ${(listing.tags ?? []).join(', ')}
Company: ${listing.company_name}
Region/Location: ${listing.region}
Description: ${(listing.short_summary ?? '').slice(0, 400)}

Reply with ONLY "include" or "exclude".`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: prompt }],
    })
    return msg.content[0].text.trim().toLowerCase() === 'include' ? 'include' : 'exclude'
  } catch (err) {
    console.error('  Claude error:', err.message)
    return 'exclude' // safe default — exclude on error rather than pollute feed
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

  const { data: existing } = await sb.from('companies').select('id').eq('name', name).maybeSingle()
  if (existing) { companyCache[name] = existing.id; return existing.id }

  const domain = website?.replace(/^https?:\/\//, '').split('/')[0] ?? null
  const { data, error } = await sb.from('companies').insert({
    name,
    logo_url: logo_url || brandFetchLogo(domain),
    website: website || null,
    industry: null,
    pakistan_friendly: false,
  }).select('id').single()

  if (error) { console.error(`  Company insert failed (${name}):`, error.message); return null }
  companyCache[name] = data.id
  return data.id
}

// ---------------------------------------------------------------------------
// Sources — aggregators
// ---------------------------------------------------------------------------

async function fetchRemotive() {
  process.stdout.write('[Remotive] Fetching... ')
  const res = await fetch('https://remotive.com/api/remote-jobs?limit=300', { headers: { 'User-Agent': 'RemoteJobsPK/1.0' } })
  if (!res.ok) throw new Error(`Remotive HTTP ${res.status}`)
  const { jobs } = await res.json()
  const out = jobs.filter((j) => j.url).map((j) => ({
    _source: 'Remotive',
    title: j.title,
    company_name: j.company_name,
    company_logo: j.company_logo_url || null,
    company_website: j.company_url || null,
    original_url: j.url,
    tags: (j.tags ?? []).slice(0, 8),
    api_category: j.category ?? '',
    location: j.candidate_required_location ?? '',
    salary_range: j.salary || null,
    short_summary: stripHtml(j.description),
    date_posted: j.publication_date?.split('T')[0] ?? null,
    seniority: deriveSeniority(j.title),
  }))
  console.log(`${out.length} raw jobs`)
  return out
}

async function fetchArbeitnow() {
  console.log('[Arbeitnow] Fetching (8 pages)...')
  const pages = [1, 2, 3, 4, 5, 6, 7, 8]
  const allJobs = []

  for (const page of pages) {
    try {
      process.stdout.write(`  Page ${page}... `)
      const res = await fetch(
        `https://www.arbeitnow.com/api/job-board-api?page=${page}`,
        { headers: { 'User-Agent': 'RemoteJobsPK/1.0' }, signal: AbortSignal.timeout(10000) }
      )
      if (!res.ok) { console.log(`HTTP ${res.status} — stopping`); break }
      const { data: jobs } = await res.json()
      if (!Array.isArray(jobs) || jobs.length === 0) { console.log('no jobs — stopping'); break }
      const remote = jobs.filter((j) => j.url && j.remote).map((j) => ({
        _source: 'Arbeitnow',
        title: j.title,
        company_name: j.company_name,
        company_logo: null,
        company_website: null,
        original_url: j.url,
        tags: (j.tags ?? []).slice(0, 8),
        api_category: (j.tags ?? []).join(' '),
        location: '',
        salary_range: null,
        short_summary: stripHtml(j.description),
        date_posted: j.created_at ? new Date(j.created_at * 1000).toISOString().split('T')[0] : null,
        seniority: deriveSeniority(j.title),
      }))
      console.log(`${remote.length} remote jobs`)
      allJobs.push(...remote)
    } catch (err) {
      console.log(`error (${err.message}) — stopping`)
      break
    }
  }

  console.log(`[Arbeitnow] Done — ${allJobs.length} raw jobs total`)
  return allJobs
}

async function fetchRemoteOK() {
  process.stdout.write('[RemoteOK] Fetching... ')
  const res = await fetch('https://remoteok.com/api', { headers: { 'User-Agent': 'RemoteJobsPK/1.0 (remotejobs.pk)' } })
  if (!res.ok) throw new Error(`RemoteOK HTTP ${res.status}`)
  const raw = await res.json()
  const out = raw.slice(1).filter((j) => j.position && j.url).map((j) => ({
    _source: 'RemoteOK',
    title: j.position,
    company_name: j.company,
    company_logo: j.company_logo || null,
    company_website: null,
    original_url: j.url,
    tags: (j.tags ?? []).slice(0, 8),
    api_category: (j.tags ?? []).join(' '),
    location: j.location ?? '',
    salary_range: j.salary_min ? `$${Number(j.salary_min).toLocaleString()}–$${Number(j.salary_max).toLocaleString()}/yr` : null,
    short_summary: stripHtml(j.description),
    date_posted: j.date?.split('T')[0] ?? null,
    seniority: deriveSeniority(j.position),
  }))
  console.log(`${out.length} raw jobs`)
  return out
}

async function fetchHimalayas() {
  process.stdout.write('[Himalayas] Fetching... ')
  try {
    const res = await fetch(
      'https://himalayas.app/jobs/api?limit=300',
      { headers: { 'User-Agent': 'RemoteJobsPK/1.0' }, signal: AbortSignal.timeout(15000) }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = await res.json()
    const jobs = body.jobs ?? body ?? []
    if (!Array.isArray(jobs)) throw new Error('Unexpected response shape')
    const out = jobs.filter((j) => j.applicationLink || j.url).map((j) => ({
      _source: 'Himalayas',
      title: j.title ?? '',
      company_name: j.company?.name ?? j.companyName ?? 'Unknown',
      company_logo: j.company?.logo ?? j.companyLogo ?? null,
      company_website: j.company?.website ?? j.companyWebsite ?? null,
      original_url: j.applicationLink ?? j.url,
      tags: (j.tags ?? j.categories ?? []).slice(0, 8),
      api_category: (j.categories ?? []).join(' '),
      location: j.location ?? j.regions ?? '',
      salary_range: j.salary ?? null,
      short_summary: stripHtml(j.shortDescription ?? j.description ?? ''),
      date_posted: j.publishedAt ? j.publishedAt.split('T')[0] : null,
      seniority: deriveSeniority(j.title ?? ''),
    }))
    console.log(`${out.length} raw jobs`)
    return out
  } catch (err) {
    console.log(`FAILED (${err.message}) — skipping`)
    return []
  }
}

async function fetchWorkingNomads() {
  process.stdout.write('[WorkingNomads] Fetching... ')
  try {
    const res = await fetch(
      'https://www.workingnomads.com/api/exposed_jobs/',
      { headers: { 'User-Agent': 'RemoteJobsPK/1.0' }, signal: AbortSignal.timeout(15000) }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const jobs = await res.json()
    if (!Array.isArray(jobs)) throw new Error('Unexpected response shape')
    const out = jobs.filter((j) => j.url).map((j) => ({
      _source: 'WorkingNomads',
      title: j.title ?? '',
      company_name: j.company ?? 'Unknown',
      company_logo: j.company_logo_url ?? null,
      company_website: null,
      original_url: j.url,
      tags: [],
      api_category: j.category?.name ?? '',
      location: j.region ?? j.location ?? '',
      salary_range: j.salary || null,
      short_summary: stripHtml(j.description ?? ''),
      date_posted: j.pub_date ? j.pub_date.split('T')[0] : null,
      seniority: deriveSeniority(j.title ?? ''),
    }))
    console.log(`${out.length} raw jobs`)
    return out
  } catch (err) {
    console.log(`FAILED (${err.message}) — skipping`)
    return []
  }
}

async function fetchJobicy() {
  process.stdout.write('[Jobicy] Fetching... ')
  try {
    const res = await fetch(
      'https://jobicy.com/api/v2/remote-jobs?count=50',
      { headers: { 'User-Agent': 'RemoteJobsPK/1.0' }, signal: AbortSignal.timeout(15000) }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = await res.json()
    const jobs = body.jobs ?? body ?? []
    if (!Array.isArray(jobs)) throw new Error('Unexpected response shape')
    const out = jobs.filter((j) => j.url).map((j) => ({
      _source: 'Jobicy',
      title: j.jobTitle ?? j.title ?? '',
      company_name: j.companyName ?? j.company ?? 'Unknown',
      company_logo: j.companyLogo ?? j.company_logo ?? null,
      company_website: j.companyUrl ?? null,
      original_url: j.url,
      tags: [...(j.jobIndustry ?? []), ...(j.jobType ?? [])].slice(0, 8),
      api_category: (j.jobIndustry ?? []).join(' '),
      location: j.jobGeo ?? j.location ?? '',
      salary_range: null,
      short_summary: stripHtml(j.jobExcerpt ?? j.description ?? ''),
      date_posted: j.pubDate ? j.pubDate.split(' ')[0] : null,
      seniority: deriveSeniority(j.jobTitle ?? j.title ?? ''),
    }))
    console.log(`${out.length} raw jobs`)
    return out
  } catch (err) {
    console.log(`FAILED (${err.message}) — skipping`)
    return []
  }
}

// ---------------------------------------------------------------------------
// Sources — direct company boards (Greenhouse + Lever)
// ---------------------------------------------------------------------------

async function fetchGreenhouse() {
  console.log(`[Greenhouse] Fetching ${GREENHOUSE_SLUGS.length} company boards...`)
  const jobs = []
  let done = 0

  const NAME_MAP = {
    stripe: 'Stripe', anthropic: 'Anthropic', datadog: 'Datadog', mongodb: 'MongoDB',
    okta: 'Okta', canonical: 'Canonical', cloudflare: 'Cloudflare', elastic: 'Elastic',
    gitlab: 'GitLab', coinbase: 'Coinbase', figma: 'Figma', twilio: 'Twilio',
    asana: 'Asana', robinhood: 'Robinhood', intercom: 'Intercom', postman: 'Postman',
    gusto: 'Gusto', vercel: 'Vercel', checkr: 'Checkr', dropbox: 'Dropbox',
    pagerduty: 'PagerDuty', airtable: 'Airtable', contentful: 'Contentful',
    lattice: 'Lattice', remote: 'Remote.com', netlify: 'Netlify',
    hashicorp: 'HashiCorp', mozilla: 'Mozilla', digitalocean: 'DigitalOcean',
    sentry: 'Sentry', grafana: 'Grafana Labs', sourcegraph: 'Sourcegraph',
    posthog: 'PostHog', algolia: 'Algolia', amplitude: 'Amplitude',
    braze: 'Braze', hubspot: 'HubSpot', zendesk: 'Zendesk',
    outreach: 'Outreach', gong: 'Gong', salesloft: 'Salesloft', apollo: 'Apollo.io',
    pipedrive: 'Pipedrive', klaviyo: 'Klaviyo', deel: 'Deel', rippling: 'Rippling',
    brex: 'Brex', scale: 'Scale AI', squarespace: 'Squarespace', shopify: 'Shopify',
    loom: 'Loom', linear: 'Linear', '1password': '1Password', crowdin: 'Crowdin',
    lokalise: 'Lokalise', miro: 'Miro', notion: 'Notion', replit: 'Replit',
    // New additions
    confluent: 'Confluent', cockroachdb: 'CockroachDB', fastly: 'Fastly',
    influxdata: 'InfluxData', newrelic: 'New Relic',
    databricks: 'Databricks', airbyte: 'Airbyte', fivetran: 'Fivetran',
    hightouch: 'Hightouch', prefect: 'Prefect', temporal: 'Temporal Technologies',
    webflow: 'Webflow', coda: 'Coda', invision: 'InVision',
    hootsuite: 'Hootsuite', sproutsocial: 'Sprout Social', iterable: 'Iterable',
    activecampaign: 'ActiveCampaign', drift: 'Drift', aircall: 'Aircall',
    pandadoc: 'PandaDoc', sendbird: 'SendBird', helpscout: 'Help Scout', close: 'Close',
    personio: 'Personio', '15five': '15Five', cultureamp: 'Culture Amp', hibob: 'HiBob',
    ironclad: 'Ironclad', clio: 'Clio',
    paddle: 'Paddle', xero: 'Xero', chargebee: 'Chargebee', plaid: 'Plaid',
    nubank: 'Nubank', wise: 'Wise', carta: 'Carta', pilot: 'Pilot',
    freshworks: 'Freshworks', pluralsight: 'Pluralsight',
  }

  await Promise.allSettled(
    GREENHOUSE_SLUGS.map(async (slug) => {
      try {
        const res = await fetch(
          `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
          { headers: { 'User-Agent': 'RemoteJobsPK/1.0' }, signal: AbortSignal.timeout(10000) }
        )
        done++
        const companyName = NAME_MAP[slug] ?? (slug.charAt(0).toUpperCase() + slug.slice(1))
        if (!res.ok) {
          process.stdout.write(`  [${done}/${GREENHOUSE_SLUGS.length}] ${companyName}: skipped (${res.status})\n`)
          return
        }
        const { jobs: raw } = await res.json()
        if (!Array.isArray(raw)) return
        process.stdout.write(`  [${done}/${GREENHOUSE_SLUGS.length}] ${companyName}: ${raw.length} jobs\n`)

        for (const j of raw) {
          if (!j.absolute_url) continue
          jobs.push({
            _source: 'Greenhouse',
            title: j.title ?? '',
            company_name: companyName,
            company_logo: null,
            company_website: `https://${slug}.com`,
            original_url: j.absolute_url,
            tags: [],
            api_category: j.departments?.map((d) => d.name).join(' ') ?? '',
            location: j.location?.name ?? '',
            salary_range: null,
            short_summary: stripHtml(j.content ?? ''),
            date_posted: j.updated_at?.split('T')[0] ?? null,
            seniority: deriveSeniority(j.title ?? ''),
          })
        }
      } catch (err) {
        done++
        const companyName = NAME_MAP[slug] ?? slug
        process.stdout.write(`  [${done}/${GREENHOUSE_SLUGS.length}] ${companyName}: error (${err.message})\n`)
      }
    })
  )

  console.log(`[Greenhouse] Done — ${jobs.length} raw jobs total`)
  return jobs
}

async function fetchLever() {
  console.log(`[Lever] Fetching ${LEVER_SLUGS.length} company boards...`)
  const jobs = []
  let done = 0

  const NAME_MAP = {
    canonical: 'Canonical', deel: 'Deel', zapier: 'Zapier', buffer: 'Buffer',
    doist: 'Doist', automattic: 'Automattic', toptal: 'Toptal', invision: 'InVision',
    hotjar: 'Hotjar', remote: 'Remote.com', loom: 'Loom', pitch: 'Pitch',
    miro: 'Miro', typeform: 'Typeform', whereby: 'Whereby', convertkit: 'ConvertKit',
    oyster: 'Oyster HR',
    // New additions
    duckduckgo: 'DuckDuckGo', wikimedia: 'Wikimedia Foundation',
    close: 'Close', helpscout: 'Help Scout', percona: 'Percona',
    'dbt-labs': 'dbt Labs', turing: 'Turing',
  }

  await Promise.allSettled(
    LEVER_SLUGS.map(async (slug) => {
      try {
        const res = await fetch(
          `https://api.lever.co/v0/postings/${slug}?mode=json`,
          { headers: { 'User-Agent': 'RemoteJobsPK/1.0' }, signal: AbortSignal.timeout(10000) }
        )
        done++
        const companyName = NAME_MAP[slug] ?? (slug.charAt(0).toUpperCase() + slug.slice(1))
        if (!res.ok) {
          process.stdout.write(`  [${done}/${LEVER_SLUGS.length}] ${companyName}: skipped (${res.status})\n`)
          return
        }
        const raw = await res.json()
        if (!Array.isArray(raw)) return
        process.stdout.write(`  [${done}/${LEVER_SLUGS.length}] ${companyName}: ${raw.length} jobs\n`)

        for (const j of raw) {
          if (!j.hostedUrl) continue
          const locationName = j.categories?.location ?? j.categories?.allLocations?.[0] ?? ''
          const descText = [
            j.descriptionPlain ?? '',
            ...(j.lists ?? []).map((l) => `${l.text}: ${l.content}`),
          ].join(' ')

          jobs.push({
            _source: 'Lever',
            title: j.text ?? '',
            company_name: companyName,
            company_logo: null,
            company_website: `https://${slug}.com`,
            original_url: j.hostedUrl,
            tags: j.tags ?? [],
            api_category: [j.categories?.team, j.categories?.department].filter(Boolean).join(' '),
            location: locationName,
            salary_range: null,
            short_summary: stripHtml(descText).slice(0, 500),
            date_posted: j.createdAt ? new Date(j.createdAt).toISOString().split('T')[0] : null,
            seniority: deriveSeniority(j.text ?? ''),
          })
        }
      } catch (err) {
        done++
        const companyName = NAME_MAP[slug] ?? slug
        process.stdout.write(`  [${done}/${LEVER_SLUGS.length}] ${companyName}: error (${err.message})\n`)
      }
    })
  )

  console.log(`[Lever] Done — ${jobs.length} raw jobs total`)
  return jobs
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function ingest() {
  // ── Optional wipe ─────────────────────────────────────────────────────────
  if (WIPE) {
    process.stdout.write('Wiping listings... ')
    const { error: le } = await sb.from('listings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (le) { console.error('Failed:', le.message); process.exit(1) }
    console.log('done')

    process.stdout.write('Wiping companies... ')
    const { error: ce } = await sb.from('companies').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (ce) { console.error('Failed:', ce.message); process.exit(1) }
    console.log('done\n')
  }

  // ── Check existing ─────────────────────────────────────────────────────────
  const { data: existingRows, error: existErr } = await sb.from('listings').select('original_url')
  if (existErr) { console.error('Could not query listings:', existErr.message); process.exit(1) }
  const existingUrls = new Set((existingRows ?? []).map((r) => r.original_url))

  const { count: companyCount } = await sb.from('companies').select('*', { count: 'exact', head: true })
  console.log(`DB state: ${existingUrls.size} listings, ${companyCount ?? '?'} companies\n`)

  // ── Fetch all sources (sequentially to keep output readable) ──────────────
  console.log('=== Fetching sources ===')
  const sourceResults = {}

  for (const [name, fn] of [
    ['Remotive', fetchRemotive],
    ['Arbeitnow', fetchArbeitnow],
    ['RemoteOK', fetchRemoteOK],
    ['Himalayas', fetchHimalayas],
    ['WorkingNomads', fetchWorkingNomads],
    ['Jobicy', fetchJobicy],
    ['Greenhouse', fetchGreenhouse],
    ['Lever', fetchLever],
  ]) {
    try {
      sourceResults[name] = await fn()
    } catch (err) {
      console.error(`[${name}] FAILED: ${err.message}`)
      sourceResults[name] = []
    }
  }

  const allJobs = Object.values(sourceResults).flat()
  const rawBySource = Object.fromEntries(Object.entries(sourceResults).map(([k, v]) => [k, v.length]))

  console.log(`\n=== Raw fetched ===`)
  for (const [src, count] of Object.entries(rawBySource)) {
    console.log(`  ${src.padEnd(14)} ${count}`)
  }
  console.log(`  ${'TOTAL'.padEnd(14)} ${allJobs.length}`)

  // ── Deduplicate ────────────────────────────────────────────────────────────
  const seen = new Set(existingUrls)
  const newJobs = allJobs.filter((j) => {
    if (!j.original_url || seen.has(j.original_url)) return false
    seen.add(j.original_url)
    return true
  })
  console.log(`\n${newJobs.length} new (${allJobs.length - newJobs.length} already in DB or duplicate)\n`)

  // ── Stage 0: Language filter ───────────────────────────────────────────────
  console.log('=== Stage 0: Language filter ===')
  const langRejected = { total: 0 }
  const langRejectedBySource = {}
  const afterLanguage = []

  for (const j of newJobs) {
    if (!isEnglish(j.title, j.short_summary)) {
      langRejected.total++
      langRejectedBySource[j._source] = (langRejectedBySource[j._source] ?? 0) + 1
      continue
    }
    afterLanguage.push(j)
  }

  console.log(`  Pass: ${afterLanguage.length}  Rejected (non-English): ${langRejected.total}`)
  for (const [src, n] of Object.entries(langRejectedBySource)) {
    console.log(`  Language-rejected from ${src}: ${n}`)
  }

  // ── Stage 1: Region ───────────────────────────────────────────────────────
  console.log('\n=== Stage 1: Region filter ===')
  const regionStats = { t1: 0, t2: 0, t3: 0, t4: 0, rejected: 0, tzBorderline: 0 }
  const regionRejectedBySource = {}
  const afterRegion = []
  const timezoneBorderline = []

  for (const j of afterLanguage) {
    const result = classifyRegion(j.location)
    if (!result) {
      regionStats.rejected++
      regionRejectedBySource[j._source] = (regionRejectedBySource[j._source] ?? 0) + 1
      continue
    }
    j._regionTier = result.tier
    j._regionNormalized = result.normalized
    regionStats[`t${result.tier}`]++

    // Timezone restriction in description → borderline for Claude adjudication
    if (result.tier === 1 && hasTimezoneRestriction(j.short_summary)) {
      regionStats.tzBorderline++
      j._tzFlagged = true
      timezoneBorderline.push(j)
    } else {
      afterRegion.push(j)
    }
  }

  console.log(`  Pass: ${afterRegion.length}  TZ-borderline: ${timezoneBorderline.length}  Rejected: ${regionStats.rejected}`)
  console.log(`  Tier breakdown → T1 Worldwide: ${regionStats.t1} | T2 Pakistan: ${regionStats.t2} | T3 EMEA/APAC: ${regionStats.t3} | T4 Visa: ${regionStats.t4}`)
  for (const [src, n] of Object.entries(regionRejectedBySource)) {
    console.log(`  Region-rejected from ${src}: ${n}`)
  }

  // ── Stage 2: Category ─────────────────────────────────────────────────────
  console.log('\n=== Stage 2: Category filter ===')
  const include = []
  const borderline = []
  let categoryRejected = 0
  const catRejectedBySource = {}

  // Process region-passed jobs through category filter
  for (const j of afterRegion) {
    const verdict = classifyCategory(j.title, j.tags, j.api_category)
    if (verdict === 'include') include.push(j)
    else if (verdict === 'borderline') borderline.push(j)
    else {
      categoryRejected++
      catRejectedBySource[j._source] = (catRejectedBySource[j._source] ?? 0) + 1
    }
  }

  // TZ-flagged jobs also go through category filter first, then to Claude
  for (const j of timezoneBorderline) {
    const verdict = classifyCategory(j.title, j.tags, j.api_category)
    if (verdict === 'include' || verdict === 'borderline') borderline.push(j) // Claude will re-check TZ
    else {
      categoryRejected++
      catRejectedBySource[j._source] = (catRejectedBySource[j._source] ?? 0) + 1
    }
  }

  console.log(`  Include: ${include.length}  Borderline: ${borderline.length}  Rejected: ${categoryRejected}`)
  for (const [src, n] of Object.entries(catRejectedBySource)) {
    console.log(`  Category-rejected from ${src}: ${n}`)
  }

  // ── Stage 3: Claude ───────────────────────────────────────────────────────
  let claudeIncluded = 0
  let claudeExcluded = 0

  if (borderline.length > 0) {
    console.log(`\n=== Stage 3: Claude adjudication (${borderline.length} borderline) ===`)
    if (!anthropic) {
      console.log(`  Skipped — no ANTHROPIC_API_KEY. All ${borderline.length} borderline listings excluded.`)
      claudeExcluded = borderline.length
    } else {
      for (let i = 0; i < borderline.length; i++) {
        const j = borderline[i]
        const tzNote = j._tzFlagged ? ' [TZ-flagged]' : ''
        process.stdout.write(`  [${i + 1}/${borderline.length}] ${j.title.slice(0, 48).padEnd(48)}${tzNote} `)
        const verdict = await claudeClassify({
          title: j.title,
          company_name: j.company_name,
          region: j._regionNormalized,
          tags: j.tags,
          short_summary: j.short_summary,
        })
        console.log(verdict)
        if (verdict === 'include') { include.push(j); claudeIncluded++ }
        else claudeExcluded++
      }
      console.log(`  Claude result: ${claudeIncluded} included, ${claudeExcluded} excluded`)
    }
  }

  // ── Summary before insert ─────────────────────────────────────────────────
  const totalRejected = langRejected.total + regionStats.rejected + categoryRejected + claudeExcluded
  console.log(`\n=== Pre-insert summary ===`)
  console.log(`  Raw fetched:          ${allJobs.length}`)
  console.log(`  New (deduped):        ${newJobs.length}`)
  console.log(`  Language rejected:    ${langRejected.total}`)
  console.log(`  Region rejected:      ${regionStats.rejected}`)
  console.log(`  TZ-flagged→Claude:    ${regionStats.tzBorderline}`)
  console.log(`  Category rejected:    ${categoryRejected}`)
  console.log(`  Claude adjud:         ${borderline.length} sent → ${claudeIncluded} in, ${claudeExcluded} out`)
  console.log(`  Total to insert:      ${include.length}`)
  console.log(`  Total rejected:       ${totalRejected}`)

  console.log(`\n  Per-source raw:`)
  for (const [src, count] of Object.entries(rawBySource)) {
    console.log(`    ${src.padEnd(14)} ${count}`)
  }

  if (include.length === 0) { console.log('\nNothing to insert.'); return }

  // ── Insert ────────────────────────────────────────────────────────────────
  console.log(`\n=== Inserting ${include.length} listings ===`)
  let inserted = 0
  let failed = 0
  const insertedListings = []

  for (let i = 0; i < include.length; i++) {
    const job = include[i]
    if ((i + 1) % 10 === 0 || i === 0) {
      console.log(`  [${i + 1}/${include.length}] inserting...`)
    }

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
      region_eligibility: job._regionNormalized,
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
      insertedListings.push({ title: job.title, company: job.company_name, tier: job._regionTier, region: job._regionNormalized, source: job._source })
    }
  }

  // ── Company diversity breakdown ────────────────────────────────────────────
  const companyCounts = {}
  for (const l of insertedListings) {
    companyCounts[l.company] = (companyCounts[l.company] ?? 0) + 1
  }
  const sortedCompanies = Object.entries(companyCounts).sort((a, b) => b[1] - a[1])

  // ── Final report ──────────────────────────────────────────────────────────
  console.log(`\n=== FINAL REPORT ===`)
  console.log(`Per-source raw fetched:`)
  for (const [src, count] of Object.entries(rawBySource)) {
    console.log(`  ${src.padEnd(14)} ${count} raw`)
  }
  console.log(`\nFilter pipeline:`)
  console.log(`  Language rejected:    ${langRejected.total}`)
  console.log(`  Region rejected:      ${regionStats.rejected}`)
  console.log(`  TZ-borderlined:       ${regionStats.tzBorderline}`)
  console.log(`  Category rejected:    ${categoryRejected}`)
  console.log(`  Claude sent:          ${borderline.length}  (included: ${claudeIncluded}, excluded: ${claudeExcluded})`)
  console.log(`\nDB outcome:`)
  console.log(`  Inserted:  ${inserted}`)
  console.log(`  Failed:    ${failed}`)
  console.log(`  Unique companies represented: ${sortedCompanies.length}`)

  console.log(`\nCompany breakdown (${sortedCompanies.length} unique):`)
  for (const [company, count] of sortedCompanies) {
    console.log(`  ${String(count).padStart(3)}x  ${company}`)
  }

  console.log(`\nInserted listings:`)
  insertedListings.forEach((l, i) =>
    console.log(`  ${String(i + 1).padStart(3)}. [T${l.tier}][${l.source.padEnd(12)}] ${l.title.slice(0, 43).padEnd(43)} @ ${l.company} (${l.region})`)
  )
}

ingest().catch(console.error)
