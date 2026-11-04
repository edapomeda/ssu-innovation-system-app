import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { AnimatePresence, m } from 'motion/react'
import EmptyState from '../components/EmptyState'
import Icon from '../components/Icon'
import OwnerAvatar from '../components/OwnerAvatar'
import PageHeading from '../components/PageHeading'
import SharedFolderCard, { SharedFolderGridSkeleton } from '../components/SharedFolderCard'
import SharedDocumentRow, { SharedDocumentRowsSkeleton } from '../components/SharedDocumentRow'
import SharedRecordsToolbar from '../components/SharedRecordsToolbar'
import Collapse from '../components/motion/Collapse'
import FadeIn from '../components/motion/FadeIn'
import { Stagger, StaggerItem } from '../components/motion/Stagger'
import { getCachedData, hasCachedData } from '../lib/dataCache'
import { fade, spring, tabFadeUp } from '../lib/motion'
import { createDocumentDownloadUrl, documentCategories } from '../services/documents'
import { listStaffRecords, staffRecordsCacheKey } from '../services/staffRecords'

const viewStorageKey = 'sharedRecords.view'

function readSavedView() {
  try {
    return window.localStorage.getItem(viewStorageKey) === 'all' ? 'all' : 'grouped'
  } catch {
    return 'grouped'
  }
}

