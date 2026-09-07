import { createClient } from '@supabase/supabase-js'
const sb = createClient(
  'https://disouyodepqsbsmomkzj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpc291eW9kZXBxc2JzbW9ta3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUyODk5NywiZXhwIjoyMTAyMTA0OTk3fQ.Li4QdLi09i65chPFN5pbX3RQVn0iAkLO3eFhZ8cFWXk'
)

const { data } = await sb.from('companies').select('name,logo_url').not('logo_url', 'is', null).limit(20)
data.forEach(c => console.log(c.name.padEnd(20), c.logo_url))
