import { Link } from 'react-router-dom'
import { m } from 'motion/react'
import { documentCategories } from '../services/documents'
import OwnerAvatar from './OwnerAvatar'
import Icon from './Icon'
import RecordActionsMenu from './RecordActionsMenu'
import { formatRelativeUpdate, isRecentlyUpdated } from '../lib/sharedRecordFormatting'

function FolderCardSkeleton() {
  return (
    <div aria-hidden="true" className="loading-shimmer min-h-44 rounded-2xl border border-line bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-10 w-10 rounded-xl bg-slate-200/70" />
        <div className="h-5 w-16 rounded-full bg-slate-200/70" />
      </div>
      <div className="mb-3 h-4 w-3/4 rounded bg-slate-200/70" />
      <div className="mb-2 h-3 w-1/2 rounded bg-slate-200/70" />
      <div className="h-3 w-2/3 rounded bg-slate-200/70" />
    </div>
  )
}

export function SharedFolderGridSkeleton() {
  return (
    <div aria-label="Loading shared folders" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" role="status">
      <span className="sr-only">Loading shared folders...</span>
      {Array.from({ length: 6 }, (_, index) => <FolderCardSkeleton key={index} />)}
    </div>
  )
}

export default function SharedFolderCard({
  folder,
  showOwner = false,
  showViewOnly = true,
  showSharing = false,
  folderPath = `/records/shared/${folder.id}`,
  actions,
  titleContent,
  now,
}) {
  const isNew = isRecentlyUpdated(folder.updatedAt, now)
  const categoryLabels = (folder.categories || [])
    .map((category) => documentCategories.find((item) => item.value === category)?.label || category)
  const visibleCategories = categoryLabels.slice(0, 2)

  return (
    <m.article
      className="relative min-h-44 rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgb(15_23_42/4%)] transition-[border-color,background-color,box-shadow] hover:border-[#c5d3e2] hover:bg-slate-50/70 hover:shadow-md"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
    >
      {folderPath && (
        <Link
          aria-label={`${showViewOnly ? 'View only. ' : ''}Open ${showViewOnly ? 'shared ' : ''}folder ${folder.name}${folder.owner ? ` by ${folder.owner.name}` : ''}`}
          className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
          state={{ folderName: folder.name }}
          to={folderPath}
        />
      )}
      <div className={`relative z-10 flex h-full min-h-36 flex-col ${folderPath ? 'pointer-events-none' : ''}`}>
      <div className={`mb-3 flex items-center justify-between gap-3 ${actions ? 'pr-11' : ''}`}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf0f7] text-accent">
          <Icon className="h-5 w-5" name="folder" />
        </span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isNew && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#315b3c]">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#37834a]" />
              New
            </span>
          )}
          {showViewOnly && (
            <span aria-label="View only" className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-[#4d5668]" title="View only">
              <Icon className="h-3 w-3" name="lock" />
              View only
            </span>
          )}
          {showSharing && (
            <span
              aria-label={folder.is_shared ? 'Shared with active staff' : 'Private'}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${folder.is_shared ? 'bg-[#eaf7ee] text-[#287a4b]' : 'bg-slate-100 text-[#4d5668]'}`}
              title={folder.is_shared ? 'Shared with active staff' : 'Private'}
            >
              <Icon className="h-3 w-3" name={folder.is_shared ? 'users' : 'lock'} />
              {folder.is_shared ? 'Shared' : 'Private'}
            </span>
          )}
        </div>
      </div>

      {titleContent || (
        <p className="truncate text-sm font-bold text-ink" title={folder.name}>{folder.name}</p>
      )}
      {showOwner && (
        <div className="mt-2 flex min-w-0 items-center gap-2">
          <OwnerAvatar owner={folder.owner} size="h-6 w-6 text-[9px]" />
          <span className="truncate text-xs font-medium text-muted" title={folder.owner.name}>
            {folder.owner.name}
          </span>
        </div>
      )}
      <p className="mt-2 text-xs text-muted">
        {folder.fileCount} {folder.fileCount === 1 ? 'file' : 'files'} · {formatRelativeUpdate(folder.updatedAt, now)}
      </p>

      {visibleCategories.length > 0 && (
        <div aria-label="Folder categories" className="mt-auto flex flex-wrap gap-1.5 pt-3">
          {visibleCategories.map((label) => (
            <span className="max-w-full truncate rounded-full bg-[#edf1f6] px-2 py-1 text-[10px] font-semibold text-[#4d5668]" key={label} title={label}>
              {label}
            </span>
          ))}
          {categoryLabels.length > 2 && (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-[#4d5668]">
              +{categoryLabels.length - 2}
            </span>
          )}
        </div>
      )}
      </div>
      {actions && (
        <div className="absolute right-3 top-3 z-20">
          <RecordActionsMenu items={actions} name={folder.name} />
        </div>
      )}
    </m.article>
  )
}
