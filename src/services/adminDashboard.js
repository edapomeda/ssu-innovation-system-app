import { supabase } from '../lib/supabase'
import { getCachedDataOrLoad } from '../lib/dataCache'

export function adminDashboardCacheKey(userId) {
  return `admin-dashboard:${userId}`
}

async function countRows(table, { column, value, includeDeleted = false } = {}) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add the project URL and anon key to .env.local.')
  }

  let query = supabase.from(table).select('id', { count: 'exact', head: true })

  if (!includeDeleted) query = query.is('deleted_at', null)
  if (column) query = query.eq(column, value)

  const { count, error } = await query

  if (error) throw new Error(`Unable to load ${table} totals: ${error.message}`)

  return count ?? 0
}

export async function loadAdminDashboard(userId) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add the project URL and anon key to .env.local.')
  }

  return getCachedDataOrLoad(adminDashboardCacheKey(userId), async () => {
    const [
      activeUsers,
      folders,
      documents,
      innovationRecords,
      typeCounts,
      recentUploadsResult,
      recentUsersResult,
    ] = await Promise.all([
      countRows('profiles', { column: 'is_active', value: true, includeDeleted: true }),
      countRows('folders'),
      countRows('documents'),
      countRows('innovation_records'),
      Promise.all(
        ['innovator', 'project', 'ip', 'event'].map((type) =>
          countRows('documents', { column: 'record_type', value: type }),
        ),
      ),
      supabase
        .from('documents')
        .select('id, name, record_type, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('profiles')
        .select('id, full_name, email, role, is_active, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    if (recentUploadsResult.error) {
      throw new Error(`Unable to load recent uploads: ${recentUploadsResult.error.message}`)
    }

    if (recentUsersResult.error) {
      throw new Error(`Unable to load recent accounts: ${recentUsersResult.error.message}`)
    }

    return {
      stats: { activeUsers, folders, documents, innovationRecords },
      typeCounts: ['innovator', 'project', 'ip', 'event'].map((type, index) => ({
        type,
        count: typeCounts[index],
      })),
      recentUploads: recentUploadsResult.data,
      recentUsers: recentUsersResult.data,
    }
  }, 15_000)
}
