'use client'
import { useState } from 'react'

const PALETTE = [
  '#1A6B4A', '#1B4D89', '#6D3A9C', '#B45309', '#0F6B75', '#9D1B4B',
]

function colorFor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return PALETTE[Math.abs(h) % PALETTE.length]
}

export function CompanyLogo({
  name,
  logoUrl,
  size = 48,
}: {
  name: string
  logoUrl?: string | null
  size?: number
}) {
  const [failed, setFailed] = useState(false)
  const bg = colorFor(name)
  const initial = name.charAt(0).toUpperCase()

  if (!logoUrl || failed) {
    return (
      <div
        style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.38 }}
        className="rounded-lg flex items-center justify-center text-white font-bold shrink-0 select-none"
        aria-label={name}
      >
        {initial}
      </div>
    )
  }

  return (
    <img
      src={logoUrl}
      alt={name}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="rounded-lg object-contain border border-[#D1D9E0] bg-white shrink-0 p-0.5"
      onError={() => setFailed(true)}
    />
  )
}
