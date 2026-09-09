import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="bg-white rounded-xl border border-[#D1D9E0] p-10">
          <p className="text-6xl font-extrabold text-[#0F2137] mb-2">404</p>
          <h1 className="text-xl font-bold text-[#111827] mb-2">Page not found</h1>
          <p className="text-sm text-[#6B7A8D] mb-6 leading-relaxed">
            This page doesn&apos;t exist or has been moved.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#1A6B4A] text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-[#155a3d] transition-colors"
          >
            Back to homepage
          </Link>
        </div>
      </div>
    </div>
  )
}
