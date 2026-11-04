import Icon from './Icon'

export default function EmptyState({ icon, title, text, children }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white/70 p-6 text-center">
      <span className="mb-3 grid h-12 w-12 place-items-center rounded-3.25 bg-[#eaf0f7] text-accent">
        <Icon name={icon} />
      </span>
      <h3 className="mb-1 text-sm font-bold text-ink">{title}</h3>
      <p className="max-w-96 text-pretty text-sm leading-relaxed text-muted">{text}</p>
      {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  )
}
