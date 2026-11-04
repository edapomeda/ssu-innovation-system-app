import { forwardRef } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { scaleIn } from '../../lib/motion'

const Popover = forwardRef(function Popover(
  { children, className = '', open, ...props },
  ref,
) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <m.div
          animate="visible"
          className={className}
          exit="exit"
          initial="hidden"
          ref={ref}
          style={{ transformOrigin: 'top right' }}
          variants={scaleIn}
          {...props}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  )
})

export default Popover
