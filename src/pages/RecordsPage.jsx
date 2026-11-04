import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, m } from 'motion/react'
import { useAuth } from '../auth/useAuth'
import EmptyState from '../components/EmptyState'
import Icon from '../components/Icon'
import PageHeading from '../components/PageHeading'
import SharedDocumentRow, { SharedDocumentRowsSkeleton } from '../components/SharedDocumentRow'
import SharedFolderCard, { SharedFolderGridSkeleton } from '../components/SharedFolderCard'
import SharedRecordsToolbar from '../components/SharedRecordsToolbar'
import FadeIn from '../components/motion/FadeIn'
import ModalShell from '../components/motion/ModalShell'
import { Stagger, StaggerItem } from '../components/motion/Stagger'
import { getCachedData, hasCachedData } from '../lib/dataCache'
import { scaleIn, spring, tabFadeUp } from '../lib/motion'
import {
  createDocumentDownloadUrl,
  deleteDocument,
  documentCategories,
  documentsCacheKey,
  listMyDocuments,
  updateDocument,
} from '../services/documents'
import {
  createFolder,
  deleteFolder,
  listMyFolders,
  myFoldersCacheKey,
  renameFolder,
  updateFolderSharing,
} from '../services/folders'

function normalizeDocuments(documents = []) {
  return documents.map((document) => ({
    ...document,
    updatedAt: document.updatedAt || document.updated_at || document.created_at,
  }))
}

function latestDate(values) {
  return values
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => right.getTime() - left.getTime())[0]?.toISOString() || null
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

function ActionButton({ children, onClick, variant = 'secondary', ...props }) {
  const styles = variant === 'primary'
    ? 'border-accent bg-accent text-white hover:bg-accent/90'
    : 'border-line bg-white text-ink hover:bg-slate-50'

  return (
    <m.button
      className={`min-h-10 rounded-lg border px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${styles}`}
      onClick={onClick}
      type="button"
      whileTap={{ scale: 0.97 }}
      {...props}
    >
      {children}
    </m.button>
  )
}

