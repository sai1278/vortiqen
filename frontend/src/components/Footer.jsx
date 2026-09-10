import VortiqenMark from './ui/VortiqenMark'
import { COMPANY, NAV, SERVICES } from '../data/site'

/**
 * Footer.
 *
 * No social links: none are included because no real URLs were provided, and
 * inventing profile links would be worse than omitting the row.
 */
export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-[var(--line)]">
      <div className="shell py-10 md:py-16">
        <div className="grid gap-8 md:gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 text-fg-0">
              <VortiqenMark className="h-6 w-6" />
              <span className="font-display text-[1.0625rem] font-semibold tracking-[-0.02em]">
                {COMPANY.name}
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-fg-1">{COMPANY.tagline}</p>
            <a
              href={`mailto:${COMPANY.email || 'hello@vortiqen.com'}`}
              className="mt-5 inline-block py-1 font-mono text-[0.75rem] text-fg-2 underline decoration-[var(--line-strong)] decoration-1 underline-offset-4 transition-colors duration-fast ease-ui hover:text-fg-0 hover:decoration-accent"
            >
              {COMPANY.email || 'hello@vortiqen.com'}
            </a>
          </div>

          {/* Navigation */}
          <nav aria-label="Footer navigation">
            <h2 className="eyebrow">Navigation</h2>
            <ul className="mt-4 space-y-1">
              {NAV.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="inline-block py-1 text-sm text-fg-1 transition-colors duration-fast ease-ui hover:text-fg-0"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Services */}
          <div>
            <h2 className="eyebrow">Services</h2>
            <ul className="mt-4 space-y-1">
              {SERVICES.map((s) => (
                <li key={s.id}>
                  <a
                    href="#services"
                    className="inline-block py-1 text-sm text-fg-1 transition-colors duration-fast ease-ui hover:text-fg-0"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 md:mt-16 flex flex-col gap-3 border-t border-[var(--line)] pt-6 md:pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[0.6875rem] text-fg-2">
            © {year} {COMPANY.name}. All rights reserved.
          </p>
          <a
            href="#top"
            className="inline-block py-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-2 transition-colors duration-fast ease-ui hover:text-fg-0"
          >
            Back to top
          </a>
        </div>
      </div>
    </footer>
  )
}
