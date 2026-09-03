'use client'

import Link from 'next/link'
import { Code2, TrendingUp, Megaphone, DollarSign, Users, Scale } from 'lucide-react'

const CATEGORIES = [
  {
    label: 'Software Development',
    value: 'Software Development',
    Icon: Code2,
    color: 'bg-blue-100 text-blue-600',
    border: 'border-l-blue-500',
  },
  {
    label: 'Sales',
    value: 'Sales',
    Icon: TrendingUp,
    color: 'bg-emerald-100 text-emerald-600',
    border: 'border-l-emerald-500',
  },
  {
    label: 'Marketing',
    value: 'Marketing',
    Icon: Megaphone,
    color: 'bg-orange-100 text-orange-600',
    border: 'border-l-orange-500',
  },
  {
    label: 'Finance',
    value: 'Finance',
    Icon: DollarSign,
    color: 'bg-violet-100 text-violet-600',
    border: 'border-l-violet-500',
  },
  {
    label: 'HR',
    value: 'HR',
    Icon: Users,
    color: 'bg-pink-100 text-pink-600',
    border: 'border-l-pink-500',
  },
  {
    label: 'Legal',
    value: 'Legal',
    Icon: Scale,
    color: 'bg-amber-100 text-amber-600',
    border: 'border-l-amber-500',
  },
]

export function CategoryBrowse() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {CATEGORIES.map(({ label, value, Icon, color, border }) => (
        <Link
          key={value}
          href={`/?category=${encodeURIComponent(value)}`}
          className={`flex flex-col items-center gap-3 rounded-xl bg-white border border-[#D1D9E0] border-l-4 ${border} p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-[#9BAFC4] cursor-pointer group`}
        >
          <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center shrink-0`}>
            <Icon size={18} aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold text-[#111827] text-center leading-tight group-hover:text-[#1A6B4A] transition-colors">
            {label}
          </span>
        </Link>
      ))}
    </div>
  )
}