export default function RecordsPage() {
  const { session } = useAuth()
  const userId = session.user.id
  const foldersKey = myFoldersCacheKey(userId)
  const documentsKey = documentsCacheKey(userId, 'all')
  const [tab, setTab] = useState('folders')
  const [tabAnimationCycle, setTabAnimationCycle] = useState(0)
  const [query, setQuery] = useState('')
  const [sortOrder, setSortOrder] = useState('updated')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [folders, setFolders] = useState(() => getCachedData(foldersKey) ?? [])
  const [documents, setDocuments] = useState(() =>
    normalizeDocuments(getCachedData(documentsKey) ?? []),
  )
  const [loading, setLoading] = useState(
    () => !hasCachedData(foldersKey) || !hasCachedData(documentsKey),
  )
  const [error, setError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyDocumentId, setBusyDocumentId] = useState('')
  const [dialog, setDialog] = useState(null)
  const [dialogError, setDialogError] = useState('')
  const [listMutation, setListMutation] = useState(null)
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formSharing, setFormSharing] = useState('inherit')
  const [folderSharing, setFolderSharing] = useState(false)
  const [visibleDocumentCount, setVisibleDocumentCount] = useState(20)
  const [now] = useState(() => Date.now())

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [nextFolders, nextDocuments] = await Promise.all([
        listMyFolders(userId),
        listMyDocuments(userId),
      ])
      setFolders(nextFolders)
      setDocuments(normalizeDocuments(nextDocuments))
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    let active = true

    Promise.all([listMyFolders(userId), listMyDocuments(userId)])
      .then(([nextFolders, nextDocuments]) => {
        if (!active) return
        setFolders(nextFolders)
        setDocuments(normalizeDocuments(nextDocuments))
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [userId])

  useEffect(() => {
    if (!status) return undefined
    const timer = window.setTimeout(() => setStatus(''), 3500)
    return () => window.clearTimeout(timer)
  }, [status])

  useEffect(() => {
    if (!listMutation) return undefined
    const timer = window.setTimeout(() => setListMutation(null), 350)
    return () => window.clearTimeout(timer)
  }, [listMutation])

  const folderItems = useMemo(() => {
    const documentsByFolder = new Map()
    for (const document of documents) {
      const items = documentsByFolder.get(document.folder_id) || []
      items.push(document)
      documentsByFolder.set(document.folder_id, items)
    }

    const withDetails = folders.map((folder) => {
      const folderDocuments = documentsByFolder.get(folder.id) || []
      return {
        ...folder,
        fileCount: folderDocuments.length,
        categories: [...new Set(folderDocuments.map((document) => document.record_type).filter(Boolean))],
        updatedAt: latestDate([
          folder.updated_at,
          folder.created_at,
          ...folderDocuments.map((document) => document.updatedAt),
        ]) || folder.created_at,
      }
    })
    const normalizedQuery = query.trim().toLocaleLowerCase()
    const filtered = withDetails.filter((folder) =>
      folder.name.toLocaleLowerCase().includes(normalizedQuery),
    )

    return filtered.sort((left, right) => {
      if (sortOrder === 'name') {
        return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
      }
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime() ||
        left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    })
  }, [documents, folders, query, sortOrder])

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    const filtered = documents.filter((document) =>
      (categoryFilter === 'all' || document.record_type === categoryFilter) &&
      `${document.name} ${document.original_file_name} ${document.folder_name}`
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    )

    return filtered.sort((left, right) => {
      if (sortOrder === 'name') {
        return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
      }
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime() ||
        left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
    })
  }, [categoryFilter, documents, query, sortOrder])

  const visibleDocuments = filteredDocuments.slice(0, visibleDocumentCount)

  function setSearch(value) {
    setQuery(value)
    setVisibleDocumentCount(20)
    setListMutation(null)
  }

  function setSort(value) {
    setSortOrder(value)
    setVisibleDocumentCount(20)
    setListMutation(null)
  }

  function setCategory(value) {
    setCategoryFilter(value)
    setVisibleDocumentCount(20)
    setListMutation(null)
  }

  function openCreateFolder() {
    setFormName('')
    setDialogError('')
    setDialog({ type: 'create-folder' })
  }

  function openRenameFolder(folder) {
    setFormName(folder.name)
    setDialogError('')
    setDialog({ type: 'rename-folder', item: folder })
  }

  function openShareFolder(folder) {
    setDialogError('')
    setFolderSharing(!folder.is_shared)
    setDialog({ type: 'share-folder', item: folder })
  }

  function openEditDocument(document) {
    setFormName(document.name)
    setFormCategory(document.record_type)
    setFormSharing(
      document.is_shared === null
        ? 'inherit'
        : document.is_shared ? 'shared' : 'private',
    )
    setDialogError('')
    setDialog({ type: 'edit-document', item: document })
  }

  function closeDialog() {
    if (busy) return
    setDialog(null)
    setDialogError('')
  }

  async function handleSave(event) {
    event.preventDefault()
    setBusy(true)
    setDialogError('')
    setStatus('')

    try {
      if (dialog.type === 'create-folder') {
        const created = await createFolder(formName)
        setListMutation({ type: 'add', id: created.id })
        setFolders((current) => [created, ...current])
        setStatus('Folder created.')
      } else if (dialog.type === 'rename-folder') {
        const updated = await renameFolder(dialog.item.id, formName)
        setFolders((current) => current.map((folder) =>
          folder.id === updated.id ? { ...folder, ...updated } : folder,
        ))
        setDocuments((current) => current.map((document) =>
          document.folder_id === updated.id ? { ...document, folder_name: updated.name } : document,
        ))
        setStatus('Folder renamed.')
      } else if (dialog.type === 'share-folder') {
        const updated = await updateFolderSharing(dialog.item.id, folderSharing)
        setFolders((current) => current.map((folder) =>
          folder.id === updated.id ? { ...folder, ...updated } : folder,
        ))
        setDocuments((current) => current.map((document) => (
          document.folder_id === updated.id
            ? { ...document, shared: document.is_shared ?? updated.is_shared }
            : document
        )))
        setStatus(updated.is_shared ? 'Folder shared with active staff.' : 'Folder is now private.')
      } else {
        const item = dialog.item
        const updated = await updateDocument(item.id, {
          name: formName,
          recordType: formCategory,
          innovationRecordId: formCategory === item.record_type ? item.innovation_record_id : null,
          isShared: formSharing === 'inherit' ? null : formSharing === 'shared',
        })
        setDocuments((current) => current.map((document) =>
          document.id === updated.id
            ? {
                ...document,
                ...updated,
                shared: updated.is_shared ?? folders.find((folder) => folder.id === updated.folder_id)?.is_shared,
                updatedAt: updated.updated_at || updated.created_at,
              }
            : document,
        ))
        setStatus('Document details and sharing updated.')
      }

      setDialog(null)
      setVisibleDocumentCount(20)
    } catch (requestError) {
      setDialogError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    const mutation = {
      type: 'delete',
      id: dialog.item.id,
    }
    setListMutation(mutation)
    setBusy(true)
    setDialogError('')
    setStatus('')
    try {
      if (dialog.type === 'delete-folder') {
        const folderId = dialog.item.id
        await deleteFolder(folderId)
        setFolders((current) => current.filter((folder) => folder.id !== folderId))
        setDocuments((current) => current.filter((document) => document.folder_id !== folderId))
        setStatus('Folder deleted.')
      } else {
        const documentId = dialog.item.id
        await deleteDocument(documentId)
        setDocuments((current) => current.filter((document) => document.id !== documentId))
        setStatus('Document deleted.')
      }
      setDialog(null)
      setVisibleDocumentCount(20)
    } catch (requestError) {
      setListMutation(null)
      setDialogError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  async function handleDownload(document) {
    setDownloadError('')
    const fileWindow = window.open('about:blank', '_blank')
    if (!fileWindow) {
      setDownloadError('Allow pop-ups to download this file.')
      return
    }

    fileWindow.opener = null
    setBusyDocumentId(document.id)
    try {
      fileWindow.location.href = await createDocumentDownloadUrl(document.storage_path)
    } catch (requestError) {
      fileWindow.close()
      setDownloadError(getErrorMessage(requestError))
    } finally {
      setBusyDocumentId('')
    }
  }

  function clearFilters() {
    setQuery('')
    setSortOrder('updated')
    setCategoryFilter('all')
    setVisibleDocumentCount(20)
  }

  const hasResults = tab === 'folders' ? folderItems.length > 0 : filteredDocuments.length > 0
  const errorMessage = error || downloadError

  return (
    <>
      <PageHeading
        description="Organize your folders and the files stored inside them."
        eyebrow="YOUR RECORDS"
        title="My Records"
      >
        <div className="flex flex-wrap gap-2 max-sm:grid max-sm:grid-cols-1">
          <button
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-accent bg-accent px-3.5 text-sm font-bold text-white hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            onClick={openCreateFolder}
            type="button"
          >
            <Icon className="h-4 w-4" name="folderAdd" />
            New folder
          </button>
          <Link
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3.5 text-sm font-bold text-ink no-underline hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            to="/uploads"
          >
            <Icon className="h-4 w-4" name="upload" />
            Upload
          </Link>
        </div>
      </PageHeading>

      <section
        aria-busy={loading}
        className="min-w-0 rounded-3.5 border border-line bg-white p-5.5 shadow-[0_1px_2px_rgb(15_23_42/4%)] max-sm:p-4"
      >
        <div aria-label="Browse your folders and documents" className="mb-4.5 grid grid-cols-2 border-b border-line">
          {[
            { id: 'folders', label: 'All folders', icon: 'folder', count: folders.length },
            { id: 'documents', label: 'All documents', icon: 'file', count: documents.length },
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
                  layoutId="my-records-tabs-indicator"
                  transition={spring}
                />
              )}
              <Icon className="h-4 w-4 shrink-0" name={item.icon} />
              <span className="min-w-0 truncate">{item.label}</span>
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold sm:px-2 sm:text-xs ${tab === item.id ? 'bg-[#eaf0f7] text-accent' : 'bg-slate-100 text-muted'}`}>
                {loading && !hasCachedData(tab === 'folders' ? foldersKey : documentsKey) ? '…' : item.count}
              </span>
            </m.button>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <FadeIn key={tab} variants={tabFadeUp}>
        <SharedRecordsToolbar
          categories={tab === 'documents' ? documentCategories : undefined}
          categoryBeforeSort={false}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategory}
          onSearchChange={setSearch}
          onSortChange={setSort}
          search={query}
          searchLabel={tab === 'folders' ? 'Search your folders' : 'Search your documents'}
          searchPlaceholder={tab === 'folders' ? 'Search your folders...' : 'Search your documents...'}
          sortOptions={[
            { value: 'updated', label: 'Recently updated' },
            { value: 'name', label: 'A to Z' },
          ]}
          sortValue={sortOrder}
        />

        {(errorMessage || status) && (
          <FadeIn className="mb-4" variants={tabFadeUp}>
            <div
              aria-live="polite"
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 text-sm ${errorMessage ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800'}`}
              role={errorMessage ? 'alert' : 'status'}
            >
              <p>{errorMessage || status}</p>
              {error && (
                <button
                  className="min-h-9 rounded-lg border border-red-300 px-3 text-xs font-bold text-red-800 hover:bg-white focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  onClick={refresh}
                  type="button"
                >
                  Try again
                </button>
              )}
            </div>
          </FadeIn>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <FadeIn key={`${tab}-${loading ? 'loading' : 'loaded'}`} variants={tabFadeUp}>
        {tab === 'folders' ? (
          loading ? (
            <SharedFolderGridSkeleton />
          ) : error && folders.length === 0 ? null : folders.length === 0 ? (
            <EmptyState
              icon="folder"
              text="Create a folder to organize the files stored inside it."
              title="No folders yet"
            >
              <ActionButton onClick={openCreateFolder} variant="primary">Create your first folder</ActionButton>
            </EmptyState>
          ) : !hasResults ? (
            <EmptyState icon="search" text="Try a different search or sort option." title="No matches found">
              <ActionButton onClick={clearFilters}>Clear filters</ActionButton>
            </EmptyState>
          ) : (
            <div className="grid gap-4">
              <p aria-live="polite" className="px-1 text-xs text-muted">
                Showing {folderItems.length} of {folders.length} {folders.length === 1 ? 'folder' : 'folders'}
              </p>
              <Stagger
                className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3"
                itemKeys={folderItems.slice(0, 8).map((folder) => folder.id)}
                key={`my-record-folders-${tabAnimationCycle}`}
              >
                <AnimatePresence initial={false}>
                {folderItems.map((folder, index) => (
                  <StaggerItem
                    exit={listMutation?.type === 'delete' && listMutation.id === folder.id ? scaleIn.exit : undefined}
                    index={index}
                    initial={listMutation?.type === 'add' && listMutation.id === folder.id ? 'hidden' : undefined}
                    itemKey={folder.id}
                    key={folder.id}
                    layout={listMutation?.type === 'delete' ? 'position' : false}
                    variants={listMutation?.type === 'add' && listMutation.id === folder.id ? scaleIn : undefined}
                  >
                    <SharedFolderCard
                      actions={[
                        { label: 'Rename', icon: 'edit', onSelect: () => openRenameFolder(folder) },
                        {
                          label: folder.is_shared ? 'Stop sharing' : 'Share with active staff',
                          icon: folder.is_shared ? 'lock' : 'users',
                          onSelect: () => openShareFolder(folder),
                        },
                        {
                          label: 'Delete',
                          icon: 'trash',
                          danger: true,
                          onSelect: () => {
                            setDialogError('')
                            setDialog({ type: 'delete-folder', item: folder })
                          },
                        },
                      ]}
                      folder={folder}
                      folderPath={`/records/${folder.id}`}
                      now={now}
                      showOwner={false}
                      showSharing
                      showViewOnly={false}
                    />
                  </StaggerItem>
                ))}
                </AnimatePresence>
              </Stagger>
            </div>
          )
        ) : loading ? (
          <SharedDocumentRowsSkeleton />
        ) : error && documents.length === 0 ? null : documents.length === 0 ? (
          <EmptyState icon="file" text="Upload a document to see it here." title="No documents yet">
            <Link
              className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-accent bg-accent px-4 text-sm font-bold text-white no-underline hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              to="/uploads"
            >
              <Icon className="h-4 w-4" name="upload" />
              Upload
            </Link>
          </EmptyState>
        ) : !hasResults ? (
          <EmptyState icon="search" text="Try changing your search or category." title="No matches found">
            <ActionButton onClick={clearFilters}>Clear filters</ActionButton>
          </EmptyState>
        ) : (
          <div className="grid min-w-0 gap-3">
            <p aria-live="polite" className="px-1 text-xs text-muted">
              Showing {filteredDocuments.length} of {documents.length} {documents.length === 1 ? 'document' : 'documents'}
            </p>
            <Stagger
              className="grid min-w-0 gap-3"
              itemKeys={visibleDocuments.slice(0, 8).map((document) => document.id)}
              key={`my-record-documents-${tabAnimationCycle}`}
            >
            <AnimatePresence initial={false}>
              {visibleDocuments.map((document, index) => (
                <StaggerItem
                  exit={listMutation?.type === 'delete' && listMutation.id === document.id ? scaleIn.exit : undefined}
                  index={index}
                  itemKey={document.id}
                  key={document.id}
                  layout={listMutation?.type === 'delete' ? 'position' : false}
                >
                  <SharedDocumentRow
                    actions={[
                      { label: 'Edit details', icon: 'edit', onSelect: () => openEditDocument(document) },
                      {
                        label: 'Delete',
                        icon: 'trash',
                        danger: true,
                        onSelect: () => {
                          setDialogError('')
                          setDialog({ type: 'delete-document', item: document })
                        },
                      },
                    ]}
                    busy={busyDocumentId === document.id}
                    document={document}
                    downloadIcon="print"
                    folderPathPrefix="/records/"
                    hideMatchingFileName
                    now={now}
                    onDownload={handleDownload}
                    showSharing
                    showOwner={false}
                  />
                </StaggerItem>
              ))}
            </AnimatePresence>
            </Stagger>
            {visibleDocuments.length < filteredDocuments.length && (
              <button
                className="mx-auto min-h-10 rounded-lg border border-line px-4 text-sm font-bold text-accent hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                onClick={() => setVisibleDocumentCount((count) => count + 20)}
                type="button"
              >
                Load more
              </button>
            )}
          </div>
        )}
          </FadeIn>
        </AnimatePresence>
          </FadeIn>
        </AnimatePresence>
      </section>

      <ModalShell onClose={closeDialog} open={Boolean(dialog)}>
        {dialog && (
          <section
            aria-describedby="record-dialog-description"
            aria-labelledby="record-dialog-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-line bg-white p-5 shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <h2 className="text-lg font-bold text-ink" id="record-dialog-title">
              {dialog.type === 'create-folder' && 'Create folder'}
              {dialog.type === 'rename-folder' && 'Rename folder'}
              {dialog.type === 'share-folder' && (folderSharing ? 'Share folder?' : 'Stop sharing folder?')}
              {dialog.type === 'edit-document' && 'Edit document details'}
              {dialog.type === 'delete-folder' && 'Delete folder?'}
              {dialog.type === 'delete-document' && 'Delete document?'}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted" id="record-dialog-description">
              {dialog.type === 'create-folder' && 'Choose a name for your new folder.'}
              {dialog.type === 'rename-folder' && 'Enter a new name for this folder.'}
              {dialog.type === 'share-folder' && (
                folderSharing
                  ? `Active staff will be able to open “${dialog.item.name}” and files set to use the folder setting.`
                  : `Active staff will no longer be able to open “${dialog.item.name}” or files set to use the folder setting.`
              )}
              {dialog.type === 'edit-document' && 'Update this document’s title and category.'}
              {dialog.type === 'delete-folder' && (
                <>Delete “{dialog.item.name}”? It contains {dialog.item.fileCount} {dialog.item.fileCount === 1 ? 'file' : 'files'}. The folder and its files will be hidden from My Records.</>
              )}
              {dialog.type === 'delete-document' && (
                <>Delete “{dialog.item.name}”? This document will be hidden from My Records and retained in storage.</>
              )}
            </p>

            {dialog.type === 'share-folder' ? (
              <form className="mt-5 grid gap-4" onSubmit={handleSave}>
                <p className="text-sm leading-relaxed text-muted">
                  Files with their own sharing choice will keep that setting.
                </p>
                {dialogError && <p className="text-sm text-red-700" role="alert">{dialogError}</p>}
                <div className="flex flex-wrap justify-end gap-2">
                  <ActionButton disabled={busy} onClick={closeDialog}>Cancel</ActionButton>
                  <button
                    className="min-h-10 rounded-lg border border-accent bg-accent px-4 text-sm font-bold text-white hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-60"
                    disabled={busy}
                    type="submit"
                  >
                    {busy ? 'Saving...' : folderSharing ? 'Share folder' : 'Stop sharing'}
                  </button>
                </div>
              </form>
            ) : dialog.type === 'create-folder' || dialog.type === 'rename-folder' || dialog.type === 'edit-document' ? (
              <form className="mt-5 grid gap-4" onSubmit={handleSave}>
                {(dialog.type === 'create-folder' || dialog.type === 'rename-folder' || dialog.type === 'edit-document') && (
                  <label className="grid gap-1.5 text-sm font-semibold text-ink">
                    {dialog.type === 'edit-document' ? 'Title' : 'Folder name'}
                    <input
                      autoFocus
                      className="form-input"
                      maxLength={dialog.type === 'edit-document' ? 200 : 100}
                      onChange={(event) => setFormName(event.target.value)}
                      required
                      value={formName}
                    />
                  </label>
                )}
                {dialog.type === 'edit-document' && (
                  <>
                    <label className="grid gap-1.5 text-sm font-semibold text-ink">
                      Category
                      <select
                        className="form-input"
                        onChange={(event) => setFormCategory(event.target.value)}
                        required
                        value={formCategory}
                      >
                        {documentCategories.map((category) => (
                          <option key={category.value} value={category.value}>{category.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold text-ink">
                      Sharing
                      <select
                        className="form-input"
                        onChange={(event) => setFormSharing(event.target.value)}
                        value={formSharing}
                      >
                        <option value="inherit">Use folder setting</option>
                        <option value="shared">Shared with staff</option>
                        <option value="private">Private</option>
                      </select>
                      <span className="text-xs font-normal text-muted">
                        “Use folder setting” means this file matches the folder’s sharing choice.
                      </span>
                    </label>
                  </>
                )}
                {dialogError && <p className="text-sm text-red-700" role="alert">{dialogError}</p>}
                <div className="flex flex-wrap justify-end gap-2">
                  <ActionButton disabled={busy} onClick={closeDialog}>Cancel</ActionButton>
                  <button
                    className="min-h-10 rounded-lg border border-accent bg-accent px-4 text-sm font-bold text-white hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-60"
                    disabled={busy}
                    type="submit"
                  >
                    {busy ? 'Saving...' : dialog.type === 'create-folder' ? 'Create folder' : 'Save changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-5 grid gap-4">
                {dialogError && <p className="text-sm text-red-700" role="alert">{dialogError}</p>}
                <div className="flex flex-wrap justify-end gap-2">
                  <ActionButton disabled={busy} onClick={closeDialog}>Cancel</ActionButton>
                  <button
                    autoFocus
                    className="min-h-10 rounded-lg border border-red-700 bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-red-700 focus-visible:outline-offset-2 disabled:opacity-60"
                    disabled={busy}
                    onClick={handleDelete}
                    type="button"
                  >
                    {busy ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </ModalShell>
    </>
  )
}
