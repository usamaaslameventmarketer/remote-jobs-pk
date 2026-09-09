import { ImageResponse } from 'next/og'
import { supabase } from '@/lib/supabase'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: listing } = await supabase
    .from('listings')
    .select('title, companies (name)')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  const company = listing
    ? (Array.isArray(listing.companies) ? listing.companies[0] : listing.companies) as { name: string } | null
    : null

  const title = (listing?.title ?? 'Remote Job Opportunity').slice(0, 60) +
    ((listing?.title?.length ?? 0) > 60 ? '…' : '')
  const companyName = company?.name ?? ''

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0D2A1E',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 96px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top: brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '4px', background: '#1A6B4A', borderRadius: '99px' }} />
          <span style={{ color: '#4B7A62', fontSize: '18px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Earn Remotely
          </span>
        </div>

        {/* Middle: company + job title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {companyName ? (
            <div style={{ color: '#4B7A62', fontSize: '24px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {companyName}
            </div>
          ) : null}
          <div style={{ color: '#FFFFFF', fontSize: '58px', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            {title}
          </div>
        </div>

        {/* Bottom: remote badge + domain */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: '#1A6B4A',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: 600,
            padding: '8px 20px',
            borderRadius: '99px',
          }}>
            Remote from Anywhere
          </div>
          <span style={{ color: '#4B7A62', fontSize: '18px' }}>earnremotely.io</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
