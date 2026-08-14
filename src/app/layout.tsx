import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Remote Jobs PK — Curated Remote Jobs for Pakistan-based Talent',
  description:
    'Find remote job opportunities curated for Pakistan-based graduates and professionals. Every listing manually reviewed.',
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
