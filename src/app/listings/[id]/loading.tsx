export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 pb-28 md:pb-10">
      {/* Back link skeleton */}
      <div className="h-4 bg-[#E5E7EB] rounded w-16 mb-8 animate-pulse" />

      <div className="bg-white rounded-xl border border-[#D1D9E0] overflow-hidden animate-pulse">
        {/* Company header */}
        <div className="px-6 sm:px-8 pt-7 pb-6 border-b border-[#F3F5F7]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-[52px] h-[52px] rounded-lg bg-[#E5E7EB] shrink-0" />
            <div className="space-y-1.5">
              <div className="h-4 bg-[#E5E7EB] rounded w-32" />
              <div className="h-3 bg-[#E5E7EB] rounded w-20" />
            </div>
          </div>
          <div className="h-7 bg-[#E5E7EB] rounded w-3/4 mb-4" />
          <div className="flex gap-2">
            <div className="h-6 bg-[#E5E7EB] rounded-full w-20" />
            <div className="h-6 bg-[#E5E7EB] rounded-full w-16" />
            <div className="h-6 bg-[#E5E7EB] rounded-full w-24" />
          </div>
        </div>

        {/* Body */}
        <div className="px-6 sm:px-8 py-6 space-y-5">
          <div className="h-12 bg-[#E5E7EB] rounded-lg w-48" />
          <div className="space-y-2">
            <div className="h-3.5 bg-[#E5E7EB] rounded w-full" />
            <div className="h-3.5 bg-[#E5E7EB] rounded w-5/6" />
            <div className="h-3.5 bg-[#E5E7EB] rounded w-4/5" />
            <div className="h-3.5 bg-[#E5E7EB] rounded w-full" />
            <div className="h-3.5 bg-[#E5E7EB] rounded w-3/4" />
            <div className="h-3.5 bg-[#E5E7EB] rounded w-full" />
            <div className="h-3.5 bg-[#E5E7EB] rounded w-2/3" />
          </div>
          <div className="flex gap-2 pt-1">
            <div className="h-7 bg-[#E5E7EB] rounded-full w-16" />
            <div className="h-7 bg-[#E5E7EB] rounded-full w-20" />
            <div className="h-7 bg-[#E5E7EB] rounded-full w-14" />
          </div>
          <div className="h-12 bg-[#E5E7EB] rounded-lg w-full mt-2" />
        </div>
      </div>
    </div>
  )
}
