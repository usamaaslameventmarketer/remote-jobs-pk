/**
 * Backfill `category` for all existing listings and roll up `region_eligibility`
 * to the 5 canonical values: Worldwide, USA, UK, EMEA, APAC.
 *
 * Run AFTER adding the column in Supabase SQL editor:
 *   ALTER TABLE listings ADD COLUMN IF NOT EXISTS category text;
 *
 * Usage:
 *   node scripts/backfill-category.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://disouyodepqsbsmomkzj.supabase.co'
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpc291eW9kZXBxc2JzbW9ta3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUyODk5NywiZXhwIjoyMTAyMTA0OTk3fQ.Li4QdLi09i65chPFN5pbX3RQVn0iAkLO3eFhZ8cFWXk'

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ── Region rollup ─────────────────────────────────────────────────────────────

function rollupRegion(raw) {
  if (!raw) return 'Worldwide'
  const s = raw.toLowerCase().trim()

  if (/worldwide|remote from anywhere|global|international/.test(s)) return 'Worldwide'
  if (/pakistan|south asia/.test(s)) return 'Worldwide'

  if (
    /\bemea\b|\bmena\b|\bcea\b|\bcee\b/.test(s) ||
    /\beurope\b/.test(s) ||
    /\b(germany|deutschland|france|netherlands|spain|italy|sweden|norway|denmark|finland|poland|czech|austria|switzerland|belgium|portugal|ireland|romania|hungary|ukraine|israel|turkey|uae|dubai|saudi|south africa|nigeria|kenya|egypt|morocco)\b/.test(s)
  ) return 'EMEA'

  if (
    /\bapac\b|asia[- ]pacific/.test(s) ||
    /\b(india|singapore|japan|australia|new zealand|philippines|indonesia|malaysia|thailand|vietnam|south korea|hong kong|taiwan|bangladesh|sri lanka)\b/.test(s)
  ) return 'APAC'

  if (/\b(uk|united kingdom|britain|england|great britain)\b/.test(s)) return 'UK'

  if (
    /\b(usa|united states|u\.s\.|us only|america)\b/.test(s) ||
    /\bcanada\b/.test(s) ||
    /\b(latam|latin america|mexic|brazil|colombia|argentina|chile|peru|venezuela|ecuador)\b/.test(s)
  ) return 'USA'

  // Already one of the 5 canonical values?
  const CANONICAL = ['Worldwide', 'USA', 'UK', 'EMEA', 'APAC']
  const match = CANONICAL.find(c => c.toLowerCase() === s)
  if (match) return match

  // Unclassified → Worldwide (open remote)
  return 'Worldwide'
}

// ── Category derivation from title ────────────────────────────────────────────

function deriveCategory(title, tags) {
  const t = title ?? ''
  const tagStr = (tags ?? []).join(' ')
  const combined = `${t} ${tagStr}`

  if (/\b(software\s+engineer|developer|frontend|front[-\s]end|backend|back[-\s]end|full[-\s]stack|devops|sre|site\s+reliability|platform\s+engineer|data\s+engineer|ml\s+engineer|machine\s+learning|ai\s+engineer|mobile\s+engineer|ios\s+developer|android\s+developer|qa\s+engineer|test\s+engineer|security\s+engineer|infrastructure|cloud\s+engineer|solutions\s+architect|software\s+architect|engineering\s+manager|cto|vp\s+of\s+engineering|tech\s+lead|backend\s+engineer|data\s+scientist|analyst\s+engineer)\b/i.test(t)) return 'Software Development'

  if (/\bsales\b|account\s+executive|account\s+manager|business\s+development|bdr\b|sdr\b|customer\s+success|revenue\s+operations|revops\b|deal\s+desk|sales\s+engineer|solutions\s+engineer|pre[-\s]?sales|partnership|channel\s+manager|enterprise\s+account|commercial\s+manager|customer\s+acquisition/i.test(t)) return 'Sales'

  if (/\bmarketing\b|\bseo\b|\bsem\b|\bcontent\s+strat|\bcopywriter\b|\bbrand\b|\bcampaign\b|\bgrowth\s+market|\bperformance\s+market|\bproduct\s+market|\bdemand\s+gen|\bcommunity\s+manager|\bsocial\s+media\b|\bpublic\s+relations\b|\bpr\s+manager|\bemail\s+market|\baffiliate\b|\binfluencer\b/i.test(t)) return 'Marketing'

  if (/human\s+resources|\bhr\b|recruiter|talent\s+acquisition|people\s+ops|people\s+partner|workforce|hrbp\b|compensation|benefits\s+admin|payroll|l&d\b|learning\s+&\s+development|organizational\s+dev/i.test(t)) return 'HR'

  if (/\blegal\b|\bcounsel\b|attorney|paralegal|compliance\s+officer|contract\s+manager|general\s+counsel|policy\s+advisor|privacy\s+officer|gdpr|regulatory\s+affairs/i.test(t)) return 'Legal'

  if (/\bfinance\b|\bfinancial\b|accountant|accounting|controller|cfo\b|treasury|fp&a\b|financial\s+planning|financial\s+analyst|bookkeeper|audit|tax\s+specialist|revenue\s+account|billing\s+specialist/i.test(t)) return 'Finance'

  return null // unknown — leave null
}

// ── Main ──────────────────────────────────────────────────────────────────────

const PAGE = 500
let offset = 0
let totalUpdated = 0
let totalFetched = 0

console.log('Fetching all listings...')

while (true) {
  const { data, error } = await sb
    .from('listings')
    .select('id, title, tags, region_eligibility')
    .range(offset, offset + PAGE - 1)
    .order('id')

  if (error) { console.error('Fetch error:', error.message); process.exit(1) }
  if (!data || data.length === 0) break

  totalFetched += data.length

  const updates = data.map(row => ({
    id: row.id,
    region_eligibility: rollupRegion(row.region_eligibility),
    category: deriveCategory(row.title, row.tags),
  }))

  // Pass 1: region rollup only (always safe, no new columns)
  const CHUNK = 50
  for (let i = 0; i < updates.length; i += CHUNK) {
    const chunk = updates.slice(i, i + CHUNK)
    await Promise.all(chunk.map(({ id, region_eligibility }) =>
      sb.from('listings').update({ region_eligibility }).eq('id', id)
    ))
    totalUpdated += chunk.length
    process.stdout.write(`\rRegion pass: ${totalUpdated}/${totalFetched}...`)
  }

  if (data.length < PAGE) break
  offset += PAGE
}

console.log(`\nRegion pass done. ${totalUpdated} rows updated.`)

// Pass 2: category — requires PostgREST schema cache to know about the column
console.log('\nStarting category pass...')
let catOffset = 0
let catUpdated = 0
let catErrors = 0

while (true) {
  const { data, error } = await sb
    .from('listings')
    .select('id, title, tags')
    .range(catOffset, catOffset + PAGE - 1)
    .order('id')

  if (error) { console.error('Fetch error:', error.message); process.exit(1) }
  if (!data || data.length === 0) break

  const CHUNK = 50
  for (let i = 0; i < data.length; i += CHUNK) {
    const chunk = data.slice(i, i + CHUNK)
    const results = await Promise.all(chunk.map(({ id, title, tags }) =>
      sb.from('listings').update({ category: deriveCategory(title, tags) }).eq('id', id)
    ))
    for (const { error: e } of results) {
      if (e) { catErrors++; if (catErrors === 1) console.error('\nCategory update error:', e.message) }
      else catUpdated++
    }
    process.stdout.write(`\rCategory pass: ${catUpdated + catErrors}/${totalFetched}...`)
  }

  if (data.length < PAGE) break
  catOffset += PAGE
}

if (catErrors > 0) {
  console.log(`\n⚠️  ${catErrors} category updates failed (schema cache not ready yet).`)
  console.log('   Go to Supabase dashboard → Project Settings → API → Reload schema cache')
  console.log('   Then re-run this script.')
} else {
  console.log(`\nCategory pass done. ${catUpdated} rows updated.`)
}

// Summary
const { data: summary } = await sb.from('listings').select('region_eligibility')
const regionCounts = {}
for (const r of summary ?? []) {
  regionCounts[r.region_eligibility] = (regionCounts[r.region_eligibility] ?? 0) + 1
}
console.log('\nRegion breakdown:')
for (const [k, v] of Object.entries(regionCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`)
}

