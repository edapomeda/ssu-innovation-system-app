import { forwardRef, useEffect, useRef } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { duration, ease, fade, scaleIn } from '../../lib/motion'

const ModalShell = forwardRef(function ModalShell(
  { children, className = '', open, onClose, ...props },
  ref,
) {
  const dialogRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return undefined

    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusable = () => [...(dialogRef.current?.querySelectorAll(
      'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    ) || [])]

    focusable()[0]?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current?.()
        return
      }

      if (event.key !== 'Tab') return
      const elements = focusable()
      if (!elements.length) {
        event.preventDefault()
        return
      }

      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <m.div
          animate="visible"
          className={`fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/40 p-4 ${className}`}
          exit="exit"
          initial="hidden"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose?.()
          }}
          variants={fade}
          {...props}
        >
          <m.div
            animate="visible"
            exit="exit"
            initial="hidden"
            ref={(element) => {
              dialogRef.current = element
              if (typeof ref === 'function') ref(element)
              else if (ref) ref.current = element
            }}
            style={{ y: 8 }}
            variants={{
              ...scaleIn,
              hidden: { ...scaleIn.hidden, y: 8 },
              visible: {
                ...scaleIn.visible,
                y: 0,
                transition: { duration: duration.fast, ease: ease.out },
              },
              exit: { ...scaleIn.exit, y: 4 },
            }}
          >
            {children}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
})

export default ModalShell
