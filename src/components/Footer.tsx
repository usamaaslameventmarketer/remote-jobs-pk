export function Footer() {
  return (
    <footer className="bg-[#0F2137] border-t border-[#1a3050] mt-16">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-[#5E7E9A] text-sm">
          © 2026 Remote Jobs PK. Curated for Pakistan-based talent.
        </p>
        <div className="flex gap-6">
          {['About', 'Submit a Job', 'Contact'].map((label) => (
            <span
              key={label}
              className="text-sm text-[#5E7E9A] hover:text-white transition-colors cursor-default"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </footer>
  )
}
