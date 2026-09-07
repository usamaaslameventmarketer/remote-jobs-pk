/**
 * One-time cleanup: deactivate duplicate listings.
 * For each original_url with multiple active rows:
 *   - Keep the row with verified=true if any, else keep the smallest id (first inserted)
 *   - Set is_active=false on all others
 */
import { createClient } from '@supabase/supabase-js'
const sb = createClient(
  'https://disouyodepqsbsmomkzj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpc291eW9kZXBxc2JzbW9ta3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUyODk5NywiZXhwIjoyMTAyMTA0OTk3fQ.Li4QdLi09i65chPFN5pbX3RQVn0iAkLO3eFhZ8cFWXk'
)

// Fetch all active listings (paginated to bypass 1000-row limit)
console.log('Fetching all active listings...')
let allRows = []
let from = 0
while (true) {
  const { data, error } = await sb.from('listings')
    .select('id,original_url,verified')
    .eq('is_active', true)
    .range(from, from + 999)
  if (error) { console.error(error.message); process.exit(1) }
  if (!data || data.length === 0) break
  allRows.push(...data)
  if (data.length < 1000) break
  from += 1000
}
console.log(`Fetched ${allRows.length} active rows`)

// Group by original_url
const groups = {}
for (const row of allRows) {
  if (!groups[row.original_url]) groups[row.original_url] = []
  groups[row.original_url].push(row)
}

// Find duplicates
const dupeGroups = Object.values(groups).filter(g => g.length > 1)
console.log(`Found ${dupeGroups.length} URLs with duplicates`)

// For each dupe group, pick the keeper and collect ids to deactivate
const toDeactivate = []
for (const group of dupeGroups) {
  // Prefer verified row; otherwise keep smallest id
  const keeper = group.find(r => r.verified) ?? group.reduce((a, b) => a.id < b.id ? a : b)
  for (const row of group) {
    if (row.id !== keeper.id) toDeactivate.push(row.id)
  }
}
console.log(`Deactivating ${toDeactivate.length} duplicate rows...`)

// Deactivate in batches of 500
let deactivated = 0
for (let i = 0; i < toDeactivate.length; i += 500) {
  const batch = toDeactivate.slice(i, i + 500)
  const { error } = await sb.from('listings').update({ is_active: false }).in('id', batch)
  if (error) { console.error('Batch error:', error.message); process.exit(1) }
  deactivated += batch.length
  console.log(`  ${deactivated}/${toDeactivate.length} deactivated`)
}

// Confirm final count
const { count: finalCount } = await sb.from('listings').select('*', { count: 'exact', head: true }).eq('is_active', true)
console.log(`\nDone.`)
console.log(`Before: 7366 active rows`)
console.log(`After:  ${finalCount} active rows`)
console.log(`Removed: ${7366 - finalCount} duplicate rows`)
