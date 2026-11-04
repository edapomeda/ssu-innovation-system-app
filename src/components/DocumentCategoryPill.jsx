import { documentCategories } from '../services/documents'

const categoryStyles = {
  innovator: 'bg-sky-50 text-sky-700',
  project: 'bg-emerald-50 text-emerald-700',
  ip: 'bg-violet-50 text-violet-700',
  event: 'bg-amber-50 text-amber-700',
}

export default function DocumentCategoryPill({ type }) {
  const label = documentCategories.find((category) => category.value === type)?.label || type

  return (
    <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${categoryStyles[type] || 'bg-slate-100 text-slate-600'}`}>
      {label}
    </span>
  )
}
