export default function FormStep({ number, children }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#eaf0f7] text-[11px] font-bold text-accent"
      >
        {number}
      </span>
      <span>{children}</span>
    </span>
  )
}
