import { createClient } from '@supabase/supabase-js'
const sb = createClient(
  'https://disouyodepqsbsmomkzj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpc291eW9kZXBxc2JzbW9ta3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUyODk5NywiZXhwIjoyMTAyMTA0OTk3fQ.Li4QdLi09i65chPFN5pbX3RQVn0iAkLO3eFhZ8cFWXk'
)

const { count: total } = await sb.from('listings').select('*', { count: 'exact', head: true }).eq('is_active', true)

let allRows = []
let from = 0
while (true) {
  const { data } = await sb.from('listings').select('id,original_url').eq('is_active', true).range(from, from + 999)
  if (!data || data.length === 0) break
  allRows.push(...data)
  if (data.length < 1000) break
  from += 1000
}

const distinct = new Set(allRows.map(r => r.original_url)).size
console.log('Total active:', total)
console.log('Distinct URLs:', distinct)
console.log('Duplicate rows:', total - distinct)

const urlCounts = {}
for (const r of allRows) urlCounts[r.original_url] = (urlCounts[r.original_url] ?? 0) + 1
const dupes = Object.entries(urlCounts).filter(([,c]) => c > 1).sort((a,b) => b[1]-a[1]).slice(0, 5)
console.log('\nTop duplicated URLs:')
dupes.forEach(([url, count]) => console.log(' ', count+'x', url.slice(0, 90)))
