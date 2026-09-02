/**
 * verify-slugs.mjs
 * One-time script: hit every Greenhouse and Lever slug in ingest.mjs,
 * report which are live and how many jobs they return.
 * Usage: node verify-slugs.mjs
 */

const GREENHOUSE_SLUGS = [
  // Infrastructure / Cloud
  'stripe', 'datadog', 'mongodb', 'okta', 'canonical', 'cloudflare', 'elastic',
  'hashicorp', 'digitalocean', 'netlify', 'vercel', 'grafana', 'sentry',
  'confluent', 'cockroachdb', 'fastly', 'influxdata', 'newrelic',

  // Software / Dev tools
  'anthropic', 'gitlab', 'coinbase', 'figma', 'twilio', 'postman', 'dropbox',
  'airtable', 'contentful', 'sourcegraph', 'posthog', 'linear', 'algolia',
  'loom', 'squarespace', 'shopify', 'replit', 'crowdin', 'lokalise', 'miro',
  'webflow', 'coda', 'invision',

  // Data / Analytics / ML
  'databricks', 'airbyte', 'fivetran', 'hightouch', 'prefect', 'temporal',

  // Sales / Marketing / CRM
  'hubspot', 'zendesk', 'intercom', 'outreach', 'gong', 'salesloft', 'apollo',
  'pipedrive', 'klaviyo', 'braze', 'amplitude',
  'hootsuite', 'sproutsocial', 'iterable', 'activecampaign', 'drift',
  'aircall', 'pandadoc', 'sendbird', 'helpscout', 'close',

  // HR / People Ops
  'remote', 'deel', 'rippling', 'lattice', 'gusto', 'checkr',
  'personio', '15five', 'cultureamp', 'hibob',

  // Legal
  'ironclad', 'clio',

  // Finance
  'brex', 'robinhood', 'paddle', 'xero', 'chargebee', 'plaid',
  'nubank', 'wise', 'carta', 'pilot',

  // General / Other
  'asana', 'pagerduty', '1password', 'notion', 'scale',
  'freshworks', 'pluralsight',

  // Expansion: Sales
  'docusign', 'ringcentral', 'talkdesk', 'sprinklr', 'seismic',
  'highspot', 'clari', 'cognism', 'zoominfo', 'chorus',
  'mindtickle', 'showpad', 'mediafly', 'qatalog', 'memrise',

  // Expansion: Marketing
  'semrush', 'moz', 'omnisend', 'sendgrid', 'postmarkapp',
  'campaignmonitor', 'drip', 'mailerlite', 'moosend',
  'unbounce', 'hotjar', 'crazy-egg', 'contentsquare', 'userleap',

  // Expansion: Finance
  'expensify', 'bill', 'tipalti', 'coupa', 'zuora',
  'recurly', 'avalara', 'taxjar', 'ramp', 'airbase',
  'spendesk', 'pleo', 'payhawk', 'soldo', 'mesh-payments',
  'netsuite', 'floqast', 'workiva', 'vena',

  // Expansion: HR
  'bamboohr', 'justworks', 'zenefits', 'leapsome', 'namely',
  'peoplehum', 'springworks', 'keka', 'darwinbox', 'oysterhr',
  'remote-com', 'multiplier', 'velocity-global', 'globalization-partners', 'papaya-global',

  // Expansion: Legal
  'evisort', 'contractbook', 'spotdraft', 'linksquares', 'legalone',
  'lexion', 'mycase', 'smokeball',
]

const LEVER_SLUGS = [
  'toptal', 'canonical', 'zapier', 'buffer', 'doist', 'automattic',
  'hotjar', 'pitch', 'typeform', 'whereby', 'convertkit',
  'deel', 'remote', 'oyster', 'loom',
  'duckduckgo', 'wikimedia', 'close', 'helpscout', 'percona',
  'invision', 'dbt-labs', 'turing',
  'talkdesk', 'sprinklr', 'seismic', 'highspot', 'clari',
  'semrush', 'mailchimp', 'sendgrid', 'omnisend', 'drip',
  'unbounce', 'hootsuite',
  'expensify', 'tipalti', 'recurly', 'ramp', 'spendesk',
  'pleo', 'vena',
  'bamboohr', 'leapsome', 'namely', 'greenhouse', 'lever',
  'oysterhr', 'multiplier',
  'contractbook', 'spotdraft', 'evisort', 'lexion',
]

const CONCURRENCY = 10
const TIMEOUT_MS = 12000

