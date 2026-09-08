/**
 * Rule-based salary backfill — no AI API needed.
 * Estimates based on seniority/title keywords and department.
 * Only updates listings still missing salary_range.
 *
 * Usage: node backfill-salaries-simple.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://disouyodepqsbsmomkzj.supabase.co'
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpc291eW9kZXBxc2JzbW9ta3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUyODk5NywiZXhwIjoyMTAyMTA0OTk3fQ.Li4QdLi09i65chPFN5pbX3RQVn0iAkLO3eFhZ8cFWXk'

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// Estimate salary range based on title + seniority + category
function estimateSalary(title, seniority, category) {
  const t = title.toLowerCase()
  const s = seniority ?? 'mid'
  const dept = (category ?? '').toLowerCase()

  // Executive / VP / C-level
  if (/\b(vp|vice president|chief|cto|cso|cpo|coo|cfo|evp|svp)\b/.test(t)) {
    return 'EST $200,000 - $320,000/year'
  }

  // Director
  if (/\bdirector\b/.test(t)) {
    return 'EST $160,000 - $250,000/year'
  }

  // Head of / Principal
  if (/\bhead of\b|\bprincipal\b/.test(t)) {
    return 'EST $160,000 - $240,000/year'
  }

  // Staff engineer
  if (/\bstaff\b/.test(t) && /engineer|developer|architect|sre|devops/.test(t)) {
    return 'EST $180,000 - $260,000/year'
  }

  // Manager
  if (/\bmanager\b/.test(t)) {
    if (s === 'senior' || /senior|sr\./i.test(t)) return 'EST $150,000 - $220,000/year'
    return 'EST $120,000 - $180,000/year'
  }

  // Senior / Sr roles by department
  if (s === 'senior' || /\bsenior\b|\bsr\b/.test(t)) {
    if (dept.includes('software') || /engineer|developer|architect|sre|platform|backend|frontend|full.?stack/.test(t)) {
      return 'EST $160,000 - $230,000/year'
    }
    if (dept.includes('sales') || /account executive|sales|revenue/.test(t)) {
      return 'EST $130,000 - $200,000/year'
    }
    if (dept.includes('marketing') || /marketing|growth/.test(t)) {
      return 'EST $120,000 - $180,000/year'
    }
    return 'EST $130,000 - $190,000/year'
  }

  // Mid-level by department
  if (s === 'mid' || /\bmid.?level\b/.test(t)) {
    if (dept.includes('software') || /engineer|developer|architect|sre|platform/.test(t)) {
      return 'EST $110,000 - $160,000/year'
    }
    if (dept.includes('sales') || /account executive|sales/.test(t)) {
      return 'EST $80,000 - $130,000/year'
    }
    return 'EST $90,000 - $140,000/year'
  }

  // Entry level
  if (s === 'entry' || /\bintern\b|\bjunior\b|\bassociate\b|\bgraduate\b|\bsdr\b|\bsales development\b/.test(t)) {
    return 'EST $45,000 - $80,000/year'
  }

  // Architect / Solutions Architect / Solutions Engineer
  if (/\barchitect\b|\bsolutions engineer\b/.test(t)) {
    return 'EST $150,000 - $220,000/year'
  }

  // Account Executive (no seniority qualifier)
  if (/account executive/.test(t)) {
    return 'EST $100,000 - $160,000/year'
  }

  // Recruiter / HR
  if (/recruit|talent|people partner|hris|hr/.test(t)) {
    return 'EST $70,000 - $110,000/year'
  }

  // Finance / Accounting
  if (dept.includes('finance') || /finance|accounting|fp&a|analyst/.test(t)) {
    return 'EST $80,000 - $130,000/year'
  }

  // Catch-all by seniority
  const fallbacks = {
    senior: 'EST $130,000 - $190,000/year',
    mid: 'EST $90,000 - $140,000/year',
    entry: 'EST $50,000 - $80,000/year',
  }
  return fallbacks[s] ?? 'EST $90,000 - $140,000/year'
}

// Fetch all active listings still missing salary, ordered by date_added DESC
// so the most recently added (and most visible) listings are prioritised
const { data: targets, error: fetchError } = await sb
  .from('listings')
  .select('id, title, seniority, category, companies(name)')
  .eq('is_active', true)
  .is('salary_range', null)
  .order('date_added', { ascending: false })
  .limit(300)

if (fetchError) {
  console.error('Fetch error:', fetchError.message)
  process.exit(1)
}

console.log(`Estimating salaries for ${targets.length} listings...`)

let updated = 0, failed = 0

for (const listing of targets) {
  const company = Array.isArray(listing.companies) ? listing.companies[0] : listing.companies
  const companyName = company?.name ?? 'unknown'
  const salaryRange = estimateSalary(listing.title, listing.seniority, listing.category)

  const { error } = await sb
    .from('listings')
    .update({ salary_range: salaryRange })
    .eq('id', listing.id)

  if (error) {
    console.log(`  [fail] ${companyName} — ${listing.title}: ${error.message}`)
    failed++
  } else {
    console.log(`  [ok] ${companyName} — ${listing.title}: ${salaryRange}`)
    updated++
  }
}

console.log(`\nDone. Updated: ${updated}  Failed: ${failed}`)
