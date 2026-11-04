import { supabase } from '../lib/supabase'
import { getCachedDataOrLoad, invalidateCache } from '../lib/dataCache'

const folderFields = 'id, name, is_shared, created_at, updated_at'
const folderCacheTtl = 30_000

export function myFoldersCacheKey(userId) {
  return `my-folders:${userId}`
}

function getFriendlyError(error) {
  if (error?.code === '42703' || error?.code === 'PGRST204') {
    return new Error('Folder sharing is not set up. Run supabase/record-sharing.sql in the Supabase project used by this app.')
  }

  if (error?.code === '23505') {
    return new Error('You already have a folder with that name.')
  }

  if (error?.code === '42501') {
    return new Error("You don't have permission to change this folder.")
  }

  console.error('Folder request failed:', error)
  return new Error('Something went wrong. Please try again.')
}

function validateFolderName(name) {
  if (typeof name !== 'string') {
    throw new Error('Folder name must be between 1 and 100 characters.')
  }

  const trimmedName = name.trim()

  if (trimmedName.length < 1 || trimmedName.length > 100) {
    throw new Error('Folder name must be between 1 and 100 characters.')
  }

  return trimmedName
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add the project URL and anon key to .env.local.')
  }

  return supabase
}

export async function listMyFolders(userId) {
  const client = requireSupabase()
  return getCachedDataOrLoad(myFoldersCacheKey(userId), async () => {
    const { data, error } = await client
      .from('folders')
      .select(folderFields)
      .eq('owner_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw getFriendlyError(error)

    return data
  }, folderCacheTtl)
}

export async function createFolder(name, isShared = true) {
  const client = requireSupabase()
  const trimmedName = validateFolderName(name)
  const { data, error } = await client
    .from('folders')
    .insert({ name: trimmedName, is_shared: isShared })
    .select(folderFields)
    .single()

  if (error) throw getFriendlyError(error)

  invalidateCache('my-folders:')
  invalidateCache('staff-records:')
  invalidateCache('admin-dashboard:')
  invalidateCache('admin-files:')
  return data
}

export async function renameFolder(id, name) {
  const client = requireSupabase()
  const trimmedName = validateFolderName(name)
  const { data, error } = await client
    .from('folders')
    .update({ name: trimmedName })
    .eq('id', id)
    .select(folderFields)
    .maybeSingle()

  if (error) throw getFriendlyError(error)
  if (!data) throw new Error("You don't have permission to change this folder.")

  invalidateCache('my-folders:')
  invalidateCache('documents:')
  invalidateCache('staff-records:')
  invalidateCache('admin-dashboard:')
  invalidateCache('admin-files:')
  return data
}

export async function updateFolderSharing(id, isShared) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('folders')
    .update({ is_shared: isShared })
    .eq('id', id)
    .select(folderFields)
    .maybeSingle()

  if (error) throw getFriendlyError(error)
  if (!data) throw new Error("You don't have permission to change this folder.")

  invalidateCache('my-folders:')
  invalidateCache('documents:')
  invalidateCache('staff-records:')
  invalidateCache('admin-dashboard:')
  invalidateCache('admin-files:')
  return data
}

export async function deleteFolder(id) {
  const client = requireSupabase()
  const { count, error } = await client
    .from('folders')
    .update({ deleted_at: new Date().toISOString() }, { count: 'exact' })
    .eq('id', id)

  if (error) throw getFriendlyError(error)
  if (count !== 1) throw new Error("You don't have permission to change this folder.")

  invalidateCache('my-folders:')
  invalidateCache('documents:')
  invalidateCache('staff-records:')
  invalidateCache('admin-dashboard:')
  invalidateCache('admin-files:')
  return { id }
}
