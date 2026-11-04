import Icon from './Icon'
import { m } from 'motion/react'
import { spring } from '../lib/motion'

export default function SharedRecordsToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  searchLabel,
  owners,
  ownerFilter,
  onOwnerChange,
  sortValue,
  onSortChange,
  sortOptions,
  categoryFilter,
  onCategoryChange,
  categories,
  view,
  onViewChange,
  categoryBeforeSort = true,
}) {
  const categoryControl = categories && (
    <label className="grid min-w-0 gap-1 text-xs font-semibold text-ink md:min-w-48">
      Category
      <select className="form-input" onChange={(event) => onCategoryChange(event.target.value)} value={categoryFilter}>
        <option value="all">All categories</option>
        {categories.map((category) => (
          <option key={category.value} value={category.value}>{category.label}</option>
        ))}
      </select>
    </label>
  )
  const sortControl = (
    <label className="grid min-w-0 gap-1 text-xs font-semibold text-ink md:min-w-44">
      Sort
      <select className="form-input" onChange={(event) => onSortChange(event.target.value)} value={sortValue}>
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )

  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
      <label className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl border border-line bg-slate-50/60 px-3.5 text-muted transition-colors focus-within:border-accent focus-within:bg-white focus-within:ring-3 focus-within:ring-accent/10">
        <Icon className="h-4.5 w-4.5 shrink-0" name="search" />
        <input
          aria-label={searchLabel}
          className="min-h-10 w-full min-w-0 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-muted/80"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          value={search}
        />
      </label>

      {owners && onOwnerChange && (
        <label className="grid min-w-0 gap-1 text-xs font-semibold text-ink md:min-w-40">
          Owner
          <select className="form-input" onChange={(event) => onOwnerChange(event.target.value)} value={ownerFilter}>
            <option value="all">All owners</option>
            {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
          </select>
        </label>
      )}

      {categoryBeforeSort && categoryControl}
      {sortControl}
      {!categoryBeforeSort && categoryControl}

      {onViewChange && (
        <div className="grid gap-1 text-xs font-semibold text-ink">
          View
          <div aria-label="Folder view" className="inline-flex min-h-11 rounded-lg border border-line bg-white p-1" role="group">
            {[
              { id: 'grouped', label: 'Grouped' },
              { id: 'all', label: 'All' },
            ].map((option) => (
              <m.button
                aria-pressed={view === option.id}
                className={`relative min-w-20 rounded-md px-3 text-xs font-bold transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${view === option.id ? 'text-white' : 'text-accent hover:bg-slate-50'}`}
                key={option.id}
                onClick={() => onViewChange(option.id)}
                type="button"
                whileTap={{ scale: 0.97 }}
              >
                {view === option.id && (
                  <m.span
                    className="absolute inset-0 rounded-md bg-accent"
                    layoutId="records-view-indicator"
                    transition={spring}
                  />
                )}
                <span className="relative z-10">{option.label}</span>
              </m.button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
