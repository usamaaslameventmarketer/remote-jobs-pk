import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/alerts/unsubscribed?status=invalid', req.url))
  }

  const { error } = await supabase
    .from('job_alerts')
    .delete()
    .eq('unsubscribe_token', token)

  if (error) {
    console.error('unsubscribe error:', error)
    return NextResponse.redirect(new URL('/alerts/unsubscribed?status=error', req.url))
  }

  return NextResponse.redirect(new URL('/alerts/unsubscribed?status=ok', req.url))
}
