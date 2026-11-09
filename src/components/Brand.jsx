import Icon from './Icon'

export default function Brand({ compact = false, inverse = false }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`grid ${compact ? 'h-11 w-11' : 'h-12 w-12'} shrink-0 place-items-center rounded-xl ${inverse ? 'bg-white/10 text-white' : 'bg-[#eaf0f7] text-accent'}`}
      >
        <Icon className={compact ? 'h-6 w-6' : 'h-7 w-7'} name="lightbulb" />
      </span>
      <div>
        <p className={`text-xs font-extrabold tracking-[0.075em] ${inverse ? 'text-white' : 'text-ink'}`}>
          INNOVATION WORKSPACE
        </p>
        <p className={`mt-0.5 text-xs ${inverse ? 'text-white/80' : 'text-muted'}`}>
          Public prototype demo
        </p>
      </div>
    </div>
  )
}
