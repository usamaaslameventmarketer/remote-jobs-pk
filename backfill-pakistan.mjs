/**
 * backfill-pakistan.mjs
 *
 * Recovery pass: scan every active listing's stored description for explicit
 * Pakistan / South Asia mentions, then re-tag matching listings with
 * region_eligibility='Pakistan' and region_confidence='confirmed_open'.
 *
 * Also counts how many listings are already tagged 'Pakistan' (from the
 * location field), giving a full picture of historically-missed PK roles.
 *
 * Usage:
 *   node backfill-pakistan.mjs           -- dry run (prints report, no writes)
 *   node backfill-pakistan.mjs --write   -- applies changes to DB
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://disouyodepqsbsmomkzj.supabase.co'
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpc291eW9kZXBxc2JzbW9ta3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUyODk5NywiZXhwIjoyMTAyMTA0OTk3fQ.Li4QdLi09i65chPFN5pbX3RQVn0iAkLO3eFhZ8cFWXk'

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')

// ---------------------------------------------------------------------------
// Same pattern as ingest.mjs — keep in sync
// ---------------------------------------------------------------------------

// Exclusion check takes priority — if a description says "US only" we don't
// want to upgrade it to Pakistan even if "Pakistan" appears elsewhere.
const REGION_EXCLUSION_RE = /\b(?:US|U\.S\.|United States|USA)\s*-?\s*only\b|\bonly\s+(?:open\s+to|for|hiring)\s+(?:candidates?|applicants?|residents?|citizens?)?\s*(?:based\s+in|in|from)\s+(?:the\s+)?(?:US\b|United States|USA\b|UK\b|United Kingdom|Canada\b|Australia\b)\b|\bmust\s+(?:be\s+)?(?:based|located?|resid(?:e|ing)|living?|work(?:ing)?)\s+(?:in|within)\s+(?:the\s+)?(?:US\b|U\.S\b|United States|USA\b|UK\b|United Kingdom|Canada\b|Australia\b|Germany\b|France\b|Netherlands\b|European Union\b)\b|\bauthori[sz]ed?\s+to\s+work\s+in\s+(?:the\s+)?(?:US\b|U\.S\b|United States|USA\b|UK\b|United Kingdom)\b|\blegally\s+(?:authorized?|eligible|permitted)\s+to\s+work\s+in\b|\bwork\s+authori[sz]ation\s+(?:in|for)\s+(?:the\s+)?(?:US\b|United States|UK\b|United Kingdom)\b|\bthis\s+(?:role|position|job)\s+is\s+(?:only\s+)?(?:open|available)\s+to\s+(?:candidates?|applicants?)\s+(?:based\s+)?in\b|\bcandidates?\s+must\s+be\s+(?:based|located?|resident)\s+in\b|\b(?:US|United States|USA|Canada|UK|United Kingdom|Australia|EU|European Union)\s+(?:citizens?|residents?|nationals?)\s+only\b|\bno\s+(?:visa|work\s+visa)\s+sponsorship\b/i

const PAKISTAN_POSITIVE_RE = /\bpakistan(?:i|is)?\b|\bsouth[\s-]?asia\b/i

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log(`Mode: ${WRITE ? 'WRITE (changes will be applied)' : 'DRY RUN (no changes written)'}`)
console.log('Fetching active listings...\n')

// Paginate to handle large tables (Supabase default cap = 1000 rows)
const allListings = []
let from = 0
while (true) {
  const { data, error } = await sb
    .from('listings')
    .select('id, title, region_eligibility, region_confidence, short_summary, full_description')
    .eq('is_active', true)
    .range(from, from + 999)

  if (error) { console.error('Failed to fetch listings:', error.message); process.exit(1) }
  if (!data || data.length === 0) break
  allListings.push(...data)
  if (data.length < 1000) break
  from += 1000
}

console.log(`Found ${allListings.length} active listings\n`)

// ---------------------------------------------------------------------------
// Classify
// ---------------------------------------------------------------------------

const alreadyPakistan = []      // Already tagged Pakistan (from location field)
const toUpgrade = []            // Was not Pakistan, but description signals PK
const excluded = []             // Had exclusion phrase — skipped
const noSignal = []             // No Pakistan signal found

for (const row of allListings) {
  // Check both short_summary and full_description — ingest uses full text (3000 chars)
  // but short_summary (500 chars) is what was available during earlier backfill passes
  const text = (row.full_description ?? row.short_summary ?? '')

  if (row.region_eligibility === 'Pakistan') {
    alreadyPakistan.push(row)
    continue
  }

  if (REGION_EXCLUSION_RE.test(text)) {
    excluded.push(row)
    continue
  }

  if (PAKISTAN_POSITIVE_RE.test(text)) {
    toUpgrade.push(row)
    continue
  }

  noSignal.push(row)
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log('=== Pakistan detection results ===')
console.log(`  Already tagged Pakistan (location-level):  ${alreadyPakistan.length}`)
console.log(`  Would upgrade to Pakistan (desc-level):    ${toUpgrade.length}`)
console.log(`  Skipped (has non-PK exclusion phrase):     ${excluded.length}`)
console.log(`  No Pakistan signal:                        ${noSignal.length}`)
console.log(`  Total active listings:                     ${allListings.length}\n`)

if (alreadyPakistan.length > 0) {
  console.log('=== Already Pakistan-tagged listings ===')
  for (const r of alreadyPakistan) {
    console.log(`  ${r.id.slice(0, 8)}…  [${r.region_confidence ?? 'no-conf'}]  ${r.title}`)
  }
  console.log()
}

if (toUpgrade.length > 0) {
  console.log(`=== Listings to upgrade → Pakistan (${toUpgrade.length}) ===`)
  for (const r of toUpgrade) {
    const snippet = (r.short_summary ?? '').slice(0, 120).replace(/\n/g, ' ')
    console.log(`  ${r.id.slice(0, 8)}…  ${r.region_eligibility.padEnd(12)}  ${r.title}`)
    console.log(`              "${snippet}…"`)
  }
  console.log()
}

if (!WRITE) {
  console.log('DRY RUN complete — rerun with --write to apply changes.')
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Apply upgrades
// ---------------------------------------------------------------------------

if (toUpgrade.length === 0) {
  console.log('Nothing to upgrade. Done.')
  process.exit(0)
}

console.log(`Applying ${toUpgrade.length} upgrades...`)
let updated = 0
let failed = 0

const ids = toUpgrade.map(r => r.id)
const { error: ue } = await sb
  .from('listings')
  .update({ region_eligibility: 'Pakistan', region_confidence: 'confirmed_open' })
  .in('id', ids)

if (ue) {
  console.error('  Batch update failed:', ue.message)
  failed = ids.length
} else {
  updated = ids.length
  console.log(`  Updated ${updated} listings → Pakistan / confirmed_open`)
}

console.log(`\n=== Done ===`)
console.log(`  Upgraded:  ${updated}`)
console.log(`  Failed:    ${failed}`)
console.log(`  Total Pakistan listings now: ${alreadyPakistan.length + updated}`)
