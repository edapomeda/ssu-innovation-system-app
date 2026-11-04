import { supabase } from '../lib/supabase'
import { getCachedDataOrLoad, invalidateCache } from '../lib/dataCache'

export const documentCategories = [
  { value: 'innovator', label: 'Innovator / Researcher' },
  { value: 'project', label: 'Innovation Project' },
  { value: 'ip', label: 'Intellectual Property' },
  { value: 'event', label: 'Event / Activity' },
]

const bucketName = 'innovation-documents'
const documentFields =
  'id, folder_id, record_type, innovation_record_id, name, original_file_name, content_type, file_size, storage_path, is_shared, created_at, updated_at'
const documentCacheTtl = 30_000
const innovationRecordCacheTtl = 5 * 60_000

export function documentsCacheKey(userId, folderId) {
  return `documents:${userId}:${folderId}`
}

export function innovationRecordsCacheKey(userId, type) {
  return `innovation-records:${userId}:${type}`
}

function getFriendlyError(error) {
  if (error?.code === '42703' || error?.code === 'PGRST204') {
    return new Error('Document sharing is not set up. Run supabase/record-sharing.sql in the Supabase project used by this app.')
  }

  if (error?.code === '23505') {
    return new Error('A document with that name already exists.')
  }

  if (error?.code === '42501') {
    const reason = [error.message, error.details, error.hint].filter(Boolean).join(' ')
    return new Error(
      `Supabase denied this document change${reason ? `: ${reason}` : '.'} Re-run supabase/fix-document-delete-policy.sql in the Supabase project used by this app.`,
    )
  }

  if (error?.code === '23514') {
    return new Error('Some of the information is not valid. Please review the form.')
  }

  console.error('Document request failed:', error)
  return new Error('Something went wrong. Please try again.')
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add the project URL and anon key to .env.local.')
  }

  return supabase
}

function validateDocumentName(name) {
  if (typeof name !== 'string') {
    throw new Error('Document name must be between 1 and 200 characters.')
  }

  const trimmedName = name.trim()

  if (trimmedName.length < 1 || trimmedName.length > 200) {
    throw new Error('Document name must be between 1 and 200 characters.')
  }

  return trimmedName
}

export async function listDocuments(folderId, userId) {
  const client = requireSupabase()
  return getCachedDataOrLoad(documentsCacheKey(userId, folderId), async () => {
    const { data, error } = await client
      .from('documents')
      .select(documentFields)
      .eq('folder_id', folderId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw getFriendlyError(error)

    return data
  }, documentCacheTtl)
}

export async function listMyDocuments(userId) {
  const client = requireSupabase()
  return getCachedDataOrLoad(documentsCacheKey(userId, 'all'), async () => {
    const { data, error } = await client
      .from('documents')
      .select(`${documentFields}, folders!inner(id, name, is_shared)`)
      .eq('folders.owner_id', userId)
      .is('folders.deleted_at', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw getFriendlyError(error)

    return data.map(({ folders, ...document }) => ({
      ...document,
      folder_name: folders.name,
      shared: document.is_shared ?? folders.is_shared,
    }))
  }, documentCacheTtl)
}

export async function listInnovationRecords(type, userId) {
  const client = requireSupabase()
  return getCachedDataOrLoad(innovationRecordsCacheKey(userId, type), async () => {
    const { data, error } = await client
      .from('innovation_records')
      .select('id, title')
      .eq('record_type', type)
      .is('deleted_at', null)
      .order('title', { ascending: true })
      .limit(500)

    if (error) throw getFriendlyError(error)

    return data
  }, innovationRecordCacheTtl)
}

export async function uploadDocuments(
  folderId,
  files,
  recordType,
  innovationRecordId,
  userId,
  displayNames = [],
) {
  const client = requireSupabase()

  if (!files.length) {
    throw new Error('Choose at least one file to upload.')
  }

  if (!documentCategories.some((category) => category.value === recordType)) {
    throw new Error('Choose a category for these files.')
  }

  const uploadedPaths = []
  const rows = []

  try {
    for (const [index, file] of files.entries()) {
      const documentId = globalThis.crypto.randomUUID()
      const storageFileName = file.name.replace(/[\\/]/g, '_')
      const storagePath = `${userId}/${folderId}/${documentId}/${storageFileName}`
      const { error } = await client.storage.from(bucketName).upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

      if (error) throw error

      uploadedPaths.push(storagePath)
      rows.push({
        id: documentId,
        folder_id: folderId,
        record_type: recordType,
        innovation_record_id: innovationRecordId || null,
        name: validateDocumentName(displayNames[index]?.trim() || file.name.slice(0, 200)),
        original_file_name: file.name,
        content_type: file.type || 'application/octet-stream',
        file_size: file.size,
        storage_path: storagePath,
        is_shared: null,
      })
    }

    const { data, error } = await client
      .from('documents')
      .insert(rows)
      .select(documentFields)

    if (error) throw error

    invalidateCache('documents:')
    invalidateCache('staff-records:')
    invalidateCache('admin-dashboard:')
    invalidateCache('admin-files:')
    return data
  } catch (error) {
    if (uploadedPaths.length) {
      try {
        const { error: cleanupError } = await client.storage.from(bucketName).remove(uploadedPaths)
        if (cleanupError) {
          console.error('Could not clean up uploaded files after a failed request:', cleanupError)
        }
      } catch (cleanupError) {
        console.error('Could not clean up uploaded files after a failed request:', cleanupError)
      }
    }

    throw getFriendlyError(error)
  }
}

export async function updateDocument(id, { name, recordType, innovationRecordId, isShared }) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('documents')
    .update({
      name: validateDocumentName(name),
      record_type: recordType,
      ...(innovationRecordId === undefined
        ? {}
        : { innovation_record_id: innovationRecordId || null }),
      ...(isShared === undefined ? {} : { is_shared: isShared }),
    })
    .eq('id', id)
    .select(documentFields)
    .maybeSingle()

  if (error) throw getFriendlyError(error)
  if (!data) throw new Error("You don't have permission to change this document.")

  invalidateCache('documents:')
  invalidateCache('staff-records:')
  invalidateCache('admin-dashboard:')
  invalidateCache('admin-files:')
  return data
}

export async function deleteDocument(id) {
  const client = requireSupabase()
  const { data: deleted, error } = await client.rpc('soft_delete_document', {
    p_document_id: id,
  })

  if (error) throw getFriendlyError(error)
  if (!deleted) throw new Error("You don't have permission to change this document.")

  invalidateCache('documents:')
  invalidateCache('staff-records:')
  invalidateCache('admin-dashboard:')
  invalidateCache('admin-files:')
  return { id }
}

export async function createDocumentDownloadUrl(storagePath) {
  const client = requireSupabase()
  const { data, error } = await client.storage
    .from(bucketName)
    .createSignedUrl(storagePath, 60)

  if (error) throw getFriendlyError(error)

  return data.signedUrl
}
