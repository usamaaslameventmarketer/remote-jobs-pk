import Link from 'next/link'

export function Nav() {
  return (
    <nav className="sticky top-0 z-50 bg-[#0F2137] border-b border-[#1a3050]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-6">
        <Link
          href="/"
          className="font-bold text-white text-[15px] tracking-tight shrink-0"
        >
          Remote Jobs{' '}
          <span className="text-[#4ADE80]">PK</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className="text-sm text-[#8BAFC9] hover:text-white transition-colors font-medium"
          >
            Browse Jobs
          </Link>
          <span className="text-sm text-[#8BAFC9] font-medium cursor-default select-none">
            Companies
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm text-[#8BAFC9] font-medium cursor-default select-none">
            Log in
          </span>
          <span className="text-sm bg-[#1A6B4A] text-white px-4 py-1.5 rounded-lg font-medium cursor-default select-none">
            Post a Job
          </span>
        </div>
      </div>
    </nav>
  )
}
