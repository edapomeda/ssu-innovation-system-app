import { forwardRef } from 'react'
import { m } from 'motion/react'
import { pageTransition } from '../../lib/motion'

const PageTransition = forwardRef(function PageTransition({ children, className = '', ...props }, ref) {
  return (
    <m.div
      animate="visible"
      className={className}
      exit="exit"
      initial="hidden"
      ref={ref}
      variants={pageTransition}
      {...props}
    >
      {children}
    </m.div>
  )
})

export default PageTransition
