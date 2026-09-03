/**
 * One-time pass: fetch logos for companies where logo_url IS NULL.
 * Uses Google's favicon service (sz=128) which works for any domain.
 * Filters out Google's generic placeholder (726 bytes, sum=87073).
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://disouyodepqsbsmomkzj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpc291eW9kZXBxc2JzbW9ta3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUyODk5NywiZXhwIjoyMTAyMTA0OTk3fQ.Li4QdLi09i65chPFN5pbX3RQVn0iAkLO3eFhZ8cFWXk'
)

// Google's generic "no favicon" placeholder — fingerprinted by byte count + checksum
const GENERIC_SIZE = 726
const GENERIC_SUM = 87073

async function googleFavicon(domain) {
  const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!r.ok) return null
    const buf = new Uint8Array(await r.arrayBuffer())
    const sum = buf.reduce((a, b) => a + b, 0)
    if (buf.length === GENERIC_SIZE && sum === GENERIC_SUM) return null // generic placeholder
    return url
  } catch {
    return null
  }
}

// Manual domain overrides for companies where name→domain guessing won't work
const DOMAIN_OVERRIDES = {
  'Duck Duck Go': 'duckduckgo.com',
  'veeamsoftware': 'veeam.com',
  'ABB': 'abb.com',
  'FedEx': 'fedex.com',
  'Coca-Cola Cambodia Beverage Company Ltd': 'coca-colacompany.com',
  'Canopy Growth Corporation': 'canopygrowth.com',
  'Radisson Hotel Group': 'radissonhotels.com',
  'Sunbelt Rentals, Inc.': 'sunbeltrentals.com',
  'The Home Depot Canada': 'homedepot.ca',
  'Clarks International': 'clarks.com',
  'Dr. Martens Australia / New Zealand': 'drmartens.com',
  'YLD.com': 'yld.com',
  'Wiz Co': 'wiz.io',
  'Vertu Motors plc': 'vertumotors.com',
  'Distribusion Technologies': 'distribusion.com',
  'Brightrock Games': 'brightrockgames.com',
  'Parity': 'parity.io',
  'Benchling': 'benchling.com',
  'Camunda': 'camunda.com',
  'Notabene': 'notabene.id',
  'Contabo': 'contabo.com',
  'Benzinga': 'benzinga.com',
  'Orca Bio': 'orcabio.com',
  'Chaos': 'chaos.com',
  'limehome': 'limehome.com',
  'Auxmoney Gmbh': 'auxmoney.com',
  'ScholarshipOwl': 'scholarshipowl.com',
  'Bosta': 'bosta.co',
  'Gismart': 'gismart.com',
  'Quincus': 'quincus.com',
  'MonetizeNow': 'monetizenow.com',
  'CoDev': 'codev.com',
  'Collate': 'getcollate.io',
  'Bass Pro Shops': 'basspro.com',
  'Saasgroup': 'saasgroup.com',
  'Codeway': 'codeway.co',
  'Xm': 'xm.com',
  'Avomind': 'avomind.com',
  'Scorewarrior': 'scorewarrior.com',
  'gravity9': 'gravity9.com',
  'SaaStorm': 'saastorm.com',
  'Makersite GmbH': 'makersite.io',
  'atlantic.vc': 'atlantic.vc',
  'Bikeleasing': 'bikeleasing.de',
  'Natuvion GmbH': 'natuvion.com',
  'Onepage GmbH': 'onepage.io',
  'memodio': 'memodio.de',
  'HospiroTech': 'hospirotech.com',
  'HospriroTech': 'hospirotech.com',
  'atvari GmbH': 'atvari.com',
  'Venon Solutions': 'venonsolutions.com',
  'MultiBase GmbH': 'multibase.de',
  'Wavestone Germany AG': 'wavestone.com',
  'Holzland Becker': 'holzland-becker.de',
  'Eleva Search': 'elevasearch.com',
  'Eleve Talent': 'elevetalent.com',
  'KevinRoot Medical': 'kevinrootmedical.com',
  'The Hello Team': 'helloteam.com',
  'Stobart': 'stobart.co.uk',
  'Places for People': 'placesforpeople.co.uk',
  'Nick Scali Limited': 'nickscali.com.au',
  'Acumentis Group': 'acumentis.com.au',
  'Storage King Group': 'storageking.com.au',
  '1KOMMA5˚': '1komma5grad.com',
  'Bikeleasing': 'bikeleasing.de',
}

function slugFromUrl(url) {
  if (!url) return null
  const m = url.match(/\/companies\/([^/?#]+)/)
  return m ? m[1] : null
}

function candidateDomains(name, sampleUrl) {
  if (DOMAIN_OVERRIDES[name]) return [DOMAIN_OVERRIDES[name]]

  const candidates = []
  const slug = slugFromUrl(sampleUrl)
  if (slug) {
    candidates.push(`${slug}.com`, `${slug.replace(/-/g, '')}.com`)
  }
  const nameDomain = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (nameDomain) candidates.push(`${nameDomain}.com`)

  return [...new Set(candidates)]
}

const SKIP = new Set(['Unknown', 'E2E Test Corp'])

const { data: companies } = await sb
  .from('companies')
  .select('id,name')
  .is('logo_url', null)
  .order('name')

console.log(`Processing ${companies.length} companies...\n`)

let fixed = 0
let missed = 0

for (const company of companies) {
  if (SKIP.has(company.name)) {
    console.log(`  skip  ${company.name}`)
    missed++
    continue
  }

  const { data: listings } = await sb
    .from('listings')
    .select('original_url')
    .eq('company_id', company.id)
    .limit(1)

  const sampleUrl = listings?.[0]?.original_url ?? ''
  const domains = candidateDomains(company.name, sampleUrl)

  let logoUrl = null
  for (const domain of domains) {
    logoUrl = await googleFavicon(domain)
    if (logoUrl) break
  }

  if (logoUrl) {
    const { error } = await sb.from('companies').update({ logo_url: logoUrl }).eq('id', company.id)
    if (error) {
      console.log(`  error ${company.name}: ${error.message}`)
      missed++
    } else {
      console.log(`  found ${company.name.padEnd(44)} ${domains[0]}`)
      fixed++
    }
  } else {
    console.log(`  miss  ${company.name.padEnd(44)} tried: ${domains.slice(0,2).join(', ')}`)
    missed++
  }
}

console.log(`\nDone. Fixed: ${fixed}  No logo: ${missed}`)
