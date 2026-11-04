import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import EmptyState from '../components/EmptyState'
import Icon from '../components/Icon'
import OwnerAvatar from '../components/OwnerAvatar'
import PageHeading from '../components/PageHeading'
import SharedDocumentRow, { SharedDocumentRowsSkeleton } from '../components/SharedDocumentRow'
import SharedFolderCard, { SharedFolderGridSkeleton } from '../components/SharedFolderCard'
import SharedRecordsToolbar from '../components/SharedRecordsToolbar'
import { getCachedData, hasCachedData } from '../lib/dataCache'
import { adminFilesCacheKey, listAdminFiles } from '../services/adminFiles'
import {
  createDocumentDownloadUrl,
  documentCategories,
  permanentlyDeleteDocument,
  updateDocument,
} from '../services/documents'
import { deleteFolder, renameFolder } from '../services/folders'

function makeOwner(item) {
  const name = item.owner_name || 'Unknown owner'
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return { id: item.owner_id || 'unknown', name, initials: initials || '?' }
}

function latestDate(values) {
  return values
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => right.getTime() - left.getTime())[0]?.toISOString() || null
}

export default function AdminFilesPage() {
  const { session } = useAuth()
  const userId = session.user.id
  const cacheKey = adminFilesCacheKey(userId)
  const [library, setLibrary] = useState(() => getCachedData(cacheKey) ?? { folders: [], documents: [] })
  const [tab, setTab] = useState('folders')
  const [query, setQuery] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('updated')
  const [view, setView] = useState('grouped')
  const [collapsedOwners, setCollapsedOwners] = useState({})
  const [loading, setLoading] = useState(() => !hasCachedData(cacheKey))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState('')
  const [name, setName] = useState('')
  const [now] = useState(() => Date.now())

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

  const folders = useMemo(() => {
    const documentsByFolder = new Map()
    for (const document of library.documents) {
      const documents = documentsByFolder.get(document.folder_id) || []
      documents.push(document)
      documentsByFolder.set(document.folder_id, documents)
    }

    return library.folders.map((folder) => {
      const documents = documentsByFolder.get(folder.id) || []
      return {
        ...folder,
        owner: makeOwner(folder),
        fileCount: documents.length,
        categories: [...new Set(documents.map((document) => document.record_type).filter(Boolean))],
        updatedAt: latestDate([
          folder.updated_at,
          folder.created_at,
          ...documents.map((document) => document.updated_at || document.created_at),
        ]) || folder.created_at,
      }
    })
  }, [library])

  const documents = useMemo(() => library.documents.map((document) => ({
    ...document,
    owner: makeOwner(document),
    updatedAt: document.updated_at || document.created_at,
  })), [library.documents])

  const owners = useMemo(() => {
    const distinctOwners = new Map()
    const items = tab === 'folders' ? folders : documents

    for (const item of items) {
      if (!item.owner_id || distinctOwners.has(item.owner_id)) continue
      distinctOwners.set(item.owner_id, {
        id: item.owner_id,
        name: item.owner_name,
      })
    }

    return [...distinctOwners.values()].sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
    )
  }, [documents, folders, tab])

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    const items = tab === 'folders' ? folders : documents

    const filtered = items.filter((item) => {
      const searchableText =
        tab === 'folders'
          ? `${item.name} ${item.owner_name} ${item.owner_email}`
          : `${item.name} ${item.original_file_name} ${item.folder_name} ${item.owner_name} ${item.owner_email}`
      return (
        (ownerFilter === 'all' || item.owner_id === ownerFilter) &&
        (tab === 'folders' || categoryFilter === 'all' || item.record_type === categoryFilter) &&
        searchableText.toLocaleLowerCase().includes(normalizedQuery)
      )
    })

    return filtered.sort((left, right) => {
      if (sortOrder === 'name') {
        return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
      }
      if (tab === 'documents' && sortOrder === 'size') return right.file_size - left.file_size

      const leftUpdated = new Date(left.updatedAt || left.updated_at || left.created_at).getTime() || 0
      const rightUpdated = new Date(right.updatedAt || right.updated_at || right.created_at).getTime() || 0
      return rightUpdated - leftUpdated ||
        left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    })
  }, [categoryFilter, documents, folders, ownerFilter, query, sortOrder, tab])

  const ownerGroups = useMemo(() => {
    const groups = new Map()
    for (const folder of visibleItems) {
      const ownerId = folder.owner.id
      if (!groups.has(ownerId)) groups.set(ownerId, { owner: folder.owner, folders: [] })
      groups.get(ownerId).folders.push(folder)
    }

    return [...groups.values()].sort((left, right) =>
      left.owner.name.localeCompare(right.owner.name, undefined, { sensitivity: 'base' }),
    )
  }, [visibleItems])

  function clearFilters() {
    setQuery('')
    setOwnerFilter('all')
    setCategoryFilter('all')
    setSortOrder('updated')
  }

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
        : ' This permanently removes the file from storage and its record from the database.'
    if (!window.confirm(`Delete ${itemType} "${item.name}"?${extraMessage}`)) return

    setBusy(true)
    setError('')
    setStatus('')
    try {
      if (tab === 'folders') {
        await deleteFolder(item.id)
      } else {
        await permanentlyDeleteDocument(item.id, item.storage_path)
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
    const fileWindow = window.open('about:blank', '_blank')
    if (!fileWindow) {
      setError('Allow pop-ups to download this file.')
      return
    }

    fileWindow.opener = null
    try {
      fileWindow.location.href = await createDocumentDownloadUrl(document.storage_path)
    } catch (requestError) {
      fileWindow.close()
      setError(requestError instanceof Error ? requestError.message : String(requestError))
    }
  }

  function renderNameEditor(item, maxLength, label) {
    return (
      <form className="flex min-w-0 items-center gap-2" onSubmit={(event) => saveEdit(event, item)}>
        <input
          aria-label={label}
          autoFocus
          className="form-input min-w-0 flex-1"
          maxLength={maxLength}
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
        <button
          className="min-h-10 rounded-lg bg-accent px-3 text-xs font-bold text-white hover:bg-[#102d4f] disabled:opacity-60"
          disabled={busy}
          type="submit"
        >
          {busy ? 'Saving...' : 'Save'}
        </button>
        <button
          className="min-h-10 rounded-lg border border-line px-3 text-xs font-bold text-ink hover:bg-slate-50"
          disabled={busy}
          onClick={cancelEdit}
          type="button"
        >
          Cancel
        </button>
      </form>
    )
  }

  function renderFolderCards(items, showOwner) {
    return (
      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((folder) => (
          <SharedFolderCard
            actions={editing === folder.id ? undefined : [
              { label: 'Rename', icon: 'edit', onSelect: () => startEdit(folder) },
              { label: 'Delete', icon: 'trash', danger: true, onSelect: () => handleDelete(folder) },
            ]}
            folder={folder}
            folderPath={null}
            key={folder.id}
            now={now}
            showOwner={showOwner}
            showViewOnly={false}
            titleContent={editing === folder.id
              ? renderNameEditor(folder, 100, 'Folder name')
              : undefined}
          />
        ))}
      </div>
    )
  }

  function renderDocumentRows(items) {
    return (
      <div className="grid gap-3">
        {items.map((document) => (
          <SharedDocumentRow
            actions={editing === document.id ? undefined : [
              { label: 'Rename', icon: 'edit', onSelect: () => startEdit(document) },
              { label: 'Delete', icon: 'trash', danger: true, onSelect: () => handleDelete(document) },
            ]}
            busy={busy}
            document={document}
            key={document.id}
            now={now}
            onDownload={handleDownload}
            showFolderLink={false}
            titleContent={editing === document.id
              ? renderNameEditor(document, 200, 'Document name')
              : undefined}
          />
        ))}
      </div>
    )
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
        <div aria-label="Manage folders and documents" className="mb-4.5 grid grid-cols-2 border-b border-line">
          {[
            { id: 'folders', label: 'All folders', icon: 'folder', count: library.folders.length },
            { id: 'documents', label: 'All documents', icon: 'file', count: library.documents.length },
          ].map((item) => (
            <button
              aria-pressed={tab === item.id}
              className={`flex min-h-12 min-w-0 items-center justify-center gap-1.5 px-1.5 py-2 text-sm transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 sm:gap-2 sm:px-3 ${tab === item.id ? 'border-b-2 border-b-accent font-bold text-accent' : 'border-b-2 border-transparent text-muted hover:text-ink'}`}
              key={item.id}
              onClick={() => {
                setTab(item.id)
                clearFilters()
                setView('grouped')
                cancelEdit()
                setStatus('')
              }}
              type="button"
            >
              <Icon className="h-4 w-4 shrink-0" name={item.icon} />
              <span className="min-w-0 truncate">{item.label}</span>
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold sm:px-2 sm:text-xs ${tab === item.id ? 'bg-[#eaf0f7] text-accent' : 'bg-slate-100 text-muted'}`}>
                {item.count}
              </span>
            </button>
          ))}
        </div>

        {tab === 'folders' ? (
          <SharedRecordsToolbar
            onOwnerChange={setOwnerFilter}
            onSearchChange={setQuery}
            onSortChange={setSortOrder}
            onViewChange={setView}
            ownerFilter={ownerFilter}
            owners={owners}
            search={query}
            searchLabel="Search folders"
            searchPlaceholder="Search folders by name or owner..."
            sortOptions={[
              { value: 'updated', label: 'Recently updated' },
              { value: 'name', label: 'A to Z' },
            ]}
            sortValue={sortOrder}
            view={view}
          />
        ) : (
          <SharedRecordsToolbar
            categories={documentCategories}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            onOwnerChange={setOwnerFilter}
            onSearchChange={setQuery}
            onSortChange={setSortOrder}
            ownerFilter={ownerFilter}
            owners={owners}
            search={query}
            searchLabel="Search documents"
            searchPlaceholder="Search documents, folders, or owners..."
            sortOptions={[
              { value: 'updated', label: 'Recently updated' },
              { value: 'name', label: 'A to Z' },
              { value: 'size', label: 'Largest' },
            ]}
            sortValue={sortOrder}
          />
        )}

        {loading ? (
          tab === 'folders' ? <SharedFolderGridSkeleton /> : <SharedDocumentRowsSkeleton />
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
          <div className="grid gap-4">
            <EmptyState
              icon={query || ownerFilter !== 'all' || categoryFilter !== 'all' ? 'search' : tab === 'folders' ? 'folder' : 'file'}
              text={query || ownerFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try changing your search or filters.'
                : `Active ${tab} will appear here.`}
              title={query || ownerFilter !== 'all' || categoryFilter !== 'all'
                ? `No ${tab} match your filters`
                : `No active ${tab}`}
            />
            {(query || ownerFilter !== 'all' || categoryFilter !== 'all' || sortOrder !== 'updated') && (
              <button
                className="mx-auto min-h-10 rounded-lg border border-line px-4 text-sm font-bold text-accent hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                onClick={clearFilters}
                type="button"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5">
            <p className="px-1 text-xs text-muted">
              Showing {visibleItems.length} of {tab === 'folders' ? library.folders.length : library.documents.length}{' '}
              {tab === 'folders'
                ? library.folders.length === 1 ? 'folder' : 'folders'
                : library.documents.length === 1 ? 'document' : 'documents'}
            </p>
            {tab === 'folders' && view === 'grouped' ? (
              <div className="grid gap-6">
                {ownerGroups.map(({ owner, folders }) => {
                  const sectionId = `admin-folder-group-${owner.id}`
                  const isExpanded = !collapsedOwners[owner.id]

                  return (
                    <section aria-labelledby={`${sectionId}-heading`} className="grid gap-3" key={owner.id}>
                      <header className="flex min-w-0 items-center gap-3">
                        <OwnerAvatar owner={owner} />
                        <div className="min-w-0 flex-1">
                          <h2 className="truncate text-sm font-bold text-ink" id={`${sectionId}-heading`} title={owner.name}>
                            {owner.name}
                          </h2>
                          <p className="text-xs text-muted">
                            {folders.length} {folders.length === 1 ? 'folder' : 'folders'}
                          </p>
                        </div>
                        <button
                          aria-controls={sectionId}
                          aria-expanded={isExpanded}
                          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${owner.name} folders`}
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line text-accent hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                          onClick={() => setCollapsedOwners((current) => ({
                            ...current,
                            [owner.id]: !current[owner.id],
                          }))}
                          type="button"
                        >
                          <Icon className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} name="chevron" />
                        </button>
                      </header>
                      {isExpanded && (
                        <div className="grid gap-3" id={sectionId}>
                          {renderFolderCards(folders, false)}
                        </div>
                      )}
                    </section>
                  )
                })}
              </div>
            ) : tab === 'folders' ? (
              renderFolderCards(visibleItems, true)
            ) : (
              renderDocumentRows(visibleItems)
            )}
          </div>
        )}
      </section>
    </>
  )
}
