import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Button from './ui/Button'
import HeroVisual from './HeroVisual'
import { usePointer } from '../hooks/usePointer'
import { lineMaskParent, lineMaskChild, DUR, EASE_OUT } from '../lib/motion'

/** The headline, split so each line can reveal from behind its own mask. */
const HEADLINE = ['We build software', 'that moves', 'businesses forward.']

export default function Hero({ onOpenEnquiry }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const pointer = usePointer(ref)

  // Scroll-linked departure: the hero drifts up and dims as the next section
  // arrives. Range ends at 70% so it is fully resolved before Intro locks in.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -70])
  const visualY = useTransform(scrollYProgress, [0, 1], [0, -130])
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  // Cursor-responsive parallax. Larger object, smaller travel — the visual
  // moves less than the pointer, which is what makes it read as depth.
  const px = useTransform(pointer.x, [-0.5, 0.5], [18, -18])
  const py = useTransform(pointer.y, [-0.5, 0.5], [14, -14])

  return (
    <section
      id="top"
      ref={ref}
      className="relative flex min-h-0 lg:min-h-[100svh] flex-col justify-center overflow-hidden pt-[calc(var(--nav-h)+1.5rem)] pb-8 lg:pb-16"
    >
      {/* Faint engineering grid, faded at the edges so it never hard-clips. */}
      <div
        aria-hidden="true"
        className="grid-field mask-radial pointer-events-none absolute inset-0 opacity-[0.55]"
      />

      <div className="shell relative z-10 w-full">
        {/* ---------------------------------------------------------- copy */}
        <motion.div
          style={reduced ? undefined : { y: copyY, opacity: fade }}
          className="w-full lg:w-fit lg:max-w-[64%] xl:max-w-[65%]"
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: DUR.slow, delay: 0.15, ease: EASE_OUT }}
            className="eyebrow mb-4 lg:mb-6 flex items-center gap-3"
          >
            <span className="inline-block h-1.5 w-1.5 rotate-45 bg-accent" />
            Software &amp; Systems Engineering
          </motion.p>

          {/* Per-line mask reveal. Each line slides up from behind its own
              edge — reads as typesetting rather than as an effect. */}
          <motion.h1
            variants={lineMaskParent}
            initial="hidden"
            animate="visible"
            className="text-display-xl text-fg-0 [text-wrap:normal]"
          >
            {HEADLINE.map((line, i) => (
              /* pb leaves room inside the mask for the accent underline —
                 at 0.06em the overflow-hidden clipped it out of existence. */
              <span key={line} className="block overflow-hidden pb-[0.14em]">
                <motion.span variants={lineMaskChild} className="block">
                  {i === 2 ? (
                    <>
                      businesses{' '}
                      <span className="relative whitespace-nowrap">
                        forward.
                        <motion.span
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 1, delay: 1.15, ease: EASE_OUT }}
                          style={{ transformOrigin: 'left' }}
                          /* em-based so the rule scales with the display size. */
                          className="absolute bottom-[0.02em] left-0 h-[0.045em] w-full bg-accent"
                        />
                      </span>
                    </>
                  ) : (
                    line
                  )}
                </motion.span>
              </span>
            ))}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.slow, delay: 0.75, ease: EASE_OUT }}
            className="mt-5 lg:mt-6 max-w-[42rem] text-lead lg:text-[1.25rem] lg:leading-[1.65] text-fg-1"
          >
            Vortiqen designs and engineers scalable digital products, intelligent systems,
            and reliable software infrastructure for ambitious teams.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.slow, delay: 0.9, ease: EASE_OUT }}
            className="mt-6 lg:mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Button onClick={() => onOpenEnquiry?.()}>
              Start a Project
              <ArrowRight
                className="h-4 w-4 transition-transform duration-fast ease-ui group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Button>
            <Button href="#work" rank="secondary">
              Explore Our Work
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* ------------------------------------------------------------ visual
          One element, two compositions. It sits after the copy in the DOM, so
          on mobile it flows below the CTAs as its own band — never behind the
          type, where its nodes landed on top of words. From lg it becomes
          absolute and takes the right side as a subtle supporting element. */}
      <motion.div
        aria-hidden="true"
        style={reduced ? undefined : { y: visualY, opacity: fade }}
        className="pointer-events-none relative mt-8 sm:mt-10 flex h-[180px] sm:h-[220px] w-full items-center justify-center lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:flex lg:h-full lg:max-h-none lg:w-[36%] xl:w-[34%] lg:items-center lg:justify-end lg:pr-6 xl:pr-10 2xl:pr-16"
      >
        <motion.div
          style={reduced ? undefined : { x: px, y: py }}
          className="aspect-[300/420] h-auto w-auto max-h-[560px] max-w-[390px] text-fg-1 opacity-70 lg:opacity-80 lg:h-[72%]"
        >
          <HeroVisual />
        </motion.div>
      </motion.div>

      {/* Scroll affordance — desktop only, and the first thing to go. */}
      <motion.div
        aria-hidden="true"
        style={reduced ? undefined : { opacity: fade }}
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 lg:block"
      >
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: DUR.slow, delay: 1.6 }}
          className="eyebrow block text-fg-2/60"
        >
          Scroll
        </motion.span>
      </motion.div>
    </section>
  )
}
