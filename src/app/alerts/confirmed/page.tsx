import Link from 'next/link'

export default async function ConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const ok = status === 'ok'

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5 ${ok ? 'bg-[#E8F5EF]' : 'bg-red-50'}`}>
        {ok ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A6B4A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        )}
      </div>
      <h1 className="text-xl font-bold text-[#111827] mb-2">
        {ok ? "You're subscribed" : 'Something went wrong'}
      </h1>
      <p className="text-sm text-[#6B7A8D] mb-8">
        {ok
          ? "You'll get a daily email whenever new remote jobs are added. Unsubscribe any time from the link in each email."
          : 'The confirmation link may have already been used or is invalid. Try subscribing again.'}
      </p>
      <Link href="/" className="inline-flex items-center gap-2 bg-[#1A6B4A] text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-[#155a3d] transition-colors">
        Browse jobs →
      </Link>
    </div>
  )
}
