import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { randomBytes } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const confirmToken = randomBytes(32).toString('hex')
  const unsubscribeToken = randomBytes(32).toString('hex')

  const { error } = await supabase.from('job_alerts').upsert(
    { email, confirm_token: confirmToken, unsubscribe_token: unsubscribeToken, confirmed: false },
    { onConflict: 'email' }
  )

  if (error) {
    console.error('job_alerts upsert error:', error)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://remote-jobs-pk.vercel.app'
  const confirmUrl = `${baseUrl}/alerts/confirm?token=${confirmToken}`

  await resend.emails.send({
    from: 'Remote Jobs PK <alerts@remotejobs.pk>',
    to: email,
    subject: 'Confirm your job alerts',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111827">
        <p style="font-size:18px;font-weight:700;margin:0 0 8px">You're almost subscribed</p>
        <p style="font-size:14px;color:#6B7A8D;margin:0 0 24px">
          Click the button below to confirm your daily job alerts from Remote Jobs PK.
          You'll get one email per day — only when new listings are added.
        </p>
        <a href="${confirmUrl}" style="display:inline-block;background:#1A6B4A;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">
          Confirm alerts →
        </a>
        <p style="font-size:12px;color:#9BAFC4;margin:24px 0 0">
          If you didn't request this, just ignore the email — you won't be subscribed.
        </p>
      </div>
    `,
  })

  return NextResponse.json({ ok: true })
}
