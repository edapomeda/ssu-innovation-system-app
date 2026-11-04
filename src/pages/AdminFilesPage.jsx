import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import DocumentCategoryPill from '../components/DocumentCategoryPill'
import EmptyState from '../components/EmptyState'
import Icon from '../components/Icon'
import { RowsSkeleton } from '../components/LoadingSkeleton'
import PageHeading from '../components/PageHeading'
import { getCachedData, hasCachedData } from '../lib/dataCache'
import { adminFilesCacheKey, listAdminFiles } from '../services/adminFiles'
import { deleteDocument, createDocumentDownloadUrl, updateDocument } from '../services/documents'
import { deleteFolder, renameFolder } from '../services/folders'

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AdminFilesPage() {
  const { session } = useAuth()
  const userId = session.user.id
  const cacheKey = adminFilesCacheKey(userId)
  const [library, setLibrary] = useState(() => getCachedData(cacheKey) ?? { folders: [], documents: [] })
  const [tab, setTab] = useState('folders')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(() => !hasCachedData(cacheKey))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState('')
  const [name, setName] = useState('')
  const [downloadUrls, setDownloadUrls] = useState({})

  const refresh = useCallback(async () => {
    setError('')
    try {
      const data = await listAdminFiles(userId)
      setLibrary(data)
      return true
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError))
      return false
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    let active = true

    listAdminFiles(userId)
      .then((data) => {
        if (active) setLibrary(data)
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : String(requestError))
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [userId])

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    const items = tab === 'folders' ? library.folders : library.documents

    return items.filter((item) => {
      const searchableText =
        tab === 'folders'
          ? `${item.name} ${item.owner_name} ${item.owner_email}`
          : `${item.name} ${item.original_file_name} ${item.folder_name} ${item.owner_name} ${item.owner_email}`
      return searchableText.toLocaleLowerCase().includes(normalizedQuery)
    })
  }, [library, query, tab])

  function startEdit(item) {
    setEditing(item.id)
    setName(item.name)
    setError('')
    setStatus('')
  }

  function cancelEdit() {
    setEditing('')
    setName('')
  }

  async function saveEdit(event, item) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setStatus('')

    try {
      if (tab === 'folders') {
        await renameFolder(item.id, name)
      } else {
        await updateDocument(item.id, {
          name,
          recordType: item.record_type,
          innovationRecordId: item.innovation_record_id,
        })
      }

      cancelEdit()
      if (await refresh()) setStatus(tab === 'folders' ? 'Folder renamed.' : 'Document renamed.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(item) {
    const itemType = tab === 'folders' ? 'folder' : 'document'
    const extraMessage =
      tab === 'folders'
        ? ' Documents in the folder will no longer be available.'
        : ' The file will be hidden but retained in storage.'
    if (!window.confirm(`Delete ${itemType} "${item.name}"?${extraMessage}`)) return

    setBusy(true)
    setError('')
    setStatus('')
    try {
      if (tab === 'folders') {
        await deleteFolder(item.id)
      } else {
        await deleteDocument(item.id)
      }
      cancelEdit()
      if (await refresh()) setStatus(`${itemType[0].toUpperCase()}${itemType.slice(1)} deleted.`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError))
    } finally {
      setBusy(false)
    }
  }

  async function handleDownload(document) {
    setError('')
    try {
      const url = await createDocumentDownloadUrl(document.storage_path)
      setDownloadUrls((current) => ({ ...current, [document.id]: url }))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError))
    }
  }

  return (
    <>
      <PageHeading
        description="Browse and manage every active folder and document in the Innovation Office."
        eyebrow="ADMINISTRATION"
        title="Folder & document management"
      />

      {(error || status) && (
        <p
          aria-live="polite"
          className={`mb-4 rounded-xl p-3.5 text-sm ${error ? 'border border-[#f1caca] bg-[#fff4f4] text-[#9b3434]' : 'border border-[#cce8d5] bg-[#f1fbf4] text-[#287a4b]'}`}
          role={error ? 'alert' : 'status'}
        >
          {error || status}
        </p>
      )}

      <section aria-busy={loading} className="rounded-3.5 border border-line bg-white p-5.5 shadow-[0_1px_2px_rgb(15_23_42/4%)] max-sm:p-4">
        <label className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-slate-50/60 px-3.5 text-muted transition-colors focus-within:border-accent focus-within:bg-white focus-within:ring-3 focus-within:ring-accent/10">
          <Icon className="h-4.5 w-4.5" name="search" />
          <input
            aria-label={`Search ${tab}`}
            className="min-h-11 w-full min-w-0 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-muted/80"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${tab} by name or owner...`}
            value={query}
          />
          {query && (
            <button
              aria-label="Clear search"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-0 bg-transparent text-xl text-muted hover:bg-slate-100 hover:text-ink"
              onClick={() => setQuery('')}
              type="button"
            >
              ×
            </button>
          )}
        </label>

        <div aria-label="Manage folders and documents" className="mb-4.5 mt-4.5 grid grid-cols-2 border-b border-line">
          {[
            { id: 'folders', label: 'All folders', count: library.folders.length },
            { id: 'documents', label: 'All documents', count: library.documents.length },
          ].map((item) => (
            <button
              aria-pressed={tab === item.id}
              className={`flex min-h-12 items-center justify-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors ${tab === item.id ? 'border-accent font-bold text-accent' : 'border-transparent text-muted hover:text-ink'}`}
              key={item.id}
              onClick={() => {
                setTab(item.id)
                setQuery('')
                cancelEdit()
                setStatus('')
              }}
              type="button"
            >
              <span>{item.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tab === item.id ? 'bg-[#eaf0f7] text-accent' : 'bg-slate-100 text-muted'}`}>
                {item.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div aria-label={`Loading ${tab}`} className="py-2" role="status">
            <span className="sr-only">Loading {tab}...</span>
            <RowsSkeleton count={4} />
          </div>
        ) : error && !visibleItems.length ? (
          <div className="grid gap-3 py-6 text-center">
            <button
              className="mx-auto rounded-lg border border-line px-4 py-2 text-xs font-bold text-[#5f6276]"
              onClick={refresh}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : visibleItems.length === 0 ? (
          <EmptyState
            icon="folder"
            text={query ? 'Try another search term.' : `Active ${tab} will appear here.`}
            title={query ? 'No matching results' : `No active ${tab}`}
          />
        ) : (
          <div className="grid gap-3">
            <p className="px-1 text-xs text-muted">
              Showing {visibleItems.length} of {tab === 'folders' ? library.folders.length : library.documents.length}{' '}
              {tab === 'folders'
                ? library.folders.length === 1 ? 'folder' : 'folders'
                : library.documents.length === 1 ? 'document' : 'documents'}
            </p>
            {visibleItems.map((item) => (
              <article
                className="group flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-4 transition-colors hover:border-[#c5d3e2] hover:bg-slate-50/70 max-sm:items-start max-sm:p-3.5"
                key={item.id}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3 max-sm:basis-full">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2.5 bg-[#eaf0f7] text-accent transition-colors group-hover:bg-[#dce8f5]">
                    <Icon name={tab === 'folders' ? 'folder' : 'file'} />
                  </span>
                  {editing === item.id ? (
                    <form className="flex min-w-0 flex-1 flex-wrap gap-2" onSubmit={(event) => saveEdit(event, item)}>
                      <input
                        aria-label={tab === 'folders' ? 'Folder name' : 'Document name'}
                        autoFocus
                        className="form-input min-w-40 flex-1 max-sm:min-w-0"
                        maxLength={tab === 'folders' ? 100 : 200}
                        onChange={(event) => setName(event.target.value)}
                        required
                        value={name}
                      />
                      <button
                        className="min-h-10 rounded-lg bg-accent px-3 py-2 text-sm font-bold text-white hover:bg-[#102d4f] disabled:opacity-60"
                        disabled={busy}
                        type="submit"
                      >
                        {busy ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="min-h-10 rounded-lg border border-line px-3 py-2 text-sm font-bold text-ink hover:bg-slate-50"
                        disabled={busy}
                        onClick={cancelEdit}
                        type="button"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p className={`wrap-anywhere text-pretty font-bold text-ink ${tab === 'documents' ? 'text-base' : 'text-sm'}`}>
                        {item.name}
                      </p>
                      {tab === 'folders' ? (
                        <>
                          <p className="mt-1 wrap-anywhere text-xs leading-relaxed text-muted">
                            Owner: {item.owner_name}{item.owner_email && item.owner_name !== item.owner_email ? ` · ${item.owner_email}` : ''}
                          </p>
                          <p className="mt-1 text-xs text-muted">Created {formatDate(item.created_at)}</p>
                        </>
                      ) : (
                        <>
                          <p className="mt-1 wrap-anywhere text-xs leading-relaxed text-muted">
                            {item.original_file_name} · {formatFileSize(item.file_size)} · {formatDate(item.created_at)}
                          </p>
                          <p className="mt-1 wrap-anywhere text-xs font-semibold text-accent">
                            {item.folder_name}
                          </p>
                          <div className="mt-1">
                            <DocumentCategoryPill type={item.record_type} />
                          </div>
                          <p className="mt-1 wrap-anywhere text-xs leading-relaxed text-muted">
                            Owner: {item.owner_name}{item.owner_email && item.owner_name !== item.owner_email ? ` · ${item.owner_email}` : ''}
                          </p>
                          {downloadUrls[item.id] && (
                            <a
                              className="mt-2 inline-flex text-xs font-bold text-purple"
                              href={downloadUrls[item.id]}
                              rel="noreferrer"
                              target="_blank"
                            >
                              Open / download file
                            </a>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                {editing !== item.id && (
                  <div className="ml-auto flex flex-wrap gap-2 max-sm:ml-0 max-sm:w-full">
                    {tab === 'documents' && (
                      <button
                        aria-label={`Get file ${item.name}`}
                        className="grid h-10 w-10 place-items-center rounded-lg border border-line text-ink hover:bg-slate-50 disabled:opacity-60"
                        disabled={busy}
                        onClick={() => handleDownload(item)}
                        title="Get file"
                        type="button"
                      >
                        <Icon className="h-4 w-4" name="download" />
                      </button>
                    )}
                    <button
                      aria-label={`Rename ${tab === 'folders' ? 'folder' : 'document'} ${item.name}`}
                      className="grid h-10 w-10 place-items-center rounded-lg border border-line text-ink hover:bg-slate-50 disabled:opacity-60"
                      disabled={busy || Boolean(editing)}
                      onClick={() => startEdit(item)}
                      title="Rename"
                      type="button"
                    >
                      <Icon className="h-4 w-4" name="edit" />
                    </button>
                    <button
                      aria-label={`Delete ${tab === 'folders' ? 'folder' : 'document'} ${item.name}`}
                      className="grid h-10 w-10 place-items-center rounded-lg border border-[#f0d9d9] text-[#a23e3e] hover:bg-[#fff7f7] disabled:opacity-60"
                      disabled={busy || Boolean(editing)}
                      onClick={() => handleDelete(item)}
                      title="Delete"
                      type="button"
                    >
                      <Icon className="h-4 w-4" name="trash" />
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
