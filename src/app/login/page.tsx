import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In — Remote Jobs PK',
}

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl border border-[#D1D9E0] p-8">
          {/* Header */}
          <div className="mb-7">
            <h1 className="text-xl font-bold text-[#111827] mb-1">Sign in</h1>
            <p className="text-sm text-[#6B7A8D] leading-relaxed">
              Save listings and get alerts for new roles —{' '}
              <span className="font-medium text-[#111827]">accounts launching soon.</span>
            </p>
          </div>

          {/* Form */}
          <fieldset disabled className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#111827] mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-lg border border-[#D1D9E0] bg-[#F3F5F7] text-[#6B7A8D] placeholder:text-[#9BAFC4] text-sm cursor-not-allowed"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#111827] mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg border border-[#D1D9E0] bg-[#F3F5F7] text-[#6B7A8D] placeholder:text-[#9BAFC4] text-sm cursor-not-allowed"
              />
            </div>
            <button
              type="button"
              className="w-full py-2.5 px-4 rounded-lg bg-[#6B7A8D] text-white text-sm font-medium cursor-not-allowed opacity-60"
              aria-disabled="true"
            >
              Sign in — Coming Soon
            </button>
          </fieldset>

          {/* Notice */}
          <div className="mt-6 pt-5 border-t border-[#F3F5F7]">
            <p className="text-xs text-[#6B7A8D] leading-relaxed text-center">
              We&apos;ll notify early users when accounts go live.{' '}
              <a
                href="mailto:hello@remotejobs.pk"
                className="text-[#1A6B4A] hover:underline font-medium"
              >
                Join the waitlist →
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
