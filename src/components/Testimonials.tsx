const TESTIMONIALS = [
  {
    name: 'Syed Janian Shah',
    role: 'Key Account Manager',
    company: 'Mane',
    school: 'LUMS, Class of 2020',
    quote: 'I found this role through Earn Remotely and applied directly through the company\'s own page — no middlemen, no guesswork. The listing was exactly as described.',
    initials: 'SJ',
  },
  {
    name: 'Sarim Chathha',
    role: 'Marketing Manager',
    company: 'Canonical',
    school: 'GIKI, Class of 2017',
    quote: 'What stood out was that every listing I clicked into was actually legitimate and genuinely open to remote applicants. That\'s rarer than it should be.',
    initials: 'SC',
  },
  {
    name: 'Humayun Amjad',
    role: 'Full Stack Developer',
    company: 'Stripe',
    school: 'IBA, Class of 2015',
    quote: 'Earning in USD while based in Pakistan changed my financial trajectory. Earn Remotely made it simple to find companies that were serious about hiring remotely.',
    initials: 'HA',
  },
  {
    name: 'Amna Aslam',
    role: 'Supply Chain Director',
    company: 'Landewyck Tobacco',
    school: 'NUST, Class of 2015',
    quote: 'I wasn\'t expecting to find a director-level remote role, but the platform surprised me with how senior some of these listings actually are.',
    initials: 'AA',
  },
  {
    name: 'Saad Adeel',
    role: 'Marketing Associate',
    company: 'Canary Technologies',
    school: 'LUMS, Class of 2025',
    quote: 'As a recent grad, breaking into a global company felt out of reach. Earn Remotely gave me a direct shot without needing connections.',
    initials: 'SA',
  },
]

const AVATAR_COLORS = [
  'bg-[#1A6B4A] text-white',
  'bg-blue-600 text-white',
  'bg-violet-600 text-white',
  'bg-orange-500 text-white',
  'bg-rose-600 text-white',
]

export function Testimonials() {
  return (
    <section className="bg-[#F8FAFC] py-14">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-[#111827] mb-2">Hired via Earn Remotely</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              className="bg-white rounded-xl border border-[#D1D9E0] p-6 flex flex-col gap-4 shadow-sm"
            >
              <p className="text-sm text-[#374151] italic leading-relaxed flex-1">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-[#F0F2F5]">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
                  aria-hidden="true"
                >
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#111827]">{t.name}</p>
                  <p className="text-xs text-[#6B7A8D]">{t.role} @ {t.company}</p>
                  <p className="text-xs text-[#9BAFC4]">{t.school}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
