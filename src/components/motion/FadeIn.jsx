import { forwardRef } from 'react'
import { m } from 'motion/react'
import { fadeUp } from '../../lib/motion'

const FadeIn = forwardRef(function FadeIn(
  { children, className = '', variants = fadeUp, ...props },
  ref,
) {
  return (
    <m.div
      animate="visible"
      className={className}
      exit="exit"
      initial="hidden"
      ref={ref}
      variants={variants}
      {...props}
    >
      {children}
    </m.div>
  )
})

export default FadeIn
