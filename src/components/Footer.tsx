'use client'
import Link from 'next/link'
import { MapPin } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-[#0F2137] border-t border-[#1a3050] mt-16">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row justify-between gap-8 mb-8">
          {/* Left: brand + tagline */}
          <div className="max-w-xs">
            <p className="text-white font-bold text-lg mb-2">Earn Remotely</p>
            <p className="text-[#5E7E9A] text-sm leading-relaxed">
              Curated remote jobs for Pakistani talent. Earn in USD.{' '}
              <span className="inline-flex items-center gap-0.5">
                <MapPin size={12} className="text-[#1A6B4A]" aria-hidden="true" />
                <span>Pakistan</span>
              </span>
            </p>
          </div>

          {/* Right: two link columns */}
          <div className="flex gap-12">
            <div>
              <p className="text-[#9BAFC4] text-xs font-semibold uppercase tracking-widest mb-3">Browse</p>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="text-sm text-[#5E7E9A] hover:text-white transition-colors">
                    Jobs
                  </Link>
                </li>
                <li>
                  <span className="text-sm text-[#5E7E9A]">Companies</span>
                </li>
                <li>
                  <Link href="/pricing" className="text-sm text-[#5E7E9A] hover:text-white transition-colors">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[#9BAFC4] text-xs font-semibold uppercase tracking-widest mb-3">Company</p>
              <ul className="space-y-2">
                <li>
                  <span className="text-sm text-[#5E7E9A]">About</span>
                </li>
                <li>
                  <Link href="/post-a-job" className="text-sm text-[#5E7E9A] hover:text-white transition-colors">
                    Post a Job
                  </Link>
                </li>
                <li>
                  <span className="text-sm text-[#5E7E9A]">Contact</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#1a3050] pt-5">
          <p className="text-[#5E7E9A] text-xs text-center sm:text-left">
            © 2026 Earn Remotely · Made for Pakistan
          </p>
        </div>
      </div>
    </footer>
  )
}
