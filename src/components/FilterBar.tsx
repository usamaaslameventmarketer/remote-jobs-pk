'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import { MapPin, Briefcase, BarChart2 } from 'lucide-react'

const LOCATION_OPTIONS = [
  { label: 'All Locations', value: '' },
  { label: 'Worldwide', value: 'Worldwide' },
  { label: 'USA', value: 'USA' },
  { label: 'UK', value: 'UK' },
  { label: 'EMEA', value: 'EMEA' },
  { label: 'APAC', value: 'APAC' },
]

const DEPARTMENT_OPTIONS = [
  { label: 'All Departments', value: '' },
  { label: 'Software Dev', value: 'Software Development' },
  { label: 'Sales', value: 'Sales' },
  { label: 'Marketing', value: 'Marketing' },
  { label: 'HR', value: 'HR' },
  { label: 'Legal', value: 'Legal' },
  { label: 'Finance', value: 'Finance' },
]

const SENIORITY_OPTIONS = [
  { label: 'All Levels', value: '' },
  { label: 'Entry-level', value: 'entry' },
  { label: 'Mid-level', value: 'mid' },
  { label: 'Senior', value: 'senior' },
]

function Dropdown({
  label,
  options,
  paramKey,
  currentValue,
  q,
  region,
  category,
  seniority,
  Icon,
}: {
  label: string
  options: { label: string; value: string }[]
  paramKey: string
  currentValue: string
  q: string
  region: string
  category: string
  seniority: string
  Icon?: React.ElementType
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === currentValue)
  const hasSelection = currentValue !== ''

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function select(value: string) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (region) params.set('region', region)
    if (category) params.set('category', category)
    if (seniority) params.set('seniority', seniority)
    if (value) params.set(paramKey, value)
    else params.delete(paramKey)
    setOpen(false)
    router.push(`/?${params.toString()}`)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap ${
          hasSelection
            ? 'bg-[#1A6B4A] text-white border-[#1A6B4A]'
            : 'bg-white text-[#374151] border-[#D1D9E0] hover:border-[#9BAFC4] hover:text-[#111827]'
        }`}
      >
        {Icon && <Icon size={13} aria-hidden="true" />}
        {hasSelection ? `${label}: ${selected?.label}` : label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-[#D1D9E0] rounded-lg shadow-md z-20 py-1 min-w-[170px]">
          {options.map(({ label: optLabel, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => select(value)}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                currentValue === value
                  ? 'bg-[#F0FAFB] text-[#1A6B4A] font-medium'
                  : 'text-[#374151] hover:bg-[#F3F5F7]'
              }`}
            >
              {optLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function FilterBar({
  region = '',
  category = '',
  seniority = '',
  q = '',
}: {
  region?: string
  category?: string
  seniority?: string
  q?: string
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Dropdown
        label="Location"
        options={LOCATION_OPTIONS}
        paramKey="region"
        currentValue={region}
        q={q}
        region={region}
        category={category}
        seniority={seniority}
        Icon={MapPin}
      />
      <Dropdown
        label="Department"
        options={DEPARTMENT_OPTIONS}
        paramKey="category"
        currentValue={category}
        q={q}
        region={region}
        category={category}
        seniority={seniority}
        Icon={Briefcase}
      />
      <Dropdown
        label="Seniority"
        options={SENIORITY_OPTIONS}
        paramKey="seniority"
        currentValue={seniority}
        q={q}
        region={region}
        category={category}
        seniority={seniority}
        Icon={BarChart2}
      />
    </div>
  )
}
