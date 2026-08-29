'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export function Nav() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Hydrate with current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null)
    })

    // Keep in sync with auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  const initial = userEmail?.[0]?.toUpperCase()

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
          <Link
            href="/companies"
            className="text-sm text-[#8BAFC9] hover:text-white transition-colors font-medium"
          >
            Companies
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {userEmail ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                title={userEmail}
                className="w-8 h-8 rounded-full bg-[#1A6B4A] text-white text-sm font-bold flex items-center justify-center hover:bg-[#155a3d] transition-colors focus:outline-none focus:ring-2 focus:ring-[#4ADE80] focus:ring-offset-2 focus:ring-offset-[#0F2137]"
                aria-label="User menu"
                aria-expanded={menuOpen}
              >
                {initial}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-[#D1D9E0] rounded-xl shadow-lg z-50 py-1 min-w-[200px]">
                  <div className="px-3 py-2.5 border-b border-[#F3F5F7]">
                    <p className="text-xs text-[#6B7A8D] font-medium">Signed in as</p>
                    <p className="text-sm text-[#111827] font-medium truncate mt-0.5">{userEmail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 text-sm text-[#374151] hover:bg-[#F3F5F7] transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden sm:block text-sm text-[#8BAFC9] hover:text-white transition-colors font-medium"
            >
              Log in
            </Link>
          )}

          <span className="text-sm bg-[#1A6B4A] text-white px-4 py-1.5 rounded-lg font-medium cursor-default select-none">
            Post a Job
          </span>
        </div>
      </div>
    </nav>
  )
}
