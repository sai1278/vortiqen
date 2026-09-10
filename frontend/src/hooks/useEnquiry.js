import { useState, useCallback, useRef } from 'react'

/**
 * Hook to manage Enquiry modal visibility and focus preservation.
 */
export function useEnquiry() {
  const [isOpen, setIsOpen] = useState(false)
  const [preselectedService, setPreselectedService] = useState('')
  const triggerRef = useRef(null)

  const openEnquiry = useCallback((service = '', triggerElement = null) => {
    if (triggerElement) {
      triggerRef.current = triggerElement
    } else if (document.activeElement instanceof HTMLElement) {
      triggerRef.current = document.activeElement
    }
    setPreselectedService(service)
    setIsOpen(true)
  }, [])

  const closeEnquiry = useCallback(() => {
    setIsOpen(false)
    if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
      setTimeout(() => {
        triggerRef.current?.focus()
      }, 50)
    }
  }, [])

  return {
    isOpen,
    preselectedService,
    openEnquiry,
    closeEnquiry,
  }
}
