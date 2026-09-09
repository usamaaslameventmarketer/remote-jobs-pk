import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0D2A1E',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px 96px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Domain label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
          <div style={{ width: '40px', height: '4px', background: '#1A6B4A', borderRadius: '99px' }} />
          <span style={{ color: '#4B7A62', fontSize: '20px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            earnremotely.io
          </span>
        </div>

        {/* Wordmark */}
        <div style={{ color: '#FFFFFF', fontSize: '80px', fontWeight: 800, lineHeight: 1.05, marginBottom: '28px', letterSpacing: '-0.02em' }}>
          Earn Remotely
        </div>

        {/* Tagline */}
        <div style={{ color: '#9BAFC4', fontSize: '30px', fontWeight: 400, lineHeight: 1.4, maxWidth: '720px' }}>
          Curated Remote Jobs for Pakistan-based Talent.
        </div>

        {/* Sub-line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '56px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '99px', background: '#1A6B4A' }} />
          <span style={{ color: '#4B7A62', fontSize: '20px' }}>
            Every listing manually reviewed for remote eligibility
          </span>
        </div>

        {/* Decorative circle */}
        <div
          style={{
            position: 'absolute',
            right: '96px',
            bottom: '80px',
            width: '140px',
            height: '140px',
            borderRadius: '99px',
            background: 'rgba(26, 107, 74, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: '84px', height: '84px', borderRadius: '99px', background: 'rgba(26, 107, 74, 0.25)' }} />
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
