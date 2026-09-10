import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import Button from './ui/Button'
import VortiqenMark from './ui/VortiqenMark'
import { useScrolled } from '../hooks/useScrolled'
import { useActiveSection } from '../hooks/useActiveSection'
import { COMPANY, NAV } from '../data/site'
import { DUR, EASE_OUT, EASE_UI } from '../lib/motion'

/**
 * Fixed navigation.
 *
 * At rest it is transparent and open. Past 24px it compacts: less vertical
 * padding, a translucent canvas, and a hairline underneath. The transition is
 * a height/colour change only — no layout reflow of the page beneath.
 */
export default function Navbar({ onOpenEnquiry }) {
  const scrolled = useScrolled(24)
  const [open, setOpen] = useState(false)

  const ids = useMemo(() => NAV.map((n) => n.id), [])
  const active = useActiveSection(ids)

  // Lock background scroll while the mobile sheet is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Escape closes the sheet — every overlay needs an escape route.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <motion.div
        animate={{
          // Opaque while the sheet is open so the bar matches it exactly.
          backgroundColor: open
            ? 'rgba(8,9,11,1)'
            : scrolled
              ? 'rgba(8,9,11,0.72)'
              : 'rgba(8,9,11,0)',
          paddingTop: scrolled ? 10 : 20,
          paddingBottom: scrolled ? 10 : 20,
        }}
        transition={{ duration: DUR.base, ease: EASE_UI }}
        style={{ backdropFilter: scrolled && !open ? 'blur(14px)' : 'none' }}
        className="relative"
      >
        <div className="shell flex items-center justify-between gap-6">
          {/* Wordmark */}
          <a
            href="#top"
            className="flex items-center gap-2.5 text-fg-0"
            aria-label={`${COMPANY.name} — home`}
          >
            <VortiqenMark className="h-[26px] w-[26px] shrink-0" spin />
            <span className="font-display text-[1.0625rem] font-semibold tracking-[-0.02em]">
              {COMPANY.name}
            </span>
          </a>

          {/* Desktop links */}
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV.map((item) => {
                const current = active === item.id
                return (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      aria-current={current ? 'true' : undefined}
                      className={`relative block px-3.5 py-2 text-sm transition-colors duration-fast ease-ui ${
                        current ? 'text-fg-0' : 'text-fg-1 hover:text-fg-0'
                      }`}
                    >
                      {item.label}
                      {current && (
                        <motion.span
                          layoutId="nav-active"
                          transition={{ duration: DUR.base, ease: EASE_OUT }}
                          className="absolute inset-x-3.5 -bottom-0.5 h-px bg-accent"
                        />
                      )}
                    </a>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => onOpenEnquiry?.()}
              className="hidden sm:inline-flex"
            >
              Start a Project
            </Button>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="-mr-2 flex h-11 w-11 items-center justify-center text-fg-0 lg:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Hairline appears only in the compact state */}
        <motion.div
          animate={{ opacity: scrolled ? 1 : 0 }}
          transition={{ duration: DUR.base, ease: EASE_UI }}
          className="absolute inset-x-0 bottom-0 h-px bg-[var(--line)]"
        />
      </motion.div>

      {/* Mobile sheet — full-height, large tap targets, its own layout */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: DUR.fast } }}
            transition={{ duration: DUR.base, ease: EASE_UI }}
            /* Fully opaque: at 98% + backdrop-blur the hero headline and the
               white CTA behind it smeared through as bright blobs. */
            className="fixed inset-0 top-[var(--nav-h)] bg-ink-0 lg:hidden"
          >
            <nav aria-label="Primary" className="shell flex h-full flex-col pt-8">
              <ul className="flex flex-col">
                {NAV.map((item, i) => (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: DUR.base,
                      delay: 0.04 + i * 0.035,
                      ease: EASE_OUT,
                    }}
                    className="border-b border-[var(--line)]"
                  >
                    <a
                      href={`#${item.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-baseline gap-4 py-5 text-display-sm text-fg-0"
                    >
                      <span className="eyebrow tnum text-fg-2/60">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {item.label}
                    </a>
                  </motion.li>
                ))}
              </ul>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DUR.base, delay: 0.28, ease: EASE_OUT }}
                className="mt-auto pb-10 pt-8"
              >
                <Button
                  onClick={() => {
                    setOpen(false)
                    onOpenEnquiry?.()
                  }}
                  className="w-full"
                >
                  Start a Project
                </Button>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
