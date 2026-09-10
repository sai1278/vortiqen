import { MotionConfig } from 'framer-motion'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Intro from './components/Intro'
import Services from './components/Services'
import Process from './components/Process'
import Work from './components/Work'
import Technology from './components/Technology'
import About from './components/About'
import CTA from './components/CTA'
import Footer from './components/Footer'
import EnquiryDialog from './components/EnquiryDialog'
import { useEnquiry } from './hooks/useEnquiry'

export default function App() {
  const { isOpen, preselectedService, openEnquiry, closeEnquiry } = useEnquiry()

  return (
    /*
     * reducedMotion="user" makes Framer drop transform and layout animations
     * for anyone with the OS preference set, keeping opacity only. Components
     * that own continuous or pointer-driven motion additionally check
     * useReducedMotion() and opt out entirely.
     */
    <MotionConfig reducedMotion="user">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-fg-0 focus:px-5 focus:py-3 focus:text-sm focus:font-medium focus:text-ink-0"
      >
        Skip to content
      </a>

      <Navbar onOpenEnquiry={openEnquiry} />

      <main id="main">
        <Hero onOpenEnquiry={openEnquiry} />
        <Intro />
        <Services onOpenEnquiry={openEnquiry} />
        <Process />
        <Work onOpenEnquiry={openEnquiry} />
        <Technology />
        <About />
        <CTA onOpenEnquiry={openEnquiry} />
      </main>

      <Footer onOpenEnquiry={openEnquiry} />

      <EnquiryDialog
        isOpen={isOpen}
        onClose={closeEnquiry}
        initialService={preselectedService}
      />
    </MotionConfig>
  )
}
