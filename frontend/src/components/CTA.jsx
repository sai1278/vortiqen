import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import Button from './ui/Button'
import VortiqenMark from './ui/VortiqenMark'
import { COMPANY } from '../data/site'
import { inView, DUR, EASE_OUT } from '../lib/motion'

/**
 * Closing conversion moment.
 *
 * The motion here is deliberately the slowest on the page — one long,
 * decelerating arrival rather than a stagger. Everything else has been
 * sequencing; this section settles.
 */
export default function CTA({ onOpenEnquiry }) {

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="relative overflow-hidden py-12 md:py-section"
    >
      <div
        aria-hidden="true"
        className="grid-field mask-radial pointer-events-none absolute inset-0 opacity-50"
      />

      <div className="shell relative">
        {/* A hairline frame that draws itself around the whole moment. */}
        <motion.div
          initial={{ opacity: 0, scaleY: 0.94 }}
          whileInView={{ opacity: 1, scaleY: 1 }}
          viewport={inView}
          transition={{ duration: 1.1, ease: EASE_OUT }}
          className="border border-[var(--line)] bg-ink-1/40 px-6 py-10 text-center sm:px-12 sm:py-24"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={inView}
            transition={{ duration: 1.2, delay: 0.15, ease: EASE_OUT }}
            className="mx-auto mb-6 md:mb-10 w-fit text-fg-1"
          >
            <VortiqenMark className="h-9 w-9" />
          </motion.div>

          <motion.h2
            id="contact-heading"
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={inView}
            transition={{ duration: 1.1, delay: 0.22, ease: EASE_OUT }}
            className="mx-auto max-w-3xl text-display-lg"
          >
            Have an idea worth building?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={inView}
            transition={{ duration: 1.1, delay: 0.34, ease: EASE_OUT }}
            className="mx-auto mt-6 max-w-xl text-lead text-fg-1"
          >
            Tell us what you&rsquo;re building. We&rsquo;ll help turn the idea into a
            reliable digital product.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={inView}
            transition={{ duration: 1.1, delay: 0.46, ease: EASE_OUT }}
            className="mt-8 md:mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button
              onClick={() => onOpenEnquiry?.()}
              className="w-full sm:w-auto"
            >
              Start a Project
              <ArrowUpRight
                className="h-4 w-4 transition-transform duration-fast ease-ui group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Button>
            <Button
              onClick={() => onOpenEnquiry?.()}
              rank="secondary"
              className="w-full sm:w-auto"
            >
              Talk to Vortiqen
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={inView}
            transition={{ duration: DUR.section, delay: 0.6, ease: EASE_OUT }}
            className="mt-6 md:mt-10 font-mono text-[0.75rem] text-fg-2"
          >
            <a
              href={`mailto:${COMPANY.email || 'hello@vortiqen.com'}`}
              className="inline-block py-1 underline decoration-[var(--line-strong)] decoration-1 underline-offset-4 transition-colors duration-fast ease-ui hover:text-fg-0 hover:decoration-accent"
            >
              {COMPANY.email || 'hello@vortiqen.com'}
            </a>
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
