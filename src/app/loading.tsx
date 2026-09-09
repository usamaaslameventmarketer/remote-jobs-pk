export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#D1D9E0] bg-white p-4 sm:p-5 animate-pulse">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#E5E7EB] shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="h-3 bg-[#E5E7EB] rounded w-24" />
                <div className="h-4 bg-[#E5E7EB] rounded w-3/4" />
                <div className="flex gap-2 pt-1">
                  <div className="h-5 bg-[#E5E7EB] rounded-full w-16" />
                  <div className="h-5 bg-[#E5E7EB] rounded-full w-14" />
                  <div className="h-5 bg-[#E5E7EB] rounded-full w-20" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
