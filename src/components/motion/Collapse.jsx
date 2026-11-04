import { forwardRef } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import { duration, ease } from '../../lib/motion'

const Collapse = forwardRef(function Collapse(
  { children, className = '', open, ...props },
  ref,
) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <AnimatePresence initial={false}>
      {open && (
        <m.div
          animate={{ height: 'auto', opacity: 1 }}
          className={className}
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          ref={ref}
          style={{ overflow: 'hidden' }}
          transition={shouldReduceMotion
            ? { height: { duration: 0 }, opacity: { duration: duration.fast } }
            : { duration: duration.base, ease: ease.out }}
          {...props}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  )
})

export default Collapse
