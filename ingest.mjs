/**
 * Ingestion pipeline — Greenhouse, Lever (direct company ATS boards only)
 *
 * Aggregator sources (Remotive, Arbeitnow, RemoteOK, Himalayas, WorkingNomads,
 * Jobicy) were removed: none of their APIs expose a direct company apply URL,
 * so all links pointed back to the aggregator's own listing page.
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
  // Infrastructure / Cloud (verified live)
  'stripe', 'datadog', 'mongodb', 'okta', 'canonical', 'cloudflare', 'elastic',
  'netlify', 'vercel', 'fastly', 'newrelic',

  // Software / Dev tools (verified live)
  'anthropic', 'gitlab', 'coinbase', 'figma', 'twilio', 'postman', 'dropbox',
  'airtable', 'contentful', 'algolia', 'squarespace', 'lokalise', 'webflow',
  'sourcegraph91',                          // Sourcegraph (correct slug)

  // Data / Analytics / ML (verified live)
  'databricks', 'fivetran', 'hightouch', 'mixpanel', 'labelbox',

  // Observability / DevTools (verified live)
  'grafanalabs', 'launchdarkly', 'honeycomb',

  // Security (verified live)
  'zscaler', 'securityscorecard', 'chainguard',

  // AI / ML platforms (verified live)
  'scaleai', 'assemblyai', 'gleanwork',

  // Sales / Marketing / CRM (verified live)
  'hubspot', 'intercom', 'salesloft', 'klaviyo', 'braze', 'amplitude',
  'hootsuite', 'sproutsocial', 'iterable', 'pandadoc', 'sendbird',
  'apollo', 'unbounce', 'zoominfo', 'cognism', 'showpad', 'zuora',
  'gongio',                                 // Gong.io (correct slug)
  'customerio', '6sense', 'dialpad',

  // HR / People Ops (verified live)
  'remote', 'lattice', 'gusto', 'checkr', 'cultureamp', 'justworks',
  'automatticcareers',                      // Automattic/WordPress (correct slug)

  // Collaboration / Productivity (verified live)
  'realtimeboardglobal',                    // Miro (correct slug)
  'smartsheet', 'samsara', 'tripactions',

  // Finance / FinTech (verified live)
  'brex', 'robinhood', 'nubank', 'wise', 'carta',
  'mercury', 'gocardless', 'tipaltisolutions', 'lithic',

  // Legal (verified live)
  'mycase',

  // Freelance / Marketplace (verified live)
  'upwork',

  // General / Other (verified live)
  'asana', 'pagerduty',
  'liveperson', 'storyblok',
]

const LEVER_SLUGS = [
  // Verified live
  'toptal', 'omnisend', 'whereby',
  'pipedrive',                              // CRM — 16 jobs
  'sonatype',                               // Software supply chain security — 34 jobs
  // Live but 0 jobs — keep in case they post
  'highspot', 'clari',
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

// Greenhouse and Lever are direct ATS sources — all locations are inspected for remote signals.
const REMOTE_AGGREGATORS = new Set() // no aggregator sources remain; kept to avoid refactoring classifyRegion

/**
 * Classify a job's location into a human-readable region tag.
 *
 * Returns a string tag (e.g. 'Worldwide', 'USA', 'EMEA', 'UK') or null if
 * the listing appears to be in-office/on-site and should be rejected.
 *
 * For aggregator sources (Remotive, RemoteOK, etc.) every job is already
 * remote — unknown locations fall back to 'Worldwide'.
 * For ATS sources (Greenhouse, Lever) a location with no 'remote' keyword
 * and no recognized region label is treated as in-office and rejected.
 *
 * @param {string} location
 * @param {string} source - job._source value
 * @returns {string | null}
 */
