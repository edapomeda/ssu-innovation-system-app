import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import DocumentCategoryPill from '../components/DocumentCategoryPill'
import EmptyState from '../components/EmptyState'
import FormStep from '../components/FormStep'
import Icon from '../components/Icon'
import { PageLoadingSkeleton, RowsSkeleton } from '../components/LoadingSkeleton'
import PageHeading from '../components/PageHeading'
import { getCachedData, hasCachedData } from '../lib/dataCache'
import { listMyFolders, myFoldersCacheKey } from '../services/folders'
import {
  createDocumentDownloadUrl,
  deleteDocument,
  documentCategories,
  documentsCacheKey,
  listDocuments,
  updateDocument,
  uploadDocuments,
} from '../services/documents'

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FolderDocumentsPage() {
  const { folderId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const userId = session.user.id
  const foldersCacheKey = myFoldersCacheKey(userId)
  const currentDocumentsCacheKey = documentsCacheKey(userId, folderId)
  const cachedFolders = getCachedData(foldersCacheKey)
  const cachedDocuments = getCachedData(currentDocumentsCacheKey)
  const fileInputRef = useRef(null)
  const [folder, setFolder] = useState(() => cachedFolders?.find((item) => item.id === folderId) ?? null)
  const [documents, setDocuments] = useState(() => cachedDocuments ?? [])
  const [loading, setLoading] = useState(
    () => !hasCachedData(foldersCacheKey) || !hasCachedData(currentDocumentsCacheKey),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [formMode, setFormMode] = useState('')
  const [files, setFiles] = useState([])
  const [displayNames, setDisplayNames] = useState([])
  const [category, setCategory] = useState('')
  const [documentName, setDocumentName] = useState('')
  const [documentSharing, setDocumentSharing] = useState('inherit')

  const refreshFolder = useCallback(async () => {
    setError('')
    try {
      const [folders, rows] = await Promise.all([
        listMyFolders(userId),
        listDocuments(folderId, userId),
      ])
      const currentFolder = folders.find((item) => item.id === folderId)

      if (!currentFolder) {
        setFolder(null)
        setDocuments([])
        setError('This folder was not found or is no longer available.')
        return false
      }

      setFolder(currentFolder)
      setDocuments(rows)
      return true
    } catch (requestError) {
      setError(requestError.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [folderId, userId])

  useEffect(() => {
    let active = true

    Promise.all([listMyFolders(userId), listDocuments(folderId, userId)])
      .then(([folders, rows]) => {
        if (!active) return
        const currentFolder = folders.find((item) => item.id === folderId)

        if (!currentFolder) {
          setError('This folder was not found or is no longer available.')
          return
        }

        setFolder(currentFolder)
        setDocuments(rows)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [folderId, userId])

  function startUpload() {
    setFormMode('upload')
    setFiles([])
    setDisplayNames([])
    setCategory('')
    setError('')
    setStatus('')
  }

  function startEdit(document) {
    setFormMode(document.id)
    setDocumentName(document.name)
    setCategory(document.record_type)
    setDocumentSharing(
      document.is_shared === null
        ? 'inherit'
        : document.is_shared ? 'shared' : 'private',
    )
    setError('')
    setStatus('')
  }

  function cancelForm() {
    setFormMode('')
    setFiles([])
    setDisplayNames([])
    setDocumentName('')
    setCategory('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleUpload(event) {
    event.preventDefault()
    setError('')
    setStatus('')

    if (!files.length) {
      setError('Choose at least one file to upload.')
      return
    }

    if (!category) {
      setError('Choose a category for these files.')
      return
    }

    setBusy(true)
    try {
      const uploaded = await uploadDocuments(
        folderId,
        files,
        category,
        null,
        userId,
        displayNames,
      )
      setFiles([])
      setDisplayNames([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      setFormMode('')
      setStatus(`${uploaded.length} file${uploaded.length === 1 ? '' : 's'} uploaded.`)
      await refreshFolder()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleUpdate(event, id) {
    event.preventDefault()
    setError('')
    setStatus('')

    if (!category) {
      setError('Choose a category for this file.')
      return
    }

    setBusy(true)
    try {
      await updateDocument(id, {
        name: documentName,
        recordType: category,
        isShared: documentSharing === 'inherit' ? null : documentSharing === 'shared',
      })
      setFormMode('')
      setStatus('File details and sharing updated.')
      await refreshFolder()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(document) {
    if (!window.confirm(`Delete "${document.name}"? The file will be hidden but retained in storage.`)) {
      return
    }

    setBusy(true)
    setError('')
    setStatus('')
    try {
      await deleteDocument(document.id)
      cancelForm()
      setStatus('File deleted.')
      await refreshFolder()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleOpenDocument(document) {
    setError('')

    const fileWindow = window.open('about:blank', '_blank')
    if (!fileWindow) {
      setError('Allow pop-ups to open this file.')
      return
    }

    fileWindow.opener = null
    try {
      const url = await createDocumentDownloadUrl(document.storage_path)
      fileWindow.location.href = url
    } catch (requestError) {
      fileWindow.close()
      setError(requestError.message)
    }
  }

  if (loading) {
    return <PageLoadingSkeleton />
  }

  if (!folder) {
    return (
      <section className="grid gap-4 rounded-3.5 border border-line bg-white p-6 text-center shadow-[0_1px_2px_rgb(15_23_42/4%)]">
        <h1 className="text-balance text-xl font-bold text-ink">Folder unavailable</h1>
        <p className="text-sm text-[#a23e3e]" role="alert">{error}</p>
        <Link className="mx-auto text-xs font-bold text-purple" to="/records/my">Back to folders</Link>
      </section>
    )
  }

  return (
    <>
      <PageHeading
        description={`Manage files in this folder. ${folder.is_shared ? 'Shared with active staff.' : 'Private to you unless an individual file is shared.'}`}
        eyebrow="MY RECORDS"
        title={folder.name}
      >
        <button
          className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-3.5 text-sm font-bold text-white hover:bg-[#102d4f]"
          onClick={startUpload}
          type="button"
        >
          <Icon className="h-4 w-4" name="upload" /> Upload files
        </button>
      </PageHeading>
      <Link className="mb-4 inline-flex text-xs font-bold text-purple no-underline" to="/records/my">
        ← All folders
      </Link>
      <section className="grid gap-4 rounded-3.5 border border-line bg-white p-5.5 shadow-[0_1px_2px_rgb(15_23_42/4%)] max-sm:p-4">
        {formMode === 'upload' && (
          <form className="grid gap-4 rounded-xl border border-[#d7e2ee] bg-[#f7f9fc] p-4" onSubmit={handleUpload}>
            <div>
              <p className="eyebrow">ADD TO FOLDER</p>
              <h2 className="mt-1 text-base font-bold text-ink">Upload files</h2>
            </div>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              <FormStep number="1">Select files</FormStep>
              <input
                ref={fileInputRef}
                className="form-input cursor-pointer border-dashed bg-white p-2.25"
                multiple
                onChange={(event) => {
                  setFiles(Array.from(event.target.files || []))
                  setDisplayNames([])
                }}
                required
                type="file"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              <FormStep number="2">Category</FormStep>
              <select
                className="form-input"
                onChange={(event) => setCategory(event.target.value)}
                required
                value={category}
              >
                <option disabled value="">Choose a category</option>
                {documentCategories.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
            {files.length > 0 && (
              <div className="grid max-h-80 gap-3 overflow-y-auto rounded-xl border border-line bg-white p-3.5">
                {files.map((file, index) => (
                  <label
                    className="grid gap-1.5 text-xs font-semibold text-ink"
                    htmlFor={`folder-upload-display-name-${index}`}
                    key={`${file.name}-${file.size}-${index}`}
                  >
                    <span className="truncate text-muted">{file.name}</span>
                    Display Name <span className="font-normal text-muted">(optional)</span>
                    <input
                      className="form-input min-h-9 text-xs font-normal"
                      id={`folder-upload-display-name-${index}`}
                      maxLength={200}
                      onChange={(event) => {
                        setDisplayNames((current) => {
                          const next = [...current]
                          next[index] = event.target.value
                          return next
                        })
                      }}
                      placeholder={file.name}
                      value={displayNames[index] || ''}
                    />
                  </label>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-white hover:bg-[#102d4f] disabled:opacity-60"
                disabled={busy}
                type="submit"
              >
                <Icon className="h-4 w-4 shrink-0" name="upload" />
                {busy ? 'Uploading...' : `Upload ${files.length || ''} file${files.length === 1 ? '' : 's'}`}
              </button>
              <button
                className="min-h-10 rounded-lg border border-line px-4 text-xs font-bold text-[#5f6276]"
                disabled={busy}
                onClick={cancelForm}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {!loading && documents.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <h2 className="text-sm font-bold text-ink">Files in this folder</h2>
            <span className="rounded-full bg-[#eaf0f7] px-2.5 py-1 text-xs font-semibold text-accent">
              {documents.length} {documents.length === 1 ? 'file' : 'files'}
            </span>
          </div>
        )}

        {loading ? (
          <div aria-label="Loading files" className="py-2" role="status">
            <span className="sr-only">Loading files...</span>
            <RowsSkeleton />
          </div>
        ) : !documents.length ? (
          <EmptyState
            icon="folder"
            text="Upload one or more files to this folder and choose a category for each file."
            title="No files in this folder yet"
          />
        ) : (
          <div className="grid gap-3">
            {documents.map((document) => (
              <article
                className="group relative grid items-center gap-3 rounded-xl border border-line bg-white p-4 transition-colors hover:border-[#c5d3e2] hover:bg-slate-50/70 sm:grid-cols-[1fr_auto]"
                key={document.id}
              >
                {formMode === document.id ? (
                  <form
                    className="relative z-20 grid gap-3 sm:col-span-2 sm:grid-cols-2"
                    onSubmit={(event) => handleUpdate(event, document.id)}
                  >
                    <label className="grid gap-2 text-xs font-semibold text-[#45485c] sm:col-span-2">
                      File name
                      <input
                        className="form-input"
                        maxLength={200}
                        onChange={(event) => setDocumentName(event.target.value)}
                        required
                        value={documentName}
                      />
                    </label>
                    <label className="grid content-start gap-2 text-xs font-semibold text-[#45485c]">
                      Category
                      <select
                        className="form-input"
                        onChange={(event) => setCategory(event.target.value)}
                        required
                        value={category}
                      >
                        {documentCategories.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="grid content-start gap-2 text-xs font-semibold text-[#45485c]">
                      Sharing
                      <select
                        className="form-input"
                        onChange={(event) => setDocumentSharing(event.target.value)}
                        value={documentSharing}
                      >
                        <option value="inherit">Use folder setting</option>
                        <option value="shared">Shared with staff</option>
                        <option value="private">Private</option>
                      </select>
                      <span className="text-[11px] font-normal text-muted">
                        “Use folder setting” means this file matches the folder’s sharing choice.
                      </span>
                    </label>
                    <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-2">
                      <button
                        className="inline-flex min-h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-bold text-white hover:bg-[#102d4f] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={busy}
                        type="submit"
                      >
                        {busy ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line px-4 text-sm font-bold text-[#5f6276] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={busy}
                        onClick={cancelForm}
                        type="button"
                      >
                        Cancel
                      </button>
                      <button
                        aria-label={`Delete file ${document.name}`}
                        className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#f0d9d9] text-[#a23e3e] hover:bg-[#fff7f7] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={busy}
                        onClick={() => handleDelete(document)}
                        title="Delete file"
                        type="button"
                      >
                        <Icon className="h-4 w-4" name="trash" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="min-w-0">
                      <h2 className="wrap-anywhere text-sm font-bold text-ink transition-colors group-hover:text-accent">{document.name}</h2>
                      <p className="mt-1 wrap-anywhere text-xs leading-relaxed text-muted">
                        {document.original_file_name} · {formatFileSize(document.file_size)} ·{' '}
                        {new Date(document.created_at).toLocaleDateString()}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <DocumentCategoryPill type={document.record_type} />
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${(document.is_shared ?? folder.is_shared) ? 'bg-[#eaf7ee] text-[#287a4b]' : 'bg-slate-100 text-[#4d5668]'}`}
                        >
                          <Icon
                            className="h-3 w-3"
                            name={(document.is_shared ?? folder.is_shared) ? 'users' : 'lock'}
                          />
                          {(document.is_shared ?? folder.is_shared) ? 'Shared' : 'Private'}
                        </span>
                      </div>
                    </div>
                    <div className="relative z-20 flex flex-wrap items-center gap-2 sm:justify-end">
                      <button
                        aria-label={`Open file ${document.name}`}
                        className="grid h-10 w-10 place-items-center rounded-lg border border-line text-[#5f6276] hover:bg-slate-50 disabled:opacity-60"
                        disabled={busy}
                        onClick={() => handleOpenDocument(document)}
                        title="Open file"
                        type="button"
                      >
                        <Icon className="h-4 w-4" name="print" />
                      </button>
                      <button
                        aria-label={`Edit file ${document.name}`}
                        className="grid h-10 w-10 place-items-center rounded-lg border border-line text-[#5f6276] hover:bg-slate-50 disabled:opacity-60"
                        disabled={busy || Boolean(formMode)}
                        onClick={() => startEdit(document)}
                        title="Edit file"
                        type="button"
                      >
                        <Icon className="h-4 w-4" name="edit" />
                      </button>
                    </div>
                    <button
                      aria-label={`Open file ${document.name}`}
                      className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                      disabled={busy}
                      onClick={() => handleOpenDocument(document)}
                      type="button"
                    />
                  </>
                )}
              </article>
            ))}
          </div>
        )}
        {(error || status) && (
          <p aria-live="polite" className={`text-xs ${error ? 'text-[#a23e3e]' : 'text-[#287a4b]'}`} role={error ? 'alert' : 'status'}>
            {error || status}
          </p>
        )}
      </section>
      <button
        className="mt-4 text-xs font-bold text-muted"
        onClick={() => navigate('/records')}
        type="button"
      >
        Back to all folders
      </button>
    </>
  )
}