async function checkGreenhouse(slug) {
  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`,
      { headers: { 'User-Agent': 'RemoteJobsPK/1.0' }, signal: AbortSignal.timeout(TIMEOUT_MS) }
    )
    if (!res.ok) return { slug, status: res.status, jobs: 0 }
    const { jobs } = await res.json()
    return { slug, status: 200, jobs: Array.isArray(jobs) ? jobs.length : 0 }
  } catch (err) {
    return { slug, status: 'error', jobs: 0, err: err.message }
  }
}

async function checkLever(slug) {
  try {
    const res = await fetch(
      `https://api.lever.co/v0/postings/${slug}`,
      { headers: { 'User-Agent': 'RemoteJobsPK/1.0' }, signal: AbortSignal.timeout(TIMEOUT_MS) }
    )
    if (!res.ok) return { slug, status: res.status, jobs: 0 }
    const data = await res.json()
    return { slug, status: 200, jobs: Array.isArray(data) ? data.length : 0 }
  } catch (err) {
    return { slug, status: 'error', jobs: 0, err: err.message }
  }
}

async function runBatch(items, checkFn, label) {
  const results = []
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map(checkFn))
    results.push(...batchResults)
    process.stdout.write(`  ${label}: checked ${Math.min(i + CONCURRENCY, items.length)}/${items.length}\r`)
  }
  process.stdout.write('\n')
  return results
}

function printTable(results, label) {
  const live = results.filter(r => r.status === 200 && r.jobs > 0).sort((a, b) => b.jobs - a.jobs)
  const empty = results.filter(r => r.status === 200 && r.jobs === 0)
  const dead = results.filter(r => r.status !== 200)

  console.log(`\n${'='.repeat(60)}`)
  console.log(`${label} — ${results.length} slugs checked`)
  console.log(`  Live (jobs > 0): ${live.length}`)
  console.log(`  Live but 0 jobs: ${empty.length}`)
  console.log(`  Dead (4xx/error): ${dead.length}`)
  console.log(`${'='.repeat(60)}`)

  console.log(`\n[LIVE — sorted by job count]`)
  console.log(`${'Slug'.padEnd(35)} ${'Jobs'.padStart(5)}`)
  console.log('-'.repeat(42))
  for (const r of live) {
    console.log(`${r.slug.padEnd(35)} ${String(r.jobs).padStart(5)}`)
  }

  if (empty.length) {
    console.log(`\n[LIVE but 0 jobs — may have moved or gone dormant]`)
    console.log(empty.map(r => r.slug).join(', '))
  }

  if (dead.length) {
    console.log(`\n[DEAD — can be removed from ingest.mjs]`)
    for (const r of dead) {
      console.log(`  ${r.slug.padEnd(35)} ${r.status}${r.err ? ' — ' + r.err : ''}`)
    }
  }

  const totalJobs = live.reduce((s, r) => s + r.jobs, 0)
  console.log(`\nTotal raw jobs available: ${totalJobs}`)
}

console.log('Verifying Greenhouse slugs...')
const ghResults = await runBatch(GREENHOUSE_SLUGS, checkGreenhouse, 'Greenhouse')

console.log('Verifying Lever slugs...')
const lvResults = await runBatch(LEVER_SLUGS, checkLever, 'Lever')

printTable(ghResults, 'GREENHOUSE')
printTable(lvResults, 'LEVER')

// Combined summary
const allLive = [
  ...ghResults.filter(r => r.status === 200 && r.jobs > 0).map(r => ({ ...r, ats: 'GH' })),
  ...lvResults.filter(r => r.status === 200 && r.jobs > 0).map(r => ({ ...r, ats: 'LV' })),
]
const allDead = [
  ...ghResults.filter(r => r.status !== 200).map(r => ({ ...r, ats: 'GH' })),
  ...lvResults.filter(r => r.status !== 200).map(r => ({ ...r, ats: 'LV' })),
]

console.log(`\n${'='.repeat(60)}`)
console.log(`OVERALL SUMMARY`)
console.log(`${'='.repeat(60)}`)
console.log(`Total slugs checked:   ${GREENHOUSE_SLUGS.length + LEVER_SLUGS.length}`)
console.log(`Live with jobs:        ${allLive.length}`)
console.log(`Dead (safe to remove): ${allDead.length}`)
console.log(`Total raw jobs pooled: ${allLive.reduce((s, r) => s + r.jobs, 0)}`)
