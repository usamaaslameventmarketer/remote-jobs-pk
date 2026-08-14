'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function SearchBar({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const q = (
        e.currentTarget.elements.namedItem('q') as HTMLInputElement
      ).value.trim()
      const params = new URLSearchParams(searchParams.toString())
      if (q) params.set('q', q)
      else params.delete('q')
      router.push(`/?${params.toString()}`)
    },
    [router, searchParams],
  )

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-xl mx-auto">
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search by role, skill, or company…"
        className="flex-1 px-4 py-2.5 rounded-lg border border-[#D1D9E0] bg-white text-[#111827] placeholder:text-[#6B7A8D] text-sm focus:outline-none focus:ring-2 focus:ring-[#1A6B4A] focus:border-transparent"
      />
      <button
        type="submit"
        className="px-5 py-2.5 rounded-lg bg-[#1A6B4A] text-white text-sm font-medium hover:bg-[#155a3d] transition-colors shrink-0"
      >
        Search
      </button>
    </form>
  )
}
