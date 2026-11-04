import AppLink from './AppLink'
import Icon from './Icon'

export default function QuickAction({ icon, title, description, to }) {
  return (
    <AppLink
      className="group flex min-w-0 items-center gap-3.5 rounded-2xl border border-line bg-white p-4.5 text-left no-underline shadow-[0_1px_2px_rgb(15_23_42/4%)] transition hover:-translate-y-0.5 hover:border-[#a9bfd8] hover:shadow-[0_8px_24px_rgb(23_59_101/10%)] focus-visible:border-accent max-sm:p-3.5"
      to={to}
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2.75 bg-[#eaf0f7] text-accent transition-colors group-hover:bg-[#dce8f5]">
        <Icon name={icon} />
      </span>
      <span className="grid min-w-0 gap-1">
        <strong className="text-sm text-ink transition-colors group-hover:text-accent">{title}</strong>
        <small className="text-xs leading-relaxed text-muted">{description}</small>
      </span>
      <Icon className="ml-auto h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" name="chevron" />
    </AppLink>
  )
}
