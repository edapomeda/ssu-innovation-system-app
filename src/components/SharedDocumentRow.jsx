import { Link } from 'react-router-dom'
import { m } from 'motion/react'
import DocumentCategoryPill from './DocumentCategoryPill'
import Icon from './Icon'
import OwnerAvatar from './OwnerAvatar'
import RecordActionsMenu from './RecordActionsMenu'
import { formatFileSize, formatRelativeUpdate, isRecentlyUpdated } from '../lib/sharedRecordFormatting'

export function SharedDocumentRowsSkeleton() {
  return (
    <div aria-label="Loading shared documents" className="grid gap-3" role="status">
      <span className="sr-only">Loading shared documents...</span>
      {Array.from({ length: 6 }, (_, index) => (
        <div className="loading-shimmer h-20 rounded-xl border border-line bg-white lg:h-[72px]" key={index} />
      ))}
    </div>
  )
}

function OwnerSummary({ owner }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <OwnerAvatar owner={owner} size="h-7 w-7 text-[10px]" />
      <span className="truncate text-xs font-medium text-ink" title={owner.name}>{owner.name}</span>
    </div>
  )
}

function UpdateSummary({ value, now }) {
  const date = new Date(value)
  const fullDate = Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString()

  return (
    <span className="whitespace-nowrap text-xs text-muted" title={fullDate}>
      {formatRelativeUpdate(value, now)}
    </span>
  )
}

export default function SharedDocumentRow({
  document,
  now,
  busy,
  onDownload,
  showOwner = true,
  showSharing = false,
  showFolderLink = true,
  hideMatchingFileName = false,
  titleContent,
  folderPathPrefix = '/records/shared/',
  downloadIcon = 'download',
  actions,
}) {
  const isNew = isRecentlyUpdated(document.updatedAt, now)
  const showOriginalFileName = !hideMatchingFileName || document.original_file_name !== document.name
  const folderLabel = (
    <>
      <Icon className="h-3.5 w-3.5 shrink-0" name="folder" />
      <span className="truncate">{document.folder_name}</span>
    </>
  )

  return (
    <m.article
      className={`grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 rounded-xl border border-line bg-white p-3.5 transition-[border-color,box-shadow] hover:border-[#c5d3e2] hover:shadow-md lg:items-center lg:gap-4 ${showOwner ? 'lg:grid-cols-[minmax(0,1fr)_minmax(120px,190px)_minmax(120px,165px)_auto]' : 'lg:grid-cols-[minmax(0,1fr)_minmax(120px,165px)_auto]'}`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="col-start-1 row-start-1 min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-accent" name="file" />
          {titleContent || (
            <p className="min-w-0 truncate text-sm font-bold text-ink" title={document.name}>
              {document.name}
            </p>
          )}
          {isNew && (
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#315b3c]">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#37834a]" />
              New
            </span>
          )}
        </div>
        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted">
          {showOriginalFileName && (
            <>
              <span className="min-w-0 truncate" title={document.original_file_name}>
                {document.original_file_name}
              </span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span className="shrink-0">{formatFileSize(document.file_size)}</span>
        </p>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {showFolderLink ? (
            <Link
              aria-label={`Open folder ${document.folder_name}`}
              className="inline-flex min-w-0 max-w-full items-center gap-1 text-xs font-medium text-accent no-underline hover:underline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              title={document.folder_name}
              to={`${folderPathPrefix}${document.folder_id}`}
            >
              {folderLabel}
            </Link>
          ) : (
            <span className="inline-flex min-w-0 max-w-full items-center gap-1 text-xs font-medium text-accent" title={document.folder_name}>
              {folderLabel}
            </span>
          )}
          <DocumentCategoryPill type={document.record_type} />
          {showSharing && (
            <span
              aria-label={document.shared ? 'Shared with active staff' : 'Private'}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${document.shared ? 'bg-[#eaf7ee] text-[#287a4b]' : 'bg-slate-100 text-[#4d5668]'}`}
              title={document.shared ? 'Shared with active staff' : 'Private'}
            >
              <Icon className="h-3 w-3" name={document.shared ? 'users' : 'lock'} />
              {document.shared ? 'Shared' : 'Private'}
            </span>
          )}
        </div>
      </div>

      {showOwner && (
        <div className="hidden min-w-0 lg:block">
          <OwnerSummary owner={document.owner} />
        </div>
      )}
      <div className={`hidden lg:block ${showOwner ? 'lg:col-start-3' : 'lg:col-start-2'}`}>
        <UpdateSummary now={now} value={document.updatedAt} />
      </div>

      <div className={`col-start-2 row-start-1 flex items-center gap-1.5 self-start lg:self-center ${showOwner ? 'lg:col-start-4' : 'lg:col-start-3'}`}>
        <m.button
          aria-label={`Download ${document.name}`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line text-ink hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60"
          disabled={busy}
          onClick={() => onDownload(document)}
          title="Download"
          type="button"
          whileTap={{ scale: 0.97 }}
        >
          <Icon className="h-4 w-4" name={downloadIcon} />
        </m.button>
        {actions && <RecordActionsMenu items={actions} name={document.name} />}
      </div>

      <div className="col-span-2 flex min-w-0 items-center justify-between gap-3 lg:hidden">
        {showOwner && <OwnerSummary owner={document.owner} />}
        <UpdateSummary now={now} value={document.updatedAt} />
      </div>
    </m.article>
  )
}
