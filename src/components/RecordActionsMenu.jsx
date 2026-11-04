import { useEffect, useRef, useState } from 'react'
import { m } from 'motion/react'
import Icon from './Icon'
import Popover from './motion/Popover'

export default function RecordActionsMenu({ name, items }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const triggerRef = useRef(null)
  const itemRefs = useRef([])

  useEffect(() => {
    if (!open) return undefined

    itemRefs.current[0]?.focus()

    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function moveFocus(event, index) {
    let nextIndex
    if (event.key === 'ArrowDown') nextIndex = (index + 1) % items.length
    if (event.key === 'ArrowUp') nextIndex = (index - 1 + items.length) % items.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = items.length - 1
    if (nextIndex === undefined) return

    event.preventDefault()
    itemRefs.current[nextIndex]?.focus()
  }

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <m.button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Actions for ${name}`}
        className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-white text-ink hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
        }}
        ref={triggerRef}
        type="button"
        whileTap={{ scale: 0.97 }}
      >
        <Icon className="h-5 w-5" name="more" />
      </m.button>
      <Popover
          aria-label={`Actions for ${name}`}
          className="absolute right-0 top-full z-30 mt-1 min-w-44 rounded-xl border border-line bg-white p-1.5 shadow-lg"
          onClick={(event) => event.stopPropagation()}
          open={open}
          ref={menuRef}
          role="menu"
        >
          {items.map((item, index) => (
            <button
              className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px] ${item.danger ? 'text-red-700' : 'text-ink'}`}
              key={item.label}
              onClick={(event) => {
                event.stopPropagation()
                setOpen(false)
                item.onSelect()
              }}
              onKeyDown={(event) => moveFocus(event, index)}
              ref={(element) => { itemRefs.current[index] = element }}
              role="menuitem"
              type="button"
            >
              {item.icon && <Icon className="h-4 w-4 shrink-0" name={item.icon} />}
              {item.label}
            </button>
          ))}
      </Popover>
    </div>
  )
}