function sortFolders(folders, sortOrder) {
  return [...folders].sort((left, right) => {
    if (sortOrder === 'name') {
      return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime() ||
      left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
  })
}

export default function AllRecordsPage() {
  const { session } = useAuth()
  const userId = session.user.id
  const cacheKey = staffRecordsCacheKey(userId)
  const [records, setRecords] = useState(() => getCachedData(cacheKey) ?? { folders: [], documents: [] })
  const [tab, setTab] = useState('folders')
  const [tabAnimationCycle, setTabAnimationCycle] = useState(0)
  const [viewAnimationCycle, setViewAnimationCycle] = useState(0)
  const [now] = useState(() => Date.now())
  const [query, setQuery] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('updated')
  const [documentQuery, setDocumentQuery] = useState('')
  const [documentOwnerFilter, setDocumentOwnerFilter] = useState('all')
  const [documentCategoryFilter, setDocumentCategoryFilter] = useState('all')
  const [documentSortOrder, setDocumentSortOrder] = useState('updated')
  const [loadMore, setLoadMore] = useState({ filterKey: '', count: 20 })
  const [view, setView] = useState(readSavedView)
  const [collapsedOwners, setCollapsedOwners] = useState({})
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

  useEffect(() => {
    try {
      window.localStorage.setItem(viewStorageKey, view)
    } catch {
      // Storage can be unavailable in private browsing; the in-page toggle still works.
    }
  }, [view])

  const sharedFolders = useMemo(
    () => records.folders.filter((folder) => folder.owner_id !== userId),
    [records.folders, userId],
  )
  const owners = useMemo(() => {
    const distinctOwners = new Map()
    for (const folder of sharedFolders) distinctOwners.set(folder.owner.id, folder.owner)
    return [...distinctOwners.values()].sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
    )
  }, [sharedFolders])
  const sharedDocuments = useMemo(
    () => records.documents.filter((document) => document.owner_id !== userId),
    [records.documents, userId],
  )
  const documentOwners = useMemo(() => {
    const distinctOwners = new Map()
    for (const document of sharedDocuments) distinctOwners.set(document.owner.id, document.owner)
    return [...distinctOwners.values()].sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
    )
  }, [sharedDocuments])
  const filteredFolders = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    const filtered = sharedFolders.filter((folder) =>
      (ownerFilter === 'all' || folder.owner.id === ownerFilter) &&
      `${folder.name} ${folder.owner.name}`.toLocaleLowerCase().includes(normalizedQuery),
    )

    return sortFolders(filtered, sortOrder)
  }, [ownerFilter, query, sharedFolders, sortOrder])
  const ownerGroups = useMemo(() => {
    const groupsByOwner = new Map()

    for (const folder of filteredFolders) {
      const ownerId = folder.owner.id
      if (!groupsByOwner.has(ownerId)) {
        groupsByOwner.set(ownerId, { owner: folder.owner, folders: [] })
      }
      groupsByOwner.get(ownerId).folders.push(folder)
    }

    return [...groupsByOwner.values()].sort((left, right) =>
      left.owner.name.localeCompare(right.owner.name, undefined, { sensitivity: 'base' }),
    )
  }, [filteredFolders])
  const filteredDocuments = useMemo(() => {
    const normalizedQuery = documentQuery.trim().toLocaleLowerCase()
    const filtered = sharedDocuments.filter((document) =>
      (documentOwnerFilter === 'all' || document.owner.id === documentOwnerFilter) &&
      (documentCategoryFilter === 'all' || document.record_type === documentCategoryFilter) &&
      `${document.name} ${document.original_file_name} ${document.folder_name} ${document.owner.name}`
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    )

    return [...filtered].sort((left, right) => {
      if (documentSortOrder === 'name') {
        return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
      }
      if (documentSortOrder === 'size') return right.file_size - left.file_size

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime() ||
        left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    })
  }, [documentCategoryFilter, documentOwnerFilter, documentQuery, documentSortOrder, sharedDocuments])
  const documentFilterKey = JSON.stringify([
    documentQuery,
    documentOwnerFilter,
    documentCategoryFilter,
    documentSortOrder,
  ])
  const displayedDocumentCount = loadMore.filterKey === documentFilterKey ? loadMore.count : 20
  const visibleDocuments = filteredDocuments.slice(0, displayedDocumentCount)

  async function handleDownload(document) {
    setDownloadError('')
    const fileWindow = window.open('about:blank', '_blank')
    if (!fileWindow) {
      setDownloadError('Allow pop-ups to open this file.')
      return
    }

    fileWindow.opener = null
    setBusyDocumentId(document.id)

    try {
      const url = await createDocumentDownloadUrl(document.storage_path)
      fileWindow.location.href = url
    } catch (requestError) {
      fileWindow.close()
      setDownloadError(requestError instanceof Error ? requestError.message : String(requestError))
    } finally {
      setBusyDocumentId('')
    }
  }

  function clearFolderFilters() {
    setQuery('')
    setOwnerFilter('all')
    setSortOrder('updated')
  }

  function clearDocumentFilters() {
    setDocumentQuery('')
    setDocumentOwnerFilter('all')
    setDocumentCategoryFilter('all')
    setDocumentSortOrder('updated')
  }

  function setDocumentFilter(update) {
    update()
    setLoadMore({ filterKey: '', count: 20 })
  }

  function renderFolderCards(folders, showOwner, stagger = false) {
    const cards = folders.map((folder, index) => {
      const card = <SharedFolderCard folder={folder} key={folder.id} now={now} showOwner={showOwner} />
      return stagger
        ? <StaggerItem index={index} itemKey={folder.id} key={folder.id}>{card}</StaggerItem>
        : card
    })

    return (
      stagger
        ? (
          <Stagger
            className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3"
            itemKeys={folders.slice(0, 8).map((folder) => folder.id)}
            key={`shared-folders-${viewAnimationCycle}-${tabAnimationCycle}`}
          >
            {cards}
          </Stagger>
        )
        : <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">{cards}</div>
    )
  }

  const isEmptyLibrary = !loading && !error && sharedFolders.length === 0
  const hasNoFolderResults = !loading && sharedFolders.length > 0 && filteredFolders.length === 0
  const isEmptyDocumentLibrary = !loading && !error && sharedDocuments.length === 0
  const hasNoDocumentResults = !loading && sharedDocuments.length > 0 && filteredDocuments.length === 0

  return (
    <>
      <PageHeading
        description="Read-only records shared by staff."
        eyebrow="STAFF LIBRARY"
        title="Shared Records"
      />

      {(error || downloadError) && (
        <div
          aria-live="polite"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f1caca] bg-[#fff4f4] p-3.5 text-sm text-[#9b3434]"
          role="alert"
        >
          <p>{error || downloadError}</p>
          {error && (
            <button
              className="min-h-9 rounded-lg border border-[#dbaaaa] px-3 text-xs font-bold text-[#762828] hover:bg-white focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              onClick={refresh}
              type="button"
            >
              Try again
            </button>
          )}
        </div>
      )}

      <section aria-busy={loading} className="rounded-3.5 border border-line bg-white p-5.5 shadow-[0_1px_2px_rgb(15_23_42/4%)] max-sm:p-4">
        <div aria-label="Browse folders and documents" className="mb-4.5 grid grid-cols-2 border-b border-line">
          {[
            { id: 'folders', label: 'All folders', icon: 'folder', count: sharedFolders.length },
            { id: 'documents', label: 'All documents', icon: 'file', count: sharedDocuments.length },
          ].map((item) => (
            <m.button
              aria-pressed={tab === item.id}
              className={`relative flex min-h-12 min-w-0 items-center justify-center gap-1.5 border-b-2 border-transparent px-1.5 py-2 text-sm transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 sm:gap-2 sm:px-3 ${tab === item.id ? 'font-bold text-accent' : 'text-muted hover:text-ink'}`}
              key={item.id}
              onClick={() => {
                setTab(item.id)
                setTabAnimationCycle((cycle) => cycle + 1)
              }}
              type="button"
              whileTap={{ scale: 0.97 }}
            >
              {tab === item.id && (
                <m.span
                  className="absolute inset-x-0 bottom-[-1px] h-0.5 bg-accent"
                  layoutId="shared-records-tabs-indicator"
                  transition={spring}
                />
              )}
              <Icon className="h-4 w-4 shrink-0" name={item.icon} />
              <span className="min-w-0 truncate">{item.label}</span>
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold sm:px-2 sm:text-xs ${tab === item.id ? 'bg-[#eaf0f7] text-accent' : 'bg-slate-100 text-muted'}`}>
                {item.count}
              </span>
            </m.button>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <FadeIn className="min-w-0" key={tab} variants={tabFadeUp}>
        {tab === 'folders' ? (
          <SharedRecordsToolbar
            onOwnerChange={setOwnerFilter}
            onSearchChange={setQuery}
            onSortChange={setSortOrder}
            onViewChange={(value) => {
              setView(value)
              setViewAnimationCycle((cycle) => cycle + 1)
            }}
            ownerFilter={ownerFilter}
            owners={owners}
            search={query}
            searchLabel="Search shared folders"
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
            categoryFilter={documentCategoryFilter}
            onCategoryChange={(value) => setDocumentFilter(() => setDocumentCategoryFilter(value))}
            onOwnerChange={(value) => setDocumentFilter(() => setDocumentOwnerFilter(value))}
            onSearchChange={(value) => setDocumentFilter(() => setDocumentQuery(value))}
            onSortChange={(value) => setDocumentFilter(() => setDocumentSortOrder(value))}
            ownerFilter={documentOwnerFilter}
            owners={documentOwners}
            search={documentQuery}
            searchLabel="Search shared documents"
            searchPlaceholder="Search documents, folders, or owners..."
            sortOptions={[
              { value: 'updated', label: 'Recently updated' },
              { value: 'name', label: 'A to Z' },
              { value: 'size', label: 'Largest' },
            ]}
            sortValue={documentSortOrder}
          />
        )}

        <AnimatePresence mode="wait" initial={false}>
          <FadeIn key={`${tab}-${loading ? 'loading' : 'loaded'}`} variants={fade}>
        {tab === 'folders' ? (
          loading ? (
            <SharedFolderGridSkeleton />
          ) : error && sharedFolders.length === 0 ? (
            null
          ) : isEmptyLibrary ? (
            <EmptyState
              icon="folder"
              text="Folders shared by other staff members will appear here."
              title="No shared folders yet"
            />
          ) : hasNoFolderResults ? (
            <div className="grid gap-4">
              <EmptyState
                icon="search"
                text="Try changing your search or owner filter."
                title="No folders match your search"
              />
              <button
                className="mx-auto min-h-10 rounded-lg border border-line px-4 text-sm font-bold text-accent hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                onClick={clearFolderFilters}
                type="button"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid gap-5">
              <p aria-live="polite" className="px-1 text-xs text-muted">
                Showing {filteredFolders.length} of {sharedFolders.length} folders
              </p>
              <AnimatePresence mode="wait" initial={false}>
                <FadeIn key={view} variants={fade}>
                  {view === 'all' ? (
                    renderFolderCards(filteredFolders, true, viewAnimationCycle === 0)
                  ) : (
                    <div className="grid gap-6">
                      {ownerGroups.map(({ owner, folders }) => {
                        const sectionId = `shared-folder-group-${owner.id}`
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
                              <m.button
                                aria-controls={sectionId}
                                aria-expanded={isExpanded}
                                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${owner.name} folders`}
                                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line text-accent hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                                onClick={() => setCollapsedOwners((current) => ({
                                  ...current,
                                  [owner.id]: !current[owner.id],
                                }))}
                                type="button"
                                whileTap={{ scale: 0.97 }}
                              >
                                <m.span animate={{ rotate: isExpanded ? 90 : 0 }} transition={spring}>
                                  <Icon className="h-4 w-4" name="chevron" />
                                </m.span>
                              </m.button>
                            </header>
                            <Collapse className="grid gap-3" id={sectionId} open={isExpanded}>
                              {renderFolderCards(folders, false)}
                            </Collapse>
                          </section>
                        )
                      })}
                    </div>
                  )}
                </FadeIn>
                  </AnimatePresence>
            </div>
          )
        ) : (
          loading ? (
            <SharedDocumentRowsSkeleton />
          ) : error && sharedDocuments.length === 0 ? null : isEmptyDocumentLibrary ? (
            <EmptyState
              icon="folder"
              text="Documents shared by other staff members will appear here."
              title="No shared documents yet"
            />
          ) : hasNoDocumentResults ? (
            <div className="grid gap-4">
              <EmptyState
                icon="search"
                text="Try changing your search, owner, or category filter."
                title="No documents match your search"
              />
              <button
                className="mx-auto min-h-10 rounded-lg border border-line px-4 text-sm font-bold text-accent hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                onClick={clearDocumentFilters}
                type="button"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              <p className="px-1 text-xs text-muted">
                Showing {filteredDocuments.length} of {sharedDocuments.length} {sharedDocuments.length === 1 ? 'document' : 'documents'}
              </p>
              <Stagger
                className="grid gap-3"
                itemKeys={visibleDocuments.slice(0, 8).map((item) => item.id)}
                key={`shared-documents-${tabAnimationCycle}`}
              >
                {visibleDocuments.map((item, index) => (
                  <StaggerItem index={index} itemKey={item.id} key={item.id}>
                    <SharedDocumentRow
                      busy={busyDocumentId === item.id}
                      document={item}
                      now={now}
                      onDownload={handleDownload}
                    />
                  </StaggerItem>
                ))}
              </Stagger>
              {visibleDocuments.length < filteredDocuments.length && (
                <button
                  className="mx-auto min-h-10 rounded-lg border border-line px-4 text-sm font-bold text-accent hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  onClick={() => setLoadMore({ filterKey: documentFilterKey, count: displayedDocumentCount + 20 })}
                  type="button"
                >
                  Load more
                </button>
              )}
            </div>
          )
        )}
          </FadeIn>
        </AnimatePresence>
          </FadeIn>
        </AnimatePresence>
      </section>
    </>
  )
}
