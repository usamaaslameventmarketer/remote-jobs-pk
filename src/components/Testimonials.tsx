// ─── PLUG IN REAL TESTIMONIALS HERE ───────────────────────────────────────
// Replace placeholder entries with real names, quotes, roles, and companies.
// Each entry: { name, role, company, quote, initials }
const TESTIMONIALS = [
  {
    name: 'Sample User A',
    role: 'Software Engineer',
    company: 'Stripe',
    quote: 'Placeholder quote — replace with a real testimonial from a hired candidate.',
    initials: 'SA',
  },
  {
    name: 'Sample User B',
    role: 'Marketing Manager',
    company: 'Datadog',
    quote: 'Placeholder quote — replace with a real testimonial from a hired candidate.',
    initials: 'SB',
  },
  {
    name: 'Sample User C',
    role: 'Sales Executive',
    company: 'GitLab',
    quote: 'Placeholder quote — replace with a real testimonial from a hired candidate.',
    initials: 'SC',
  },
]
// ──────────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-[#1A6B4A] text-white',
  'bg-blue-600 text-white',
  'bg-violet-600 text-white',
]

export function Testimonials() {
  return (
    <section className="bg-[#F8FAFC] py-14">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-[#111827] mb-2">Hired via Remote Jobs PK</h2>
          <p className="text-[#6B7A8D] text-sm sm:text-base">
            Real Pakistanis. Real companies. Real salaries.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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
                  <p className="text-xs text-[#6B7A8D]">
                    {t.role} @ {t.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