function classifyRegion(location, source) {
  const raw = (location ?? '').trim()
  const isAggregator = REMOTE_AGGREGATORS.has(source)

  // ATS source with a location that has no 'remote' indicator and no broad
  // region keyword → almost certainly an in-office listing, reject it.
  if (!isAggregator && raw) {
    const hasRemoteKeyword = /remote/i.test(raw)
    const hasBroadRegion = /\b(emea|apac|asia.?pacific|worldwide|global|anywhere|international)\b/i.test(raw)
    if (!hasRemoteKeyword && !hasBroadRegion) return null
  }

  // Strip "Remote" prefix so we can parse the restriction cleanly
  const stripped = raw
    .toLowerCase()
    .replace(/^remote\s*[-–—(,/]?\s*/i, '')
    .replace(/[()]/g, '')
    .trim()

  // No restriction — open to anyone
  if (
    !stripped ||
    stripped === 'remote' ||
    /worldwide|global|anywhere|international|open globally|location independent|work from anywhere|\bwfa\b|all countries|any country|no geographic restriction|fully remote/.test(stripped)
  ) return 'Worldwide'

  // Pakistan / South Asia — open to our audience, treat as Worldwide
  if (/pakistan|south asia/.test(stripped)) return 'Worldwide'

  // EMEA — Europe, Middle East, Africa (broad keyword or any specific country)
  if (
    /\bemea\b|\bmena\b|\bcea\b|\bcee\b/.test(stripped) ||
    /\beurope\b/.test(stripped) ||
    /\b(germany|deutschland|france|netherlands|holland|poland|spain|italy|ireland|portugal|sweden|norway|denmark|finland|romania|czech|switzerland|austria|belgium|greece|hungary|ukraine|israel|turkey|egypt|nigeria|kenya|south africa)\b/.test(stripped)
  ) return 'EMEA'

  // APAC — Asia-Pacific (broad keyword or any specific country)
  if (
    /\bapac\b|asia[- ]pacific/.test(stripped) ||
    /\b(india|singapore|japan|south korea|australia|new zealand|philippines|malaysia|indonesia|vietnam|thailand|hong kong)\b/.test(stripped)
  ) return 'APAC'

  // UK — kept separate (distinct major job market)
  if (/\b(uk|united kingdom|britain|england|great britain)\b/.test(stripped)) return 'UK'

  // USA — covers all Americas (US, Canada, LATAM)
  if (
    /\b(usa|united states|u\.s\.|us only)\b/.test(stripped) ||
    /\bcanada\b/.test(stripped) ||
    /\b(latam|latin america)\b/.test(stripped) ||
    /\b(mexic|brazil|argentina|colombia|chile|peru|ecuador)\b/.test(stripped)
  ) return 'USA'

  // Still has "remote" in the original string — unknown restriction but remote → Worldwide
  if (/remote/i.test(raw)) return 'Worldwide'

  // Aggregator pre-filters remote, so any unrecognized location is a region we
  // don't have a tag for → treat as Worldwide rather than losing the listing
  if (isAggregator) return 'Worldwide'

  // ATS source, unrecognized location, no remote signal → reject (in-office)
  return null
}

// Timezone restriction detection — descriptions requiring overlap with a
// specific timezone are borderline (sent to Claude) rather than auto-included.
const TIMEZONE_RESTRICTION_RE = /\b(must|required?|need(ed)?|expect(ed)?|preference for|mandatory)\b.{0,100}\b(EST|CST|MST|PST|CET|CEST|AEST|IST|JST|GMT[-+]\d|eastern|pacific|central|mountain)\b.{0,50}\b(time\s*zone|timezone|hours?|overlap|availability)\b|\b(EST|CST|MST|PST|CET|CEST|AEST)\b.{0,80}\b(required?|mandatory|preferred?|must|need(ed)?)\b|\bUS\s+(?:business\s+)?hours?\s+(?:required?|preferred?|mandatory|only)\b|\bEastern\s+time(?:\s+zone)?\s+(?:required?|preferred?|mandatory)\b/i

function hasTimezoneRestriction(description) {
  return TIMEZONE_RESTRICTION_RE.test(description ?? '')
}

// ---------------------------------------------------------------------------
// Region confidence — description-level restriction scanning
//
// Many Greenhouse/Lever postings list "Remote" as the location (which our
// classifyRegion() maps to "Worldwide") but bury an explicit country
// restriction in the body text, e.g. "must be authorized to work in the US".
// We scan the full description (before storage truncation) to catch these.
//
// Three confidence levels:
//   confirmed_open        — no restriction found; description may even confirm global hiring
//   restricted_other_region — description explicitly restricts to a region that excludes PK
//   unclear               — specific region tag (EMEA/APAC/USA/UK), or Worldwide with no signal
// ---------------------------------------------------------------------------

// Phrases that mean the role is restricted to a non-Pakistan region
const REGION_EXCLUSION_RE = /\b(?:US|U\.S\.|United States|USA)\s*-?\s*only\b|\bonly\s+(?:open\s+to|for|hiring)\s+(?:candidates?|applicants?|residents?|citizens?)?\s*(?:based\s+in|in|from)\s+(?:the\s+)?(?:US\b|United States|USA\b|UK\b|United Kingdom|Canada\b|Australia\b)\b|\bmust\s+(?:be\s+)?(?:based|located?|resid(?:e|ing)|living?|work(?:ing)?)\s+(?:in|within)\s+(?:the\s+)?(?:US\b|U\.S\b|United States|USA\b|UK\b|United Kingdom|Canada\b|Australia\b|Germany\b|France\b|Netherlands\b|European Union\b)\b|\bauthori[sz]ed?\s+to\s+work\s+in\s+(?:the\s+)?(?:US\b|U\.S\b|United States|USA\b|UK\b|United Kingdom)\b|\blegally\s+(?:authorized?|eligible|permitted)\s+to\s+work\s+in\b|\bwork\s+authori[sz]ation\s+(?:in|for)\s+(?:the\s+)?(?:US\b|United States|UK\b|United Kingdom)\b|\bthis\s+(?:role|position|job)\s+is\s+(?:only\s+)?(?:open|available)\s+to\s+(?:candidates?|applicants?)\s+(?:based\s+)?in\b|\bcandidates?\s+must\s+be\s+(?:based|located?|resident)\s+in\b|\b(?:US|United States|USA|Canada|UK|United Kingdom|Australia|EU|European Union)\s+(?:citizens?|residents?|nationals?)\s+only\b|\bno\s+(?:visa|work\s+visa)\s+sponsorship\b/i

// Phrases that CONFIRM the role is genuinely open to anyone globally
const REGION_OPEN_RE = /\bhire\s+(?:globally|worldwide|internationally|from\s+anywhere|from\s+any\s+country)\b|\bwork\s+from\s+anywhere\b|\bno\s+geographic\s+restrictions?\b|\bglobally\s+distributed\b|\blocation\s+(?:independent|agnostic)\b|\bopen\s+to\s+(?:all\s+countries|candidates?\s+(?:anywhere|worldwide|globally|from\s+any\s+country))\b|\bwelcome\s+candidates?\s+from\s+(?:any|all)\s+(?:country|countries|location)\b|\bhire\s+in\s+any\s+country\b|\bfully\s+distributed\s+team\b/i

/**
 * Given the region already classified from the location field and the full
 * description text, return a confidence level and (if needed) a corrected
 * region tag.
 */
function classifyRegionConfidence(region, description) {
  const text = description ?? ''

  if (REGION_EXCLUSION_RE.test(text)) {
    // Description explicitly restricts — fix the region tag if it was over-broad
    const correctedRegion = region === 'Worldwide' ? restrictionToRegion(text) : region
    return { confidence: 'restricted_other_region', correctedRegion }
  }

  if (region === 'Worldwide') {
    if (REGION_OPEN_RE.test(text)) return { confidence: 'confirmed_open', correctedRegion: region }
    // Worldwide with no explicit signal either way
    return { confidence: 'unclear', correctedRegion: region }
  }

  // Already a specific region (EMEA/APAC/USA/UK) — role is regionally scoped
  return { confidence: 'unclear', correctedRegion: region }
}

/** Infer which region the exclusion refers to from the description text. */
function restrictionToRegion(text) {
  if (/\b(?:US|U\.S\.|United States|USA|Canada|LATAM|Latin America)\b/i.test(text)) return 'USA'
  if (/\b(?:UK|United Kingdom|Britain|England)\b/i.test(text)) return 'UK'
  if (/\b(?:EU|European Union|Germany|France|Netherlands|Spain|Italy|Poland)\b/i.test(text)) return 'EMEA'
  if (/\b(?:Australia|New Zealand|ANZ)\b/i.test(text)) return 'APAC'
  return 'USA' // safe default for unrecognized restriction
}

// ---------------------------------------------------------------------------
// Stage 2 — Category filter (exactly 6 allowed)
// Returns: category name | 'exclude' | 'borderline'
// Category names: 'Software Development' | 'Sales' | 'Marketing' | 'HR' | 'Legal' | 'Finance'
// ---------------------------------------------------------------------------

function classifyCategory(title, tags = [], apiCategory = '') {
  const t = title
  const cat = apiCategory

  // ── Pre-blocklist overrides — Revenue/GTM Ops are Sales, not generic Ops ──
  if (/revenue\s+operations|\brevops\b|gtm\s+operations|\bgtm\s+ops\b/i.test(t)) return 'Sales'

  // ── Hard blocklist — checked before include patterns ──────────────────────
  if (/customer\s+(service|support|success)|support\s+specialist|help\s+desk|\bux\s+designer\b|\bui\s+designer\b|graphic\s+designer|product\s+(manager|designer|owner|lead)|visual\s+designer|operations\s+manager|project\s+manager|program\s+manager|\bscrum\b|agile\s+coach|technical\s+writer|community\s+manager|social\s+media\s+manager|content\s+creator|data\s+entry|transcri|virtual\s+assistant|supply\s+chain|logistics|procurement|purchasing|copywriter|creative\s+director|store\s+manager|retail|barber|cleaner|cleaning|maintenance\s+(tech|planner|worker)|room\s+attendant|bell\s+(person|hop)|lifeguard|painter\b|sandblaster|infanteer|surveyor|estimator|porter\b|coffee\s+roaster|merchandis|loss\s+prevention|facilities\s+planner|operator\s+sewing|sub\s+agent|general\s+manager|cabin\s+clean|\bbusiness\s+analyst\b|\bdata\s+analyst\b|\bdata\s+label(er|ing)\b|annotation\s+specialist|\bai\s+trainer\b|model\s+eval(uator)?|travel\s+consultant|\bfleet\s+|\btechnical\s+evangelist\b|\bdeveloper\s+evangelist\b/i.test(t)) return 'exclude'

  // ── Software Development / Engineering ───────────────────────────────────
  if (/\b(software\s+engineer|software\s+developer|software\s+architect|web\s+developer|backend\s+engineer|frontend\s+engineer|front.?end\s+engineer|full.?stack\s+engineer|full.?stack\s+developer|mobile\s+engineer|mobile\s+developer|ios\s+engineer|android\s+engineer|devops\s+engineer|\bsre\b|site\s+reliability\s+engineer|platform\s+engineer|data\s+engineer|ml\s+engineer|machine\s+learning\s+engineer|ai\s+engineer|security\s+engineer|network\s+engineer|solutions\s+architect|solutions\s+engineer|cloud\s+engineer|cloud\s+architect|firmware\s+engineer|embedded\s+engineer|blockchain\s+developer|data\s+scientist|programmer|developer|qa\s+engineer|quality\s+engineer|database\s+admin|\bdba\b|\bdevops\b|\bsysadmin\b|principal\s+engineer|staff\s+engineer|engineering\s+manager|infrastructure\s+engineer|implementation\s+engineer)\b/i.test(t)) return 'Software Development'
  if (/\bsoftware.?dev(elopment)?\b|\bdevops\b|\bsysadmin\b|\bdata\s+science\b|\bmachine\s+learning\b/i.test(cat)) return 'Software Development'

  // ── Sales ─────────────────────────────────────────────────────────────────
  if (/\bsales\b|account\s+executive|account\s+manager|business\s+development|\bbdr\b|\bsdr\b|\badr\b|sales\s+engineer|inside\s+sales/i.test(t)) return 'Sales'
  if (/\bsales\b/i.test(cat) && !/engineer|software|developer/i.test(t)) return 'Sales'

  // ── Marketing ─────────────────────────────────────────────────────────────
  if (/\bmarketing\b|\bseo\b|content\s+market|email\s+market|digital\s+market|growth\s+market|brand\s+manager|demand\s+gen(eration)?|performance\s+market|paid\s+(media|social|search|ads)|affiliate\s+market|\bgrowth\s+manager\b|\bhead\s+of\s+growth\b|\bgrowth\s+lead\b/i.test(t)) return 'Marketing'
  if (/\bmarketing\b/i.test(cat) && /\bmarketing\b/i.test(t)) return 'Marketing'

  // ── HR / Human Resources ──────────────────────────────────────────────────
  if (/human\s+resources|\bhr\b|recruiter|recruiting|talent\s+acquisition|people\s+ops|people\s+operations|hr\s+manager|hr\s+director|workforce\s+planning|\bhrbp\b|compensation\s+(&\s+benefits|analyst|manager|specialist|director)|employee\s+relations|talent\s+partner/i.test(t)) return 'HR'
  if (/\bhuman\s+resources\b|\brecruiter\b|\btalent\s+acquisition\b/i.test(cat)) return 'HR'

  // ── Legal ─────────────────────────────────────────────────────────────────
  if (/\blegal\b|\bcounsel\b|compliance\s+(officer|manager|analyst|specialist|director|lead)|paralegal|\battorney\b|\blawyer\b|contract\s+manager|general\s+counsel|in.?house\s+counsel|gdpr|privacy\s+counsel|legal\s+ops/i.test(t)) return 'Legal'
  if (/\blegal\b/i.test(cat) && /\blegal\b|\bcounsel\b|\bcompliance\b|\bparalegal\b|\battorney\b/i.test(t)) return 'Legal'

  // ── Finance ───────────────────────────────────────────────────────────────
  if (/\bfinance\b|\bfinancial\b|accountant|accounting|\bcfo\b|\bcontroller\b|\bfp&a\b|\bfpa\b|bookkeeper|payroll|treasury|tax\s+specialist|financial\s+analyst|revenue\s+analyst|financial\s+controller|\baudit\b|financial\s+reporting/i.test(t)) return 'Finance'
  if (/\bfinance\b|\baccounting\b/i.test(cat) && /\bfinance\b|\bfinancial\b|\baccountant\b|\baccounting\b|\bpayroll\b|\baudit\b/i.test(t)) return 'Finance'

  // ── Secondary exclude by api_category (if clearly out of scope) ───────────
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
   • Any country/region (USA, UK, EMEA, APAC, Canada, India, etc.) — region-restricted listings are now accepted
   EXCLUDE only if: the description requires working specific hours in a timezone that effectively excludes Pakistani candidates (e.g. "must be available 9am-5pm EST", "US business hours required").

Title: ${listing.title}
Category/Tags: ${(listing.tags ?? []).join(', ')}
Company: ${listing.company_name}
Region/Location: ${listing.region}
Description: ${(listing.short_summary ?? '').slice(0, 400)}

Reply with ONLY one of these exact strings: "Software Development", "Sales", "Marketing", "HR", "Legal", "Finance", or "exclude".`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 20,
      messages: [{ role: 'user', content: prompt }],
    })
    const reply = msg.content[0].text.trim()
    const VALID = ['Software Development', 'Sales', 'Marketing', 'HR', 'Legal', 'Finance']
    return VALID.find((c) => reply.toLowerCase() === c.toLowerCase()) ?? 'exclude'
  } catch (err) {
    console.error('  Claude error:', err.message)
    return 'exclude' // safe default — exclude on error rather than pollute feed
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripHtml(html, maxLen = Infinity) {
  return (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

function deriveSeniority(title) {
  const t = title.toLowerCase()
  if (/senior|lead|principal|staff|\bhead of\b|\bvp\b|director/.test(t)) return 'senior'
  if (/junior|entry.?level|intern|graduate|associate|trainee/.test(t)) return 'entry'
  return 'mid'
}

function googleFaviconUrl(domain) {
  if (!domain) return null
  const d = domain.replace(/^https?:\/\//, '').split('/')[0]
  return `https://www.google.com/s2/favicons?domain=${d}&sz=128`
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
    logo_url: logo_url || googleFaviconUrl(domain),
    website: website || null,
    industry: null,
    pakistan_friendly: false,
  }).select('id').single()

  if (error) { console.error(`  Company insert failed (${name}):`, error.message); return null }
  companyCache[name] = data.id
  return data.id
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
    // Expansion: Sales
    docusign: 'DocuSign', ringcentral: 'RingCentral', talkdesk: 'Talkdesk',
    sprinklr: 'Sprinklr', seismic: 'Seismic', highspot: 'Highspot',
    clari: 'Clari', cognism: 'Cognism', zoominfo: 'ZoomInfo', chorus: 'Chorus.ai',
    mindtickle: 'Mindtickle', showpad: 'Showpad', mediafly: 'Mediafly',
    qatalog: 'Qatalog', memrise: 'Memrise',
    // Expansion: Marketing
    semrush: 'Semrush', moz: 'Moz', omnisend: 'Omnisend', sendgrid: 'SendGrid',
    postmarkapp: 'Postmark', campaignmonitor: 'Campaign Monitor', drip: 'Drip',
    mailerlite: 'MailerLite', moosend: 'Moosend', unbounce: 'Unbounce',
    hotjar: 'Hotjar', contentsquare: 'Contentsquare', userleap: 'Sprig',
    // Expansion: Finance
    expensify: 'Expensify', bill: 'Bill.com', tipalti: 'Tipalti',
    coupa: 'Coupa', zuora: 'Zuora', recurly: 'Recurly', avalara: 'Avalara',
    taxjar: 'TaxJar', ramp: 'Ramp', airbase: 'Airbase', spendesk: 'Spendesk',
    pleo: 'Pleo', payhawk: 'Payhawk', soldo: 'Soldo', netsuite: 'NetSuite',
    floqast: 'FloQast', workiva: 'Workiva', vena: 'Vena Solutions',
    // Expansion: HR
    bamboohr: 'BambooHR', justworks: 'Justworks', zenefits: 'Zenefits',
    leapsome: 'Leapsome', namely: 'Namely', peoplehum: 'peopleHum',
    springworks: 'Springworks', keka: 'Keka', darwinbox: 'Darwinbox',
    oysterhr: 'Oyster HR', multiplier: 'Multiplier',
    // Expansion: Legal
    evisort: 'Evisort', contractbook: 'Contractbook', spotdraft: 'SpotDraft',
    linksquares: 'LinkSquares', lexion: 'Lexion',
    mycase: 'MyCase', smokeball: 'Smokeball',
    // Corrected slugs
    sourcegraph91: 'Sourcegraph', gongio: 'Gong', realtimeboardglobal: 'Miro',
    automatticcareers: 'Automattic',
    // New additions
    mixpanel: 'Mixpanel', labelbox: 'Labelbox',
    grafanalabs: 'Grafana Labs', launchdarkly: 'LaunchDarkly', honeycomb: 'Honeycomb.io',
    zscaler: 'Zscaler', securityscorecard: 'SecurityScorecard', chainguard: 'Chainguard',
    scaleai: 'Scale AI', assemblyai: 'AssemblyAI', gleanwork: 'Glean',
    customerio: 'Customer.io', '6sense': '6sense', dialpad: 'Dialpad',
    smartsheet: 'Smartsheet', samsara: 'Samsara', tripactions: 'Navan',
    mercury: 'Mercury', gocardless: 'GoCardless', tipaltisolutions: 'Tipalti',
    lithic: 'Lithic', upwork: 'Upwork', liveperson: 'LivePerson', storyblok: 'Storyblok',
  }

  // Process in batches to avoid holding all full-description HTML in memory simultaneously
  const GH_BATCH = 4
  const heartbeat = setInterval(() => {
    process.stdout.write(`  [heartbeat] ${done}/${GREENHOUSE_SLUGS.length} Greenhouse boards done so far...\n`)
  }, 30000)
  for (let b = 0; b < GREENHOUSE_SLUGS.length; b += GH_BATCH) {
    await Promise.allSettled(
      GREENHOUSE_SLUGS.slice(b, b + GH_BATCH).map(async (slug) => {
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
          const fullDesc = stripHtml(j.content ?? '', 3000)
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
            short_summary: fullDesc.slice(0, 500),
            _fullDesc: fullDesc,
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
  }
  clearInterval(heartbeat)

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
    // Existing additions
    duckduckgo: 'DuckDuckGo', wikimedia: 'Wikimedia Foundation',
    close: 'Close', helpscout: 'Help Scout', percona: 'Percona',
    'dbt-labs': 'dbt Labs', turing: 'Turing',
    // Expansion: Sales / Marketing
    talkdesk: 'Talkdesk', sprinklr: 'Sprinklr', seismic: 'Seismic',
    highspot: 'Highspot', clari: 'Clari', semrush: 'Semrush',
    mailchimp: 'Mailchimp', sendgrid: 'SendGrid', omnisend: 'Omnisend',
    drip: 'Drip', unbounce: 'Unbounce', hootsuite: 'Hootsuite',
    // Expansion: Finance
    expensify: 'Expensify', tipalti: 'Tipalti', recurly: 'Recurly',
    ramp: 'Ramp', spendesk: 'Spendesk', pleo: 'Pleo', vena: 'Vena Solutions',
    // Expansion: HR
    bamboohr: 'BambooHR', leapsome: 'Leapsome', namely: 'Namely',
    greenhouse: 'Greenhouse', lever: 'Lever', oysterhr: 'Oyster HR',
    multiplier: 'Multiplier',
    // Expansion: Legal
    contractbook: 'Contractbook', spotdraft: 'SpotDraft',
    evisort: 'Evisort', lexion: 'Lexion',
    // New additions
    pipedrive: 'Pipedrive', sonatype: 'Sonatype',
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
          const fullDesc = stripHtml(descText, 3000)

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
            short_summary: fullDesc.slice(0, 500),
            _fullDesc: fullDesc,
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
  // Paginate to avoid Supabase's 1000-row default cap
  const existingUrls = new Set()
  {
    let from = 0
    while (true) {
      const { data, error: existErr } = await sb.from('listings').select('original_url').range(from, from + 999)
      if (existErr) { console.error('Could not query listings:', existErr.message); process.exit(1) }
      if (!data || data.length === 0) break
      for (const r of data) existingUrls.add(r.original_url)
      if (data.length < 1000) break
      from += 1000
    }
  }

  const { count: companyCount } = await sb.from('companies').select('*', { count: 'exact', head: true })
  console.log(`DB state: ${existingUrls.size} listings, ${companyCount ?? '?'} companies\n`)

  // ── Fetch all sources (sequentially to keep output readable) ──────────────
  console.log('=== Fetching sources ===')
  const sourceResults = {}

  for (const [name, fn] of [
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

  // ── Stage 1: Region tagging ───────────────────────────────────────────────
  console.log('\n=== Stage 1: Region tagging ===')
  const regionTagCounts = {}
  let regionRejected = 0
  const regionRejectedBySource = {}
  const afterRegion = []
  const timezoneBorderline = []

  for (const j of afterLanguage) {
    const region = classifyRegion(j.location, j._source)
    if (!region) {
      regionRejected++
      regionRejectedBySource[j._source] = (regionRejectedBySource[j._source] ?? 0) + 1
      continue
    }

    // Scan full description for explicit region restrictions that the location
    // field may have missed (e.g. location = "Remote" but body = "US only")
    const { confidence, correctedRegion } = classifyRegionConfidence(region, j._fullDesc ?? j.short_summary)
    j._region = correctedRegion
    j._regionConfidence = confidence
    delete j._fullDesc // no longer needed after this point

    regionTagCounts[correctedRegion] = (regionTagCounts[correctedRegion] ?? 0) + 1

    // Timezone restriction in Worldwide listings → borderline for Claude adjudication
    if (correctedRegion === 'Worldwide' && hasTimezoneRestriction(j.short_summary)) {
      j._tzFlagged = true
      timezoneBorderline.push(j)
    } else {
      afterRegion.push(j)
    }
  }

  const tzBorderlineCount = timezoneBorderline.length
  console.log(`  Pass: ${afterRegion.length}  TZ-borderline (Worldwide): ${tzBorderlineCount}  Rejected (in-office): ${regionRejected}`)
  console.log(`  Region breakdown:`)
  for (const [region, count] of Object.entries(regionTagCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${region.padEnd(16)} ${count}`)
  }
  for (const [src, n] of Object.entries(regionRejectedBySource)) {
    console.log(`  Rejected from ${src}: ${n}`)
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
    if (verdict !== 'exclude' && verdict !== 'borderline') { j._category = verdict; include.push(j) }
    else if (verdict === 'borderline') borderline.push(j)
    else {
      categoryRejected++
      catRejectedBySource[j._source] = (catRejectedBySource[j._source] ?? 0) + 1
    }
  }

  // TZ-flagged jobs also go through category filter first, then to Claude
  for (const j of timezoneBorderline) {
    const verdict = classifyCategory(j.title, j.tags, j.api_category)
    if (verdict !== 'exclude' && verdict !== 'borderline') borderline.push(j) // Claude will re-check TZ
    else if (verdict === 'borderline') borderline.push(j)
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
          region: j._region,
          tags: j.tags,
          short_summary: j.short_summary,
        })
        console.log(verdict)
        if (verdict !== 'exclude') { j._category = verdict; include.push(j); claudeIncluded++ }
        else claudeExcluded++
      }
      console.log(`  Claude result: ${claudeIncluded} included, ${claudeExcluded} excluded`)
    }
  }

  // ── Summary before insert ─────────────────────────────────────────────────
  const totalRejected = langRejected.total + regionRejected + categoryRejected + claudeExcluded
  console.log(`\n=== Pre-insert summary ===`)
  console.log(`  Raw fetched:          ${allJobs.length}`)
  console.log(`  New (deduped):        ${newJobs.length}`)
  console.log(`  Language rejected:    ${langRejected.total}`)
  console.log(`  Region rejected:      ${regionRejected}`)
  console.log(`  TZ-flagged→Claude:    ${tzBorderlineCount}`)
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
      region_eligibility: job._region,
      region_confidence: job._regionConfidence ?? 'unclear',
      category: job._category ?? null,
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
      insertedListings.push({ title: job.title, company: job.company_name, region: job._region, source: job._source })
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
  console.log(`  Region rejected:      ${regionRejected}`)
  console.log(`  TZ-borderlined:       ${tzBorderlineCount}`)
  console.log(`  Category rejected:    ${categoryRejected}`)
  console.log(`  Claude sent:          ${borderline.length}  (included: ${claudeIncluded}, excluded: ${claudeExcluded})`)
  console.log(`\nDB outcome:`)
  console.log(`  Inserted:  ${inserted}`)
  console.log(`  Failed:    ${failed}`)
  console.log(`  Unique companies represented: ${sortedCompanies.length}`)

  const insertedRegionCounts = {}
  for (const l of insertedListings) {
    insertedRegionCounts[l.region] = (insertedRegionCounts[l.region] ?? 0) + 1
  }
  console.log(`\nRegion breakdown (inserted):`)
  for (const [region, count] of Object.entries(insertedRegionCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(4)}x  ${region}`)
  }

  console.log(`\nCompany breakdown (${sortedCompanies.length} unique):`)
  for (const [company, count] of sortedCompanies) {
    console.log(`  ${String(count).padStart(3)}x  ${company}`)
  }

  console.log(`\nInserted listings:`)
  insertedListings.forEach((l, i) =>
    console.log(`  ${String(i + 1).padStart(3)}. [${l.source.padEnd(12)}] ${l.title.slice(0, 43).padEnd(43)} @ ${l.company} (${l.region})`)
  )
}

ingest().catch(console.error)
