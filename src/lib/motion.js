export const duration = { fast: 0.15, base: 0.22 }

export const ease = {
  out: [0.22, 1, 0.36, 1],
  in: [0.4, 0, 1, 1],
}

export const spring = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }

export const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.out } },
  exit: { opacity: 0, y: -4, transition: { duration: duration.fast, ease: ease.in } },
}

export const fade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.base } },
  exit: { opacity: 0, transition: { duration: duration.fast } },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: duration.fast, ease: ease.out } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.1 } },
}

export const tabFadeUp = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.12, ease: ease.out } },
  exit: { opacity: 0, transition: { duration: 0.06, ease: ease.in } },
}

export const pageTransition = {
  ...fadeUp,
  visible: { ...fadeUp.visible, transition: { duration: duration.fast, ease: ease.out } },
  exit: { opacity: 0, transition: { duration: 0.08, ease: ease.in } },
}
