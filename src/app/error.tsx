'use client'

import Link from 'next/link'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="bg-white rounded-xl border border-[#D1D9E0] p-10">
          <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#111827] mb-2">Something went wrong</h1>
          <p className="text-sm text-[#6B7A8D] mb-6 leading-relaxed">
            An unexpected error occurred. Please try again.
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center bg-[#1A6B4A] text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-[#155a3d] transition-colors"
            >
              Try again
            </button>
            <Link href="/" className="text-sm text-[#6B7A8D] hover:text-[#1A6B4A] transition-colors">
              Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
