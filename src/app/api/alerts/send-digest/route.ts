import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Listings added in the last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: listings, error: listErr } = await supabase
    .from('listings')
    .select(`
      id,
      title,
      seniority,
      region_eligibility,
      salary_range,
      featured,
      featured_until,
      companies ( name )
    `)
    .eq('is_active', true)
    .gte('date_added', since)
    .order('featured', { ascending: false })
    .order('date_added', { ascending: false })
    .range(0, 49)

  if (listErr) {
    console.error('listings fetch error:', listErr)
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 })
  }

  if (!listings || listings.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no new listings today' })
  }

  // All confirmed subscribers
  const { data: subscribers, error: subErr } = await supabase
    .from('job_alerts')
    .select('email, unsubscribe_token')
    .eq('confirmed', true)

  if (subErr) {
    console.error('subscribers fetch error:', subErr)
    return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 })
  }

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no confirmed subscribers' })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://remote-jobs-pk.vercel.app'
  const today = new Date().toLocaleDateString('en-PK', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Asia/Karachi' })

  const seniorityLabel: Record<string, string> = { entry: 'Entry-level', mid: 'Mid-level', senior: 'Senior' }
  const todayStr = new Date().toISOString().split('T')[0]

  const listingRows = listings.map((l) => {
    const company = Array.isArray(l.companies) ? l.companies[0] : l.companies
    const isFeatured = l.featured && l.featured_until && l.featured_until >= todayStr
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #F3F4F6;vertical-align:top">
          ${isFeatured ? '<span style="display:inline-block;background:#FEF3C7;color:#92400E;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Featured</span><br>' : ''}
          <a href="${baseUrl}/listings/${l.id}" style="font-size:14px;font-weight:600;color:#1A6B4A;text-decoration:none">
            ${l.title}
          </a>
          <br>
          <span style="font-size:12px;color:#6B7A8D">${company?.name ?? ''}</span>
          <span style="font-size:12px;color:#D1D9E0"> · </span>
          <span style="font-size:12px;color:#6B7A8D">${seniorityLabel[l.seniority] ?? l.seniority}</span>
          <span style="font-size:12px;color:#D1D9E0"> · </span>
          <span style="font-size:12px;color:#6B7A8D">${l.region_eligibility}</span>
          ${l.salary_range ? `<span style="font-size:12px;color:#D1D9E0"> · </span><span style="font-size:12px;font-weight:600;color:#111827">${l.salary_range}</span>` : ''}
        </td>
      </tr>
    `
  }).join('')

  let sent = 0
  const errors: string[] = []

  // Resend supports batch up to 100; send one per subscriber so unsubscribe links are personalised
  // For large lists, batch in groups of 50
  const BATCH = 50
  for (let i = 0; i < subscribers.length; i += BATCH) {
    const batch = subscribers.slice(i, i + BATCH)
    const results = await Promise.allSettled(
      batch.map((sub) =>
        resend.emails.send({
          from: 'Remote Jobs PK <alerts@remotejobs.pk>',
          to: sub.email,
          subject: `${listings.length} new remote job${listings.length === 1 ? '' : 's'} — ${today}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827">
              <p style="font-size:20px;font-weight:700;margin:0 0 4px">New remote jobs today</p>
              <p style="font-size:14px;color:#6B7A8D;margin:0 0 24px">${today} · ${listings.length} new listing${listings.length === 1 ? '' : 's'}</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #F3F4F6">
                <tbody>${listingRows}</tbody>
              </table>

              <div style="margin-top:28px;text-align:center">
                <a href="${baseUrl}" style="display:inline-block;background:#1A6B4A;color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none">
                  Browse all jobs →
                </a>
              </div>

              <p style="font-size:11px;color:#9BAFC4;margin:28px 0 0;text-align:center">
                You're receiving this because you subscribed at remotejobs.pk ·
                <a href="${baseUrl}/api/alerts/unsubscribe?token=${sub.unsubscribe_token}" style="color:#9BAFC4">unsubscribe</a>
              </p>
            </div>
          `,
        })
      )
    )
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') sent++
      else errors.push(`${batch[idx].email}: ${r.reason}`)
    })
  }

  return NextResponse.json({ ok: true, listings: listings.length, sent, errors })
}
