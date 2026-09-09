import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const TITLE = 'Earn Remotely — Curated Remote Jobs for Pakistan-based Talent'
const DESCRIPTION =
  'Find remote job opportunities curated for Pakistan-based graduates and professionals. Every listing manually reviewed.'

export const metadata: Metadata = {
  metadataBase: new URL('https://earnremotely.io'),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://earnremotely.io',
    siteName: 'Earn Remotely',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <Nav />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  )
}
