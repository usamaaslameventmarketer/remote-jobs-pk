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

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const vars = Object.fromEntries(
  env.split('\n')
    .filter(l => l.includes('='))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()] })
)

const sb = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.NEXT_PUBLIC_SUPABASE_ANON_KEY)

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
    .select('id, title, tags, region_eligibility, category')
    .range(offset, offset + PAGE - 1)
    .order('id')

  if (error) { console.error('Fetch error:', error.message); process.exit(1) }
  if (!data || data.length === 0) break

  totalFetched += data.length

  const updates = data.map(row => {
    const newRegion = rollupRegion(row.region_eligibility)
    const newCategory = row.category ?? deriveCategory(row.title, row.tags)
    return { id: row.id, region_eligibility: newRegion, category: newCategory }
  })

  // Batch update — Supabase doesn't support bulk upsert with different values per row,
  // so we do individual updates in parallel chunks
  const CHUNK = 50
  for (let i = 0; i < updates.length; i += CHUNK) {
    const chunk = updates.slice(i, i + CHUNK)
    await Promise.all(chunk.map(({ id, region_eligibility, category }) =>
      sb.from('listings').update({ region_eligibility, category }).eq('id', id)
    ))
    totalUpdated += chunk.length
    process.stdout.write(`\rUpdated ${totalUpdated}/${totalFetched} listings...`)
  }

  if (data.length < PAGE) break
  offset += PAGE
}

console.log(`\nDone. ${totalUpdated} listings updated.`)

// Summary
const { data: summary } = await sb
  .from('listings')
  .select('region_eligibility, category')

const regionCounts = {}
const categoryCounts = {}
for (const r of summary ?? []) {
  regionCounts[r.region_eligibility] = (regionCounts[r.region_eligibility] ?? 0) + 1
  categoryCounts[r.category ?? 'null'] = (categoryCounts[r.category ?? 'null'] ?? 0) + 1
}

console.log('\nRegion breakdown:')
for (const [k, v] of Object.entries(regionCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`)
}
console.log('\nCategory breakdown:')
for (const [k, v] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`)
}
