'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export function Nav() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null)
      setUserName(session?.user?.user_metadata?.full_name ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null)
      setUserName(session?.user?.user_metadata?.full_name ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setMenuOpen(false)
    setMobileOpen(false)
    router.push('/')
  }

  const initial = (userName ?? userEmail)?.[0]?.toUpperCase()

  return (
    <nav ref={navRef} className="sticky top-0 z-50 bg-[#0F2137] border-b border-[#1a3050]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-6">
        <Link
          href="/"
          className="font-bold text-white text-[15px] tracking-tight shrink-0"
        >
          Earn{' '}
          <span className="text-[#4ADE80]">Remotely</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm text-[#8BAFC9] hover:text-white transition-colors font-medium">
            Browse Jobs
          </Link>
          <Link href="/companies" className="text-sm text-[#8BAFC9] hover:text-white transition-colors font-medium">
            Companies
          </Link>
          <Link href="/pricing" className="text-sm text-[#8BAFC9] hover:text-white transition-colors font-medium">
            Pricing
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Desktop account dropdown / login */}
          {userEmail ? (
            <div ref={menuRef} className="relative hidden md:block">
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
                    {userName && <p className="text-sm text-[#111827] font-medium truncate">{userName}</p>}
                    <p className={`text-sm truncate ${userName ? 'text-xs text-[#6B7A8D] mt-0.5' : 'text-[#111827] font-medium'}`}>{userEmail}</p>
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
              className="hidden md:block text-sm text-[#8BAFC9] hover:text-white transition-colors font-medium"
            >
              Log in
            </Link>
          )}

          <Link
            href="/post-a-job"
            className="text-sm bg-[#1A6B4A] text-white px-4 py-1.5 rounded-lg font-medium hover:bg-[#155a3d] transition-colors"
          >
            Post a Job
          </Link>

          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-[5px] focus:outline-none"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            <span className={`block w-5 h-0.5 bg-white transition-all duration-200 ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`block w-5 h-0.5 bg-white transition-all duration-200 ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-white transition-all duration-200 ${mobileOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile slide-down menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#1a3050] bg-[#0F2137] px-4 py-3">
          <div className="flex flex-col gap-1">
            <Link href="/" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-sm text-[#8BAFC9] hover:text-white hover:bg-[#1a3050] rounded-lg transition-colors font-medium">
              Browse Jobs
            </Link>
            <Link href="/companies" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-sm text-[#8BAFC9] hover:text-white hover:bg-[#1a3050] rounded-lg transition-colors font-medium">
              Companies
            </Link>
            <Link href="/pricing" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-sm text-[#8BAFC9] hover:text-white hover:bg-[#1a3050] rounded-lg transition-colors font-medium">
              Pricing
            </Link>

            <div className="border-t border-[#1a3050] my-1" />

            {userEmail ? (
              <>
                <div className="px-3 py-2">
                  {userName && <p className="text-sm text-white font-medium truncate">{userName}</p>}
                  <p className="text-xs text-[#8BAFC9] truncate mt-0.5">{userEmail}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-left px-3 py-2.5 text-sm text-[#8BAFC9] hover:text-white hover:bg-[#1a3050] rounded-lg transition-colors font-medium"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-sm text-[#8BAFC9] hover:text-white hover:bg-[#1a3050] rounded-lg transition-colors font-medium">
                Log in
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
