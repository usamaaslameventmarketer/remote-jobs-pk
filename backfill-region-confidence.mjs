/**
 * backfill-region-confidence.mjs
 *
 * One-time backfill: scan every active listing's stored description for
 * explicit region-restriction phrases, then set region_confidence and
 * (where needed) correct region_eligibility.
 *
 * PREREQUISITE — run this SQL in Supabase SQL Editor first:
 *   ALTER TABLE listings ADD COLUMN IF NOT EXISTS region_confidence text DEFAULT 'unclear';
 *
 * Usage:
 *   node backfill-region-confidence.mjs           -- dry run (prints report, no writes)
 *   node backfill-region-confidence.mjs --write   -- applies changes to DB
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://disouyodepqsbsmomkzj.supabase.co'
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpc291eW9kZXBxc2JzbW9ta3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUyODk5NywiZXhwIjoyMTAyMTA0OTk3fQ.Li4QdLi09i65chPFN5pbX3RQVn0iAkLO3eFhZ8cFWXk'

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')

// ---------------------------------------------------------------------------
// Same patterns as ingest.mjs — keep in sync
// ---------------------------------------------------------------------------

const REGION_EXCLUSION_RE = /\b(?:US|U\.S\.|United States|USA)\s*-?\s*only\b|\bonly\s+(?:open\s+to|for|hiring)\s+(?:candidates?|applicants?|residents?|citizens?)?\s*(?:based\s+in|in|from)\s+(?:the\s+)?(?:US\b|United States|USA\b|UK\b|United Kingdom|Canada\b|Australia\b)\b|\bmust\s+(?:be\s+)?(?:based|located?|resid(?:e|ing)|living?|work(?:ing)?)\s+(?:in|within)\s+(?:the\s+)?(?:US\b|U\.S\b|United States|USA\b|UK\b|United Kingdom|Canada\b|Australia\b|Germany\b|France\b|Netherlands\b|European Union\b)\b|\bauthori[sz]ed?\s+to\s+work\s+in\s+(?:the\s+)?(?:US\b|U\.S\b|United States|USA\b|UK\b|United Kingdom)\b|\blegally\s+(?:authorized?|eligible|permitted)\s+to\s+work\s+in\b|\bwork\s+authori[sz]ation\s+(?:in|for)\s+(?:the\s+)?(?:US\b|United States|UK\b|United Kingdom)\b|\bthis\s+(?:role|position|job)\s+is\s+(?:only\s+)?(?:open|available)\s+to\s+(?:candidates?|applicants?)\s+(?:based\s+)?in\b|\bcandidates?\s+must\s+be\s+(?:based|located?|resident)\s+in\b|\b(?:US|United States|USA|Canada|UK|United Kingdom|Australia|EU|European Union)\s+(?:citizens?|residents?|nationals?)\s+only\b|\bno\s+(?:visa|work\s+visa)\s+sponsorship\b/i

const REGION_OPEN_RE = /\bhire\s+(?:globally|worldwide|internationally|from\s+anywhere|from\s+any\s+country)\b|\bwork\s+from\s+anywhere\b|\bno\s+geographic\s+restrictions?\b|\bglobally\s+distributed\b|\blocation\s+(?:independent|agnostic)\b|\bopen\s+to\s+(?:all\s+countries|candidates?\s+(?:anywhere|worldwide|globally|from\s+any\s+country))\b|\bwelcome\s+candidates?\s+from\s+(?:any|all)\s+(?:country|countries|location)\b|\bhire\s+in\s+any\s+country\b|\bfully\s+distributed\s+team\b/i

function classifyRegionConfidence(region, description) {
  const text = description ?? ''

  if (REGION_EXCLUSION_RE.test(text)) {
    const correctedRegion = region === 'Worldwide' ? restrictionToRegion(text) : region
    return { confidence: 'restricted_other_region', correctedRegion }
  }

  if (region === 'Worldwide') {
    if (REGION_OPEN_RE.test(text)) return { confidence: 'confirmed_open', correctedRegion: region }
    return { confidence: 'unclear', correctedRegion: region }
  }

  return { confidence: 'unclear', correctedRegion: region }
}

function restrictionToRegion(text) {
  if (/\b(?:US|U\.S\.|United States|USA|Canada|LATAM|Latin America)\b/i.test(text)) return 'USA'
  if (/\b(?:UK|United Kingdom|Britain|England)\b/i.test(text)) return 'UK'
  if (/\b(?:EU|European Union|Germany|France|Netherlands|Spain|Italy|Poland)\b/i.test(text)) return 'EMEA'
  if (/\b(?:Australia|New Zealand|ANZ)\b/i.test(text)) return 'APAC'
  return 'USA'
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log(`Mode: ${WRITE ? 'WRITE (changes will be applied)' : 'DRY RUN (no changes written)'}`)
console.log('Fetching active listings...\n')

// Fetch without region_confidence first to test if column exists
const { data: listings, error } = await sb
  .from('listings')
  .select('id, region_eligibility, short_summary')
  .eq('is_active', true)

if (error) { console.error('Failed to fetch listings:', error.message); process.exit(1) }

console.log(`Found ${listings.length} active listings\n`)

const buckets = { confirmed_open: [], unclear: [], restricted_other_region: [] }
const corrections = []

for (const row of listings) {
  // Note: short_summary is only 500 chars — best effort; restrictions later
  // in the description may not be caught. Future ingests use full descriptions.
  const { confidence, correctedRegion } = classifyRegionConfidence(
    row.region_eligibility,
    row.short_summary ?? ''
  )

  buckets[confidence].push(row.id)

  const regionChanged = correctedRegion !== row.region_eligibility

  // Always collect — every row needs region_confidence written (column is new)
  corrections.push({ id: row.id, confidence, correctedRegion, regionChanged, prev: row.region_eligibility })
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log('=== Region confidence breakdown ===')
console.log(`  confirmed_open:          ${buckets.confirmed_open.length}`)
console.log(`  unclear:                 ${buckets.unclear.length}`)
console.log(`  restricted_other_region: ${buckets.restricted_other_region.length}`)
console.log(`  Total listings:          ${listings.length}\n`)

const regionFixes = corrections.filter(c => c.regionChanged)
console.log(`=== Region eligibility corrections (${regionFixes.length}) ===`)
for (const c of regionFixes) {
  console.log(`  ${c.id.slice(0, 8)}…  ${c.prev} → ${c.correctedRegion}  [${c.confidence}]`)
}

console.log(`\n=== Confidence changes (${corrections.length} total rows to update) ===`)
console.log(`  (${corrections.filter(c => !c.regionChanged).length} confidence-only, ${regionFixes.length} also have region fix)\n`)

if (!WRITE) {
  console.log('DRY RUN complete — rerun with --write to apply changes.')
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Write changes in batches
// ---------------------------------------------------------------------------

console.log('Applying updates...')
let updated = 0
let failed = 0

// Batch corrections by (confidence, correctedRegion) to minimise round-trips
const groups = {}
for (const c of corrections) {
  const key = `${c.confidence}|${c.correctedRegion}`
  if (!groups[key]) groups[key] = { confidence: c.confidence, correctedRegion: c.correctedRegion, ids: [] }
  groups[key].ids.push(c.id)
}

for (const { confidence, correctedRegion, ids } of Object.values(groups)) {
  const { error: ue } = await sb
    .from('listings')
    .update({ region_confidence: confidence, region_eligibility: correctedRegion })
    .in('id', ids)

  if (ue) {
    console.error(`  Failed batch (${confidence}/${correctedRegion}):`, ue.message)
    failed += ids.length
  } else {
    updated += ids.length
    console.log(`  Updated ${ids.length} → ${confidence} / ${correctedRegion}`)
  }
}

console.log(`\n=== Done ===`)
console.log(`  Updated: ${updated}`)
console.log(`  Failed:  ${failed}`)
console.log(`  Region fixes applied: ${regionFixes.length}`)
