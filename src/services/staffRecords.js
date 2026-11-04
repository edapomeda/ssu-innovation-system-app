import { supabase } from '../lib/supabase'
import { getCachedDataOrLoad } from '../lib/dataCache'

const cacheTtl = 30_000
const documentFields =
  'id, folder_id, record_type, name, original_file_name, content_type, file_size, storage_path, is_shared, created_at, updated_at, folders!inner(id, name, owner_id, is_shared)'

function getOwnerInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'S'
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase()
  return `${parts[0][0]}${parts.at(-1)[0]}`.toLocaleUpperCase()
}

function latestDate(...values) {
  const validDates = values
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => right.getTime() - left.getTime())

  return validDates[0]?.toISOString() || null
}

export function staffRecordsCacheKey(userId) {
  return `staff-records:${userId}`
}

async function fetchAllRows(buildQuery, label) {
  const rows = []
  let offset = 0

  while (true) {
    const { data, error } = await buildQuery(offset, offset + 999)

    if (error) {
      if (error.code === '42501' || error.code === 'PGRST202') {
        throw new Error('You do not have permission to browse staff records, or the record-sharing setup is missing. Run supabase/record-sharing.sql followed by supabase/staff-records.sql.')
      }

      throw new Error(`Unable to load ${label}: ${error.message}`)
    }

    rows.push(...data)
    if (data.length < 1000) return rows
    offset += data.length
  }
}

export async function listStaffRecords(userId) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add the project URL and anon key to .env.local.')
  }

  return getCachedDataOrLoad(staffRecordsCacheKey(userId), async () => {
    const [folders, documents, ownersResult] = await Promise.all([
      fetchAllRows(
        (from, to) =>
          supabase
            .from('folders')
            .select('id, name, owner_id, is_shared, created_at, updated_at')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(from, to),
        'staff folders',
      ),
      fetchAllRows(
        (from, to) =>
          supabase
            .from('documents')
            .select(documentFields)
            .is('deleted_at', null)
            .is('folders.deleted_at', null)
            .order('created_at', { ascending: false })
            .range(from, to),
        'staff documents',
      ),
      supabase.rpc('list_record_owners'),
    ])

    if (ownersResult.error) {
      if (ownersResult.error.code === '42501' || ownersResult.error.code === 'PGRST202') {
        throw new Error('Unable to load staff names. Run supabase/record-sharing.sql followed by supabase/staff-records.sql in the Supabase project used by this app.')
      }

      throw new Error(`Unable to load staff names: ${ownersResult.error.message}`)
    }

    const ownersById = new Map(
      ownersResult.data.map((owner) => [owner.owner_id, owner.owner_name]),
    )
    const folderOwnerIds = new Set(folders.map((folder) => folder.owner_id))
    const documentOwnerIds = new Set(documents.map((document) => document.folders.owner_id))

    if (
      ownersResult.data.some((owner) =>
        !folderOwnerIds.has(owner.owner_id) ||
        (owner.has_documents && !documentOwnerIds.has(owner.owner_id)),
      )
    ) {
      throw new Error('Staff record access is not fully configured. Run supabase/record-sharing.sql followed by supabase/staff-records.sql in the Supabase project used by this app.')
    }

    const ownerName = (id) => ownersById.get(id) || 'Staff member'
    const documentsByFolder = new Map()

    for (const document of documents) {
      const folderDocuments = documentsByFolder.get(document.folder_id) || []
      folderDocuments.push(document)
      documentsByFolder.set(document.folder_id, folderDocuments)
    }

    return {
      folders: folders.map((folder) => {
        const name = ownerName(folder.owner_id)
        const folderDocuments = documentsByFolder.get(folder.id) || []

        return {
          ...folder,
          owner_name: name,
          owner: {
            id: folder.owner_id,
            name,
            initials: getOwnerInitials(name),
          },
          fileCount: folderDocuments.length,
          updatedAt: latestDate(
            folder.updated_at,
            ...folderDocuments.map((document) => document.updated_at || document.created_at),
          ) || folder.created_at,
          categories: [...new Set(folderDocuments.map((document) => document.record_type).filter(Boolean))],
        }
      }),
      documents: documents.map(({ folders: folder, ...document }) => ({
        ...document,
        folder_name: folder.name,
        shared: document.is_shared ?? folder.is_shared,
        owner_id: folder.owner_id,
        owner_name: ownerName(folder.owner_id),
        owner: {
          id: folder.owner_id,
          name: ownerName(folder.owner_id),
          initials: getOwnerInitials(ownerName(folder.owner_id)),
        },
        updatedAt: document.updated_at || document.created_at,
      })),
    }
  }, cacheTtl)
}
