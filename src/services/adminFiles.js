import { supabase } from '../lib/supabase'
import { getCachedDataOrLoad } from '../lib/dataCache'

const cacheTtl = 30_000
const documentFields =
  'id, folder_id, record_type, innovation_record_id, name, original_file_name, content_type, file_size, storage_path, created_at, updated_at'

export function adminFilesCacheKey(userId) {
  return `admin-files:${userId}`
}

async function fetchAllRows(buildQuery, label) {
  const rows = []
  let offset = 0

  while (true) {
    const { data, error } = await buildQuery(offset, offset + 999)

    if (error) {
      throw new Error(`Unable to load ${label}: ${error.message}`)
    }

    rows.push(...data)
    if (!data.length) return rows
    offset += data.length
  }
}

export async function listAdminFiles(userId) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add the project URL and anon key to .env.local.')
  }

  return getCachedDataOrLoad(adminFilesCacheKey(userId), async () => {
    const [folders, documents, profiles] = await Promise.all([
      fetchAllRows(
        (from, to) =>
          supabase
            .from('folders')
            .select('id, name, owner_id, created_at, updated_at')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(from, to),
        'folders',
      ),
      fetchAllRows(
        (from, to) =>
          supabase
            .from('documents')
            .select(documentFields)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(from, to),
        'documents',
      ),
      fetchAllRows(
        (from, to) =>
          supabase
            .from('profiles')
            .select('id, full_name, email')
            .range(from, to),
        'folder owners',
      ),
    ])

    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))
    const foldersById = new Map(
      folders.map((folder) => {
        const owner = profilesById.get(folder.owner_id)
        return [
          folder.id,
          {
            ...folder,
            owner_name: owner?.full_name || owner?.email || 'Unknown owner',
            owner_email: owner?.email || '',
          },
        ]
      }),
    )

    return {
      folders: [...foldersById.values()],
      documents: documents.map((document) => {
        const folder = foldersById.get(document.folder_id)
        return {
          ...document,
          folder_name: folder?.name || 'Unavailable folder',
          owner_name: folder?.owner_name || 'Unknown owner',
          owner_email: folder?.owner_email || '',
        }
      }),
    }
  }, cacheTtl)
}
