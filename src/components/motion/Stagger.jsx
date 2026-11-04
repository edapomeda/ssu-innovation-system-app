import { Children, createContext, forwardRef, useContext, useRef } from 'react'
import { m } from 'motion/react'
import { duration, ease } from '../../lib/motion'

const StaggerContext = createContext(null)

const Stagger = forwardRef(function Stagger(
  { children, className = '', itemKeys, ...props },
  ref,
) {
  const initialKeys = useRef(new Set(
    (itemKeys || Children.toArray(children).map((child) => child.props?.itemKey).filter(Boolean))
      .slice(0, 8),
  ))
  const seen = useRef(new Set())

  return (
    <StaggerContext.Provider value={{ initialKeys, seen }}>
      <m.div
        animate="visible"
        className={className}
        initial="hidden"
        ref={ref}
        {...props}
      >
        {children}
      </m.div>
    </StaggerContext.Provider>
  )
})

const StaggerItem = forwardRef(function StaggerItem(
  {
    children,
    className = '',
    index = 0,
    initial,
    itemKey,
    variants: customVariants,
    ...props
  },
  ref,
) {
  const stagger = useContext(StaggerContext)
  const shouldAnimate = Boolean(
    stagger && itemKey && stagger.initialKeys.current.has(itemKey) && !stagger.seen.current.has(itemKey),
  )
  if (stagger && itemKey) stagger.seen.current.add(itemKey)
  const variants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: duration.base,
        ease: ease.out,
        delay: index < 8 ? index * 0.04 : 0,
      },
    },
  }

  return (
    <m.div
      animate="visible"
      className={className}
      initial={initial ?? (shouldAnimate ? 'hidden' : false)}
      ref={ref}
      variants={customVariants ?? variants}
      {...props}
    >
      {children}
    </m.div>
  )
})

export { Stagger, StaggerItem }
