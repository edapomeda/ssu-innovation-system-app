export default function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 max-sm:mb-6 max-sm:gap-y-3">
      <div className="min-w-0 flex-1 max-sm:basis-full">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mb-1.5 mt-2 text-balance text-[clamp(26px,3vw,34px)] font-bold tracking-[-0.045em] text-ink max-sm:mt-1.5 max-sm:text-7">
          {title}
        </h1>
        {description && <p className="max-w-3xl text-pretty text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {children && <div className="shrink-0 max-sm:w-full [&>button]:max-sm:w-full">{children}</div>}
    </div>
  )
}
