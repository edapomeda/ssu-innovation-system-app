import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import EmptyState from '../components/EmptyState'
import FormStep from '../components/FormStep'
import Icon from '../components/Icon'
import { RowsSkeleton } from '../components/LoadingSkeleton'
import PageHeading from '../components/PageHeading'
import { getCachedData, hasCachedData } from '../lib/dataCache'
import {
  createFolder,
  listMyFolders,
  myFoldersCacheKey,
  updateFolderSharing,
} from '../services/folders'
import {
  documentCategories,
  uploadDocuments,
} from '../services/documents'

export default function UploadsPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const userId = session.user.id
  const foldersCacheKey = myFoldersCacheKey(userId)
  const fileInputRef = useRef(null)
  const [form, setForm] = useState('')
  const [folderName, setFolderName] = useState('')
  const [folderId, setFolderId] = useState('')
  const [folderShared, setFolderShared] = useState(true)
  const [folders, setFolders] = useState(() => getCachedData(foldersCacheKey) ?? [])
  const [foldersLoading, setFoldersLoading] = useState(false)
  const [foldersReload, setFoldersReload] = useState(0)
  const [files, setFiles] = useState([])
  const [displayNames, setDisplayNames] = useState([])
  const [category, setCategory] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadFolders() {
      if (form !== 'existing') return

      setFoldersLoading(!hasCachedData(foldersCacheKey))

      try {
        const data = await listMyFolders(userId)
        if (active) setFolders(data)
      } catch (requestError) {
        if (active) setError(requestError.message)
      } finally {
        if (active) setFoldersLoading(false)
      }
    }

    loadFolders()

    return () => {
      active = false
    }
  }, [form, userId, foldersCacheKey, foldersReload])

  function showForm(selectedForm) {
    setForm(selectedForm)
    setFolderName('')
    setFolderId('')
    setFolderShared(true)
    setFiles([])
    setDisplayNames([])
    setCategory('')
    setNotice('')
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setNotice('')
    setError('')

    if (form === 'existing' && !folderId) {
      setError('Choose a destination folder.')
      return
    }

    if (form === 'existing' && !files.length) {
      setError('Choose at least one file to upload.')
      return
    }

    if (files.length && !category) {
      setError('Choose a category for these files.')
      return
    }

    setBusy(true)

    try {
      let destinationFolderId = folderId
      let createdFolder = null
      let sharingUpdated = false

      if (form === 'new') {
        createdFolder = await createFolder(folderName, folderShared)
        destinationFolderId = createdFolder.id
      } else {
        const selectedFolder = folders.find((folder) => folder.id === folderId)
        if (selectedFolder && selectedFolder.is_shared !== folderShared) {
          const updatedFolder = await updateFolderSharing(folderId, folderShared)
          setFolders((current) => current.map((folder) =>
            folder.id === updatedFolder.id ? updatedFolder : folder,
          ))
          sharingUpdated = true
        }
      }

      if (files.length) {
        try {
          await uploadDocuments(destinationFolderId, files, category, null, userId, displayNames)
        } catch (uploadError) {
          if (createdFolder) {
            setFolders((current) => [createdFolder, ...current])
            setForm('existing')
            setFolderId(createdFolder.id)
            setFolderShared(createdFolder.is_shared)
            setError(`Folder created, but the file upload failed. ${uploadError.message} You can retry the upload below.`)
            return
          }

          if (sharingUpdated) {
            setError(`Folder sharing was updated, but the file upload failed. ${uploadError.message} You can retry the upload below.`)
            return
          }

          throw uploadError
        }
      }

      if (fileInputRef.current) fileInputRef.current.value = ''
      setFiles([])
      setDisplayNames([])
      if (destinationFolderId) {
        navigate(`/records/${destinationFolderId}`)
      } else {
        setNotice('Folder created.')
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  const canSubmit = !busy && !foldersLoading

  return (
    <>
      <PageHeading
        description="Add files to a new or existing project folder."
        eyebrow="DOCUMENTS"
        title="Uploads"
      />
      {!form ? (
        <div className="grid gap-3.25">
          <button
            className="group flex min-h-20 w-full items-center gap-3 rounded-xl border border-line bg-white p-5 text-left shadow-[0_1px_2px_rgb(15_23_42/4%)] transition hover:-translate-y-0.5 hover:border-[#a9bfd8] hover:shadow-[0_8px_24px_rgb(23_59_101/10%)]"
            onClick={() => showForm('new')}
            type="button"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2.5 bg-[#eaf0f7] text-accent">
              <Icon name="folderAdd" />
            </span>
            <span className="grid min-w-0 gap-1.5">
              <strong className="text-sm text-ink">Create a new project folder</strong>
              <small className="text-xs leading-relaxed text-muted">Start a new folder and add files to it.</small>
            </span>
            <Icon className="ml-auto h-4.25 w-4.25 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" name="chevron" />
          </button>
          <button
            className="group flex min-h-20 w-full items-center gap-3 rounded-xl border border-line bg-white p-5 text-left shadow-[0_1px_2px_rgb(15_23_42/4%)] transition hover:-translate-y-0.5 hover:border-[#a9bfd8] hover:shadow-[0_8px_24px_rgb(23_59_101/10%)]"
            onClick={() => showForm('existing')}
            type="button"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2.5 bg-[#eaf0f7] text-accent">
              <Icon name="upload" />
            </span>
            <span className="grid min-w-0 gap-1.5">
              <strong className="text-sm text-ink">Upload a file to an existing folder</strong>
              <small className="text-xs leading-relaxed text-muted">Choose a folder you already created and add files.</small>
            </span>
            <Icon className="ml-auto h-4.25 w-4.25 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" name="chevron" />
          </button>
          {notice && <p aria-live="polite" className="text-xs text-[#287a4b]" role="status">{notice}</p>}
        </div>
      ) : (
        <section className="rounded-3.5 border border-line bg-white p-5.5 shadow-[0_1px_2px_rgb(15_23_42/4%)] max-sm:p-4">
          <div className="mb-5 flex items-start justify-between gap-5 border-b border-line pb-4">
            <div>
              <p className="eyebrow">UPLOAD DETAILS</p>
              <h2 className="mt-1.5 text-lg font-bold text-ink">
                {form === 'new' ? 'Create a new project folder' : 'Upload to an existing folder'}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {form === 'new'
                  ? 'Choose a name, then optionally add files.'
                  : 'Choose a folder and the files you want to add.'}
              </p>
            </div>
            <button
              className="flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-line bg-white px-3.5 text-xs font-bold text-[#5f6276] hover:bg-slate-50"
              disabled={busy}
              onClick={() => showForm('')}
              type="button"
            >
              Cancel
            </button>
          </div>
          {form === 'existing' && foldersLoading ? (
            <div aria-label="Loading folders" className="py-2" role="status">
              <span className="sr-only">Loading folders...</span>
              <RowsSkeleton count={2} />
            </div>
          ) : form === 'existing' && error && !folders.length ? (
            <div className="grid gap-3">
              <p className="text-xs text-[#a23e3e]" role="alert">{error}</p>
              <button
                className="w-fit rounded-lg border border-line px-4 py-2 text-xs font-bold text-[#5f6276]"
                onClick={() => setFoldersReload((count) => count + 1)}
                type="button"
              >
                Try again
              </button>
            </div>
          ) : form === 'existing' && !folders.length ? (
            <div className="grid gap-3">
              <EmptyState
                icon="folder"
                text="Create a folder first, then you can upload files into it."
                title="No folders available"
              />
              <Link className="mx-auto text-xs font-bold text-purple" to="/records/my">Go to folders</Link>
            </div>
          ) : (
            <form className="grid gap-4.25" onSubmit={handleSubmit}>
              {form === 'new' ? (
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  <FormStep number="1">Folder name</FormStep>
                  <input
                    className="form-input"
                    maxLength={100}
                    onChange={(event) => setFolderName(event.target.value)}
                    placeholder="e.g. Community Innovation Project"
                    required
                    value={folderName}
                  />
                </label>
              ) : (
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  <FormStep number="1">Destination folder</FormStep>
                  <select
                    className="form-input"
                    onChange={(event) => {
                      const selectedFolderId = event.target.value
                      const selectedFolder = folders.find((folder) => folder.id === selectedFolderId)
                      setFolderId(selectedFolderId)
                      setFolderShared(selectedFolder?.is_shared ?? false)
                    }}
                    required
                    value={folderId}
                  >
                    <option disabled value="">Select a folder</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                  </select>
                </label>
              )}
              {form === 'existing' && (
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  <FormStep number="2">Select files</FormStep>
                  <input
                    ref={fileInputRef}
                    className="form-input cursor-pointer border-dashed bg-slate-50/70 p-2.25"
                    multiple
                    onChange={(event) => {
                      setFiles(Array.from(event.target.files || []))
                      setDisplayNames([])
                    }}
                    type="file"
                  />
                </label>
              )}
              {form === 'new' && (
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  <FormStep number="2">
                    Select files <span className="font-normal text-muted">(optional)</span>
                  </FormStep>
                  <input
                    ref={fileInputRef}
                    className="form-input cursor-pointer border-dashed bg-slate-50/70 p-2.25"
                    multiple
                    onChange={(event) => {
                      setFiles(Array.from(event.target.files || []))
                      setDisplayNames([])
                    }}
                    type="file"
                  />
                </label>
              )}
              {files.length > 0 && (
                <>
                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    <FormStep number="3">Category for these files</FormStep>
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
                  <div className="rounded-xl border border-line bg-slate-50/70 p-3.5">
                    <p className="mb-2 text-xs font-bold text-ink">
                      {files.length} file{files.length === 1 ? '' : 's'} selected
                    </p>
                    <ul className="grid max-h-80 gap-3 overflow-y-auto">
                      {files.map((file, index) => (
                        <li className="grid min-w-0 gap-1.5 text-xs text-muted" key={`${file.name}-${file.size}-${index}`}>
                          <div className="flex min-w-0 items-center gap-2">
                            <Icon className="h-3.5 w-3.5 shrink-0 text-accent" name="file" />
                            <span className="truncate">{file.name}</span>
                            <span className="ml-auto shrink-0 text-[11px]">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                          </div>
                          <label className="grid gap-1 text-[11px] font-semibold text-ink" htmlFor={`upload-display-name-${index}`}>
                            Display Name <span className="font-normal text-muted">(optional)</span>
                            <input
                              className="form-input min-h-9 bg-white text-xs font-normal"
                              id={`upload-display-name-${index}`}
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
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
              {(form === 'new' || folderId) && (
                <section
                  className="flex items-center justify-between gap-5 rounded-xl border border-line bg-slate-50/70 p-3.5"
                >
                  <div className="grid gap-1">
                    <span className="text-sm font-semibold text-ink" id="folder-sharing-label">
                      <FormStep number={files.length ? '4' : '3'}>
                        Share folder with active staff
                      </FormStep>
                    </span>
                    <span className="text-xs font-normal leading-relaxed text-muted" id="folder-sharing-description">
                      {folderShared
                        ? 'Active staff can view this folder and its files. You can keep individual files private.'
                        : 'Only you can view this folder and its files, unless you share an individual file.'}
                    </span>
                  </div>
                  <button
                    aria-checked={folderShared}
                    aria-describedby="folder-sharing-description"
                    aria-labelledby="folder-sharing-label"
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${folderShared ? 'bg-accent' : 'bg-slate-300'}`}
                    onClick={() => setFolderShared((shared) => !shared)}
                    role="switch"
                    type="button"
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${folderShared ? 'translate-x-5' : 'translate-x-0.5'}`}
                    />
                  </button>
                </section>
              )}
              <p
                aria-live="polite"
                className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${error ? 'border border-[#f1caca] bg-[#fff4f4] text-[#9b3434]' : notice ? 'border border-[#cce8d5] bg-[#f1fbf4] text-[#287a4b]' : 'bg-slate-50 text-muted'}`}
                role={error ? 'alert' : 'status'}
              >
                {error || notice || 'Files are private unless this folder is shared.'}
              </p>
              <button
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4.25 text-sm font-bold text-white shadow-sm hover:bg-[#102d4f] disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
                disabled={!canSubmit}
                type="submit"
              >
                <Icon className="h-4 w-4" name={form === 'new' && !files.length ? 'folderAdd' : 'upload'} />
                {busy ? 'Working...' : form === 'new' ? (files.length ? 'Create folder and upload' : 'Create folder') : `Upload ${files.length || ''} file${files.length === 1 ? '' : 's'}`}
              </button>
            </form>
          )}
        </section>
      )}
    </>
  )
}
