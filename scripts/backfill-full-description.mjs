/**
 * Backfill `full_description` for existing listings by re-fetching job content
 * from Greenhouse and Lever APIs. Listings added after the column was added will
 * already have full_description populated via ingest.mjs.
 *
 * Run AFTER adding the column in Supabase SQL editor:
 *   ALTER TABLE listings ADD COLUMN IF NOT EXISTS full_description text;
 *
 * Usage:
 *   node scripts/backfill-full-description.mjs
 *
 * Safe to re-run — skips listings that already have full_description set.
 * Processes in batches of 20 concurrent requests with a short delay between.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://disouyodepqsbsmomkzj.supabase.co'
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpc291eW9kZXBxc2JzbW9ta3pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUyODk5NywiZXhwIjoyMTAyMTA0OTk3fQ.Li4QdLi09i65chPFN5pbX3RQVn0iAkLO3eFhZ8cFWXk'

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ---------------------------------------------------------------------------
// HTML → structured plain text (mirrors ingest.mjs)
// ---------------------------------------------------------------------------

function htmlToStructuredText(html, maxLen = Infinity) {
  let text = (html ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
  text = text
    .replace(/<\/?(h[1-6])[^>]*>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '\n\n')
    .replace(/<\/p>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/<\/?(ul|ol|div|section|article|blockquote)[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&#\d+;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n +/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text.slice(0, maxLen)
}

// ---------------------------------------------------------------------------
// Source-specific fetchers
// ---------------------------------------------------------------------------

async function fetchGreenhouseDescription(originalUrl) {
  // Supports both boards.greenhouse.io and job-boards.greenhouse.io URL formats
  const match = originalUrl.match(/greenhouse\.io\/([^/]+)\/jobs\/(\d+)/)
  if (!match) return null
  const [, company, jobId] = match
  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${company}/jobs/${jobId}?content=true`,
      { headers: { 'User-Agent': 'RemoteJobsPK/1.0' }, signal: AbortSignal.timeout(8000) },
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.content ? htmlToStructuredText(data.content, 3000) : null
  } catch {
    return null
  }
}

async function fetchLeverDescription(originalUrl) {
  const match = originalUrl.match(/lever\.co\/([^/]+)\/([a-f0-9-]{36})/)
  if (!match) return null
  const [, company, postingId] = match
  try {
    const res = await fetch(
      `https://api.lever.co/v0/postings/${company}/${postingId}`,
      { headers: { 'User-Agent': 'RemoteJobsPK/1.0' }, signal: AbortSignal.timeout(8000) },
    )
    if (!res.ok) return null
    const data = await res.json()
    const structured = [
      (data.descriptionPlain ?? '').trim(),
      ...(data.lists ?? []).map((l) => `\n\n${l.text}\n${htmlToStructuredText(l.content ?? '')}`),
    ].join('').trim().slice(0, 3000)
    return structured || null
  } catch {
    return null
  }
}

function detectSource(originalUrl) {
  if (originalUrl.includes('greenhouse.io')) return 'greenhouse'
  if (originalUrl.includes('lever.co')) return 'lever'
  return null
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function backfill() {
  // Fetch all listings without full_description (or with null)
  console.log('Fetching listings without full_description...')
  const all = []
  let from = 0
  while (true) {
    const { data, error } = await sb
      .from('listings')
      .select('id, original_url, short_summary')
      .is('full_description', null)
      .eq('is_active', true)
      .range(from, from + 999)
    if (error) { console.error('Fetch error:', error.message); break }
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < 1000) break
    from += 1000
  }

  console.log(`Found ${all.length} listings to backfill.\n`)
  if (all.length === 0) return

  let updated = 0
  let failed = 0
  let unsupported = 0
  const BATCH = 20

  for (let i = 0; i < all.length; i += BATCH) {
    const batch = all.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async (listing) => {
        const source = detectSource(listing.original_url)
        let description = null

        if (source === 'greenhouse') {
          description = await fetchGreenhouseDescription(listing.original_url)
        } else if (source === 'lever') {
          description = await fetchLeverDescription(listing.original_url)
        } else {
          unsupported++
          return
        }

        // Fall back to short_summary if we couldn't fetch the original
        const value = description || listing.short_summary || null

        const { error } = await sb
          .from('listings')
          .update({ full_description: value })
          .eq('id', listing.id)

        if (error) {
          console.error(`  Failed to update ${listing.id}: ${error.message}`)
          failed++
        } else {
          updated++
          if (description) {
            process.stdout.write(`  ✓ [${updated}] ${listing.original_url.slice(0, 60)}\n`)
          } else {
            process.stdout.write(`  ~ [${updated}] fallback to short_summary: ${listing.original_url.slice(0, 60)}\n`)
          }
        }
      }),
    )
    // Brief pause between batches to avoid rate-limiting
    if (i + BATCH < all.length) await new Promise((r) => setTimeout(r, 300))
    console.log(`  Progress: ${Math.min(i + BATCH, all.length)}/${all.length}`)
  }

  console.log(`\nDone. Updated: ${updated}  Failed: ${failed}  Unsupported source: ${unsupported}`)
}

backfill().catch(console.error)
