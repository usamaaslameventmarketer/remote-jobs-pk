import Link from 'next/link'

export default async function UnsubscribedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const ok = status === 'ok'

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-[#F3F5F7] flex items-center justify-center mx-auto mb-5">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7A8D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-[#111827] mb-2">
        {ok ? "You've been unsubscribed" : 'Something went wrong'}
      </h1>
      <p className="text-sm text-[#6B7A8D] mb-8">
        {ok
          ? "You won't receive any more job alert emails. You can re-subscribe any time from the home page."
          : 'The unsubscribe link may be invalid. Email us if you need help.'}
      </p>
      <Link href="/" className="inline-flex items-center gap-2 border border-[#D1D9E0] text-[#374151] text-sm font-semibold px-6 py-2.5 rounded-lg hover:border-[#9BAFC4] transition-colors">
        Back to jobs
      </Link>
    </div>
  )
}
