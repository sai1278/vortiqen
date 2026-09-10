import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import Button from './ui/Button'
import VortiqenMark from './ui/VortiqenMark'
import { submitContact, ApiError } from '../lib/api'
import { DUR, EASE_UI } from '../lib/motion'

const SERVICE_OPTIONS = [
  { value: '', label: 'Select service area (optional)' },
  { value: 'product-engineering', label: 'Product Engineering' },
  { value: 'ai-systems', label: 'AI & Intelligent Systems' },
  { value: 'cloud-devops', label: 'Cloud & DevOps' },
  { value: 'automation', label: 'Automation' },
  { value: 'backend-apis', label: 'Backend & APIs' },
  { value: 'ui-engineering', label: 'UI Engineering' },
  { value: 'other', label: 'Other / Not sure' },
]

export default function EnquiryDialog({ isOpen, onClose, initialService = '' }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    service: initialService,
    message: '',
    company_website: '', // Honeypot
  })

  const [status, setStatus] = useState('idle') // 'idle' | 'submitting' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('')
  const [reference, setReference] = useState('')

  const dialogRef = useRef(null)
  const firstInputRef = useRef(null)

  // Synchronize initial service if provided
  useEffect(() => {
    if (initialService) {
      setFormData((prev) => ({ ...prev, service: initialService }))
    }
  }, [initialService])

  // Reset form status when opening
  useEffect(() => {
    if (isOpen) {
      setStatus('idle')
      setErrorMessage('')
      // Focus first input on open
      setTimeout(() => {
        firstInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Basic client-side pre-validation
    if (formData.name.trim().length < 2) {
      setErrorMessage('Please enter your name (at least 2 characters).')
      setStatus('error')
      return
    }

    if (!formData.email.includes('@') || !formData.email.includes('.')) {
      setErrorMessage('Please enter a valid work email address.')
      setStatus('error')
      return
    }

    if (formData.message.trim().length < 20) {
      setErrorMessage(
        'Please describe your project or requirements in a bit more detail (minimum 20 characters).'
      )
      setStatus('error')
      return
    }

    setStatus('submitting')
    setErrorMessage('')

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        company: formData.company.trim() || undefined,
        service: formData.service || undefined,
        message: formData.message.trim(),
        company_website: formData.company_website,
      }

      const res = await submitContact(payload)

      setReference(res.reference || '')
      setStatus('success')
      // Clear form
      setFormData({
        name: '',
        email: '',
        company: '',
        service: '',
        message: '',
        company_website: '',
      })
    } catch (err) {
      setStatus('error')
      if (err instanceof ApiError) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage(
          'An unexpected error occurred while transmitting your enquiry. Please try again.'
        )
      }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="enquiry-dialog-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.fast, ease: EASE_UI }}
            onClick={onClose}
            className="fixed inset-0 bg-ink-0/80 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: DUR.base, ease: EASE_UI }}
            className="relative w-full max-w-xl border border-[var(--line-strong)] bg-ink-1 p-6 sm:p-10 shadow-2xl rounded-card max-h-[90vh] overflow-y-auto z-10"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute right-5 top-5 p-2 text-fg-2 hover:text-fg-0 transition-colors rounded-full border border-transparent hover:border-[var(--line)]"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <VortiqenMark className="h-7 w-7 text-fg-0" />
              <div>
                <span className="eyebrow block text-accent-soft">Start a Project</span>
                <h2 id="enquiry-dialog-title" className="font-display text-xl sm:text-2xl font-semibold text-fg-0">
                  Engineering Enquiry
                </h2>
              </div>
            </div>

            {status === 'success' ? (
              /* Success View */
              <div className="py-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent mb-5">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="font-display text-2xl font-semibold text-fg-0">
                  Enquiry Received
                </h3>
                <p className="mt-3 text-sm text-fg-1 max-w-sm mx-auto">
                  Thank you for reaching out. Our engineering team will review your project requirements and respond within one business day.
                </p>
                {reference && (
                  <div className="mt-5 inline-block rounded-md border border-[var(--line-strong)] bg-ink-2 px-4 py-2 text-xs font-mono text-fg-1">
                    Reference ID: <span className="text-fg-0 font-medium">{reference}</span>
                  </div>
                )}
                <div className="mt-8">
                  <Button onClick={onClose} className="w-full sm:w-auto">
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              /* Form View */
              <form onSubmit={handleSubmit} className="space-y-4">
                {status === 'error' && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-300"
                  >
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-400" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Honeypot field (hidden from genuine users) */}
                <input
                  type="text"
                  name="company_website"
                  value={formData.company_website}
                  onChange={handleChange}
                  tabIndex="-1"
                  autoComplete="off"
                  className="sr-only"
                  aria-hidden="true"
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="enquiry-name" className="block text-xs font-mono text-fg-2 uppercase tracking-wider mb-1.5">
                      Name <span className="text-accent">*</span>
                    </label>
                    <input
                      ref={firstInputRef}
                      id="enquiry-name"
                      name="name"
                      type="text"
                      required
                      disabled={status === 'submitting'}
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Jane Doe"
                      className="w-full rounded-md border border-[var(--line)] bg-ink-2 px-3.5 py-2.5 text-sm text-fg-0 placeholder-fg-2/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="enquiry-email" className="block text-xs font-mono text-fg-2 uppercase tracking-wider mb-1.5">
                      Work Email <span className="text-accent">*</span>
                    </label>
                    <input
                      id="enquiry-email"
                      name="email"
                      type="email"
                      required
                      disabled={status === 'submitting'}
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="jane@company.com"
                      className="w-full rounded-md border border-[var(--line)] bg-ink-2 px-3.5 py-2.5 text-sm text-fg-0 placeholder-fg-2/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="enquiry-company" className="block text-xs font-mono text-fg-2 uppercase tracking-wider mb-1.5">
                      Company / Organization
                    </label>
                    <input
                      id="enquiry-company"
                      name="company"
                      type="text"
                      disabled={status === 'submitting'}
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="Acme Corp"
                      className="w-full rounded-md border border-[var(--line)] bg-ink-2 px-3.5 py-2.5 text-sm text-fg-0 placeholder-fg-2/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="enquiry-service" className="block text-xs font-mono text-fg-2 uppercase tracking-wider mb-1.5">
                      Service Area
                    </label>
                    <select
                      id="enquiry-service"
                      name="service"
                      disabled={status === 'submitting'}
                      value={formData.service}
                      onChange={handleChange}
                      className="w-full rounded-md border border-[var(--line)] bg-ink-2 px-3.5 py-2.5 text-sm text-fg-0 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                    >
                      {SERVICE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-ink-2 text-fg-0">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="enquiry-message" className="block text-xs font-mono text-fg-2 uppercase tracking-wider mb-1.5">
                    Project Overview <span className="text-accent">*</span>
                  </label>
                  <textarea
                    id="enquiry-message"
                    name="message"
                    required
                    rows={4}
                    disabled={status === 'submitting'}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us what you are building, key constraints, and expected outcomes..."
                    className="w-full rounded-md border border-[var(--line)] bg-ink-2 px-3.5 py-2.5 text-sm text-fg-0 placeholder-fg-2/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors resize-none"
                  />
                  <span className="block text-[0.7rem] font-mono text-fg-2 mt-1">
                    Minimum 20 characters
                  </span>
                </div>

                <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-[0.75rem] font-mono text-fg-2">
                    Protected by first-party validation & rate limiting
                  </span>
                  <Button
                    as="button"
                    type="submit"
                    disabled={status === 'submitting'}
                    className="w-full sm:w-auto min-w-[160px]"
                  >
                    {status === 'submitting' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Transmitting...
                      </>
                    ) : (
                      <>
                        Submit Enquiry
                        <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
