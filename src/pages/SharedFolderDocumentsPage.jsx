import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, m } from 'motion/react'
import { useAuth } from '../auth/useAuth'
import DocumentCategoryPill from '../components/DocumentCategoryPill'
import EmptyState from '../components/EmptyState'
import Icon from '../components/Icon'
import { RowsSkeleton } from '../components/LoadingSkeleton'
import PageHeading from '../components/PageHeading'
import FadeIn from '../components/motion/FadeIn'
import { Stagger, StaggerItem } from '../components/motion/Stagger'
import { getCachedData, hasCachedData } from '../lib/dataCache'
import { fade } from '../lib/motion'
import { createDocumentDownloadUrl } from '../services/documents'
import { listStaffRecords, staffRecordsCacheKey } from '../services/staffRecords'

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString()
}

export default function SharedFolderDocumentsPage() {
  const { folderId } = useParams()
  const { session } = useAuth()
  const userId = session.user.id
  const cacheKey = staffRecordsCacheKey(userId)
  const cachedRecords = getCachedData(cacheKey)
  const [records, setRecords] = useState(cachedRecords)
  const [loading, setLoading] = useState(() => !hasCachedData(cacheKey))
  const [error, setError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [busyDocumentId, setBusyDocumentId] = useState('')

  const refresh = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      setRecords(await listStaffRecords(userId))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    let active = true

    listStaffRecords(userId)
      .then((data) => {
        if (active) setRecords(data)
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : String(requestError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [userId])

  const folder = records?.folders.find((item) => item.id === folderId && item.owner_id !== userId)
  const documents = useMemo(
    () => records?.documents.filter((document) => document.folder_id === folderId) || [],
    [folderId, records],
  )

  async function handleOpenDocument(document) {
    setDownloadError('')
    const fileWindow = window.open('about:blank', '_blank')
    if (!fileWindow) {
      setDownloadError('Allow pop-ups to open this file.')
      return
    }

    fileWindow.opener = null
    setBusyDocumentId(document.id)

    try {
      fileWindow.location.href = await createDocumentDownloadUrl(document.storage_path)
    } catch (requestError) {
      fileWindow.close()
      setDownloadError(requestError instanceof Error ? requestError.message : String(requestError))
    } finally {
      setBusyDocumentId('')
    }
  }

  return (
    <>
      <PageHeading
        description={folder ? `Read-only documents shared by ${folder.owner.name}.` : 'Read-only shared folder documents.'}
        eyebrow="SHARED RECORDS"
        title={folder?.name || 'Shared folder'}
      />
      <Link className="mb-4 inline-flex text-sm font-bold text-accent no-underline hover:underline" to="/records">
        ← Back to Shared Records
      </Link>

      {error && (
        <div
          aria-live="polite"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f1caca] bg-[#fff4f4] p-3.5 text-sm text-[#9b3434]"
          role="alert"
        >
          <p>{error}</p>
          <button
            className="min-h-9 rounded-lg border border-[#dbaaaa] px-3 text-xs font-bold text-[#762828] hover:bg-white focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            onClick={refresh}
            type="button"
          >
            Try again
          </button>
        </div>
      )}
      {downloadError && (
        <p aria-live="polite" className="mb-4 rounded-xl border border-[#f1caca] bg-[#fff4f4] p-3.5 text-sm text-[#9b3434]" role="alert">
          {downloadError}
        </p>
      )}

      <section aria-busy={loading} className="grid gap-3 rounded-3.5 border border-line bg-white p-5.5 shadow-[0_1px_2px_rgb(15_23_42/4%)] max-sm:p-4">
        <AnimatePresence mode="wait" initial={false}>
          <FadeIn key={loading ? 'loading' : 'loaded'} variants={fade}>
        {loading ? (
          <div aria-label="Loading shared folder documents" role="status">
            <span className="sr-only">Loading folder documents...</span>
            <RowsSkeleton />
          </div>
        ) : !folder ? (
          <EmptyState
            icon="folder"
            text="This folder may have been removed or is not available to your account."
            title="Shared folder unavailable"
          />
        ) : documents.length === 0 ? (
          <EmptyState
            icon="file"
            text="There are no active documents in this shared folder yet."
            title="No documents in this folder"
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <h2 className="text-sm font-bold text-ink">Documents in this folder</h2>
              <span className="rounded-full bg-[#eaf0f7] px-2.5 py-1 text-xs font-semibold text-accent">
                {documents.length} {documents.length === 1 ? 'file' : 'files'}
              </span>
            </div>
            <Stagger
              className="grid gap-3"
              itemKeys={documents.slice(0, 8).map((document) => document.id)}
              key={`shared-folder-documents-${folderId}`}
            >
            {documents.map((document, index) => (
              <StaggerItem index={index} itemKey={document.id} key={document.id}>
              <m.article
                className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-4 transition-[border-color,box-shadow] hover:border-[#c5d3e2] hover:shadow-md max-sm:items-start max-sm:p-3.5"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2.5 bg-[#eaf0f7] text-accent">
                  <Icon name="file" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="wrap-anywhere text-pretty text-sm font-bold text-ink">{document.name}</p>
                  <p className="mt-1 wrap-anywhere text-xs leading-relaxed text-muted">
                    {document.original_file_name} · {formatFileSize(document.file_size)} · {formatDate(document.created_at)}
                  </p>
                  <div className="mt-1">
                    <DocumentCategoryPill type={document.record_type} />
                  </div>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-muted">
                    <Icon className="h-3.5 w-3.5" name="lock" />
                    View only
                  </p>
                </div>
                <m.button
                  aria-label={`Open ${document.name}`}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line text-ink hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-60"
                  disabled={busyDocumentId === document.id}
                  onClick={() => handleOpenDocument(document)}
                  title="Open document"
                  type="button"
                  whileTap={{ scale: 0.97 }}
                >
                  <Icon className="h-4 w-4" name="download" />
                </m.button>
              </m.article>
              </StaggerItem>
            ))}
            </Stagger>
          </>
        )}
          </FadeIn>
        </AnimatePresence>
      </section>
    </>
  )
}
