/**
 * Salary estimate backfill — writes "EST $XX,XXX - $XX,XXX/year" to listings
 * that have no salary_range. Targets pinned/showcase companies first, then
 * any Worldwide listing without salary data.
 *
 * Usage: ANTHROPIC_API_KEY=sk-... node backfill-salaries.mjs
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://disouyodepqsbsmomkzj.supabase.co'
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpc291eW9kZXBxc2JzbW9ta3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUyODk5NywiZXhwIjoyMTAyMTA0OTk3fQ.Li4QdLi09i65chPFN5pbX3RQVn0iAkLO3eFhZ8cFWXk'

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PINNED_COMPANIES = ['Canonical', 'GitLab', 'Stripe', 'Twilio', 'Anthropic', 'Dropbox']

// Fetch listings without salary: pinned companies first, then other Worldwide
const { data: pinned } = await sb
  .from('listings')
  .select('id, title, seniority, category, companies(name)')
  .eq('is_active', true)
  .is('salary_range', null)
  .in('companies.name', PINNED_COMPANIES)
  .limit(60)

const { data: worldwide } = await sb
  .from('listings')
  .select('id, title, seniority, category, companies(name)')
  .eq('is_active', true)
  .eq('region_eligibility', 'Worldwide')
  .is('salary_range', null)
  .limit(100)

// Deduplicate and cap total at 120
const seen = new Set()
const targets = []
for (const l of [...(pinned ?? []), ...(worldwide ?? [])]) {
  if (seen.has(l.id)) continue
  seen.add(l.id)
  targets.push(l)
  if (targets.length >= 120) break
}

console.log(`Estimating salaries for ${targets.length} listings...`)

let updated = 0, failed = 0

for (const listing of targets) {
  const company = Array.isArray(listing.companies) ? listing.companies[0] : listing.companies
  const title = listing.title
  const seniority = listing.seniority ?? 'mid'
  const dept = listing.category ?? ''
  const companyName = company?.name ?? 'unknown company'

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 40,
      messages: [{
        role: 'user',
        content: `Estimate the annual USD salary range for this remote tech job:
Title: ${title}
Company: ${companyName}
Seniority: ${seniority}
Department: ${dept}

Reply with ONLY the salary range in this exact format: $XX,XXX - $XX,XXX/year
No explanation, no other text. Base it on typical remote market rates for international tech companies.`,
      }],
    })

    const raw = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : ''
    // Validate it looks like a salary range
    if (!/\$[\d,]/.test(raw)) {
      console.log(`  [skip] ${title} — unexpected format: ${raw}`)
      failed++
      continue
    }

    const salaryRange = `EST ${raw}`

    const { error } = await sb
      .from('listings')
      .update({ salary_range: salaryRange })
      .eq('id', listing.id)

    if (error) {
      console.log(`  [fail] ${title}: ${error.message}`)
      failed++
    } else {
      console.log(`  [ok] ${companyName} — ${title}: ${salaryRange}`)
      updated++
    }
  } catch (e) {
    console.log(`  [error] ${title}: ${e.message}`)
    failed++
  }
}

console.log(`\nDone. Updated: ${updated}  Failed/skipped: ${failed}`)
