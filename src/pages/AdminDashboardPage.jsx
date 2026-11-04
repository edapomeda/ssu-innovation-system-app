import { useEffect, useState } from 'react'
import DocumentCategoryPill from '../components/DocumentCategoryPill'
import Icon from '../components/Icon'
import { RowsSkeleton, Skeleton } from '../components/LoadingSkeleton'
import PageHeading from '../components/PageHeading'
import { useAuth } from '../auth/useAuth'
import { getCachedData, hasCachedData } from '../lib/dataCache'
import { adminDashboardCacheKey, loadAdminDashboard } from '../services/adminDashboard'

const typeLabels = {
  innovator: 'Innovators',
  project: 'Projects',
  ip: 'IP filings',
  event: 'Events & activities',
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

function StatCard({ label, value, icon }) {
  return (
    <div className="group rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgb(15_23_42/4%)] transition-colors hover:border-[#c5d3e2]">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf0f7] text-accent transition-colors group-hover:bg-[#dce8f5]">
        <Icon name={icon} />
      </span>
      <div className="mt-4 min-h-8 text-2xl font-bold tracking-tight text-ink">{value}</div>
      <span className="mt-1 block text-sm font-semibold text-muted">{label}</span>
    </div>
  )
}

export default function AdminDashboardPage() {
  const { session } = useAuth()
  const userId = session.user.id
  const dashboardCacheKey = adminDashboardCacheKey(userId)
  const [dashboard, setDashboard] = useState(() => getCachedData(dashboardCacheKey) ?? null)
  const [loading, setLoading] = useState(() => !hasCachedData(dashboardCacheKey))
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    loadAdminDashboard(userId)
      .then((data) => {
        if (active) setDashboard(data)
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

  return (
    <>
      <PageHeading
        description="Monitor users, records, folders, and document uploads across the Innovation Office."
        eyebrow="ADMINISTRATION"
        title="Admin dashboard"
      />

      {error && (
        <p className="mb-5 rounded-xl border border-[#f1caca] bg-[#fff4f4] p-3.5 text-sm text-[#9b3434]" role="alert">
          {error}
        </p>
      )}

      <section aria-busy={loading} aria-label="System overview" className="grid grid-cols-2 gap-3.5 xl:grid-cols-4 max-sm:gap-2.5">
        <StatCard
          icon="user"
          label="Active users"
          value={loading ? <Skeleton className="h-8 w-16 rounded" /> : dashboard?.stats.activeUsers ?? '—'}
        />
        <StatCard
          icon="folder"
          label="Active folders"
          value={loading ? <Skeleton className="h-8 w-16 rounded" /> : dashboard?.stats.folders ?? '—'}
        />
        <StatCard
          icon="upload"
          label="Uploaded documents"
          value={loading ? <Skeleton className="h-8 w-16 rounded" /> : dashboard?.stats.documents ?? '—'}
        />
        <StatCard
          icon="lightbulb"
          label="Innovation records"
          value={loading ? <Skeleton className="h-8 w-16 rounded" /> : dashboard?.stats.innovationRecords ?? '—'}
        />
      </section>

      <section aria-busy={loading} className="mt-8">
        <div className="mb-3.5">
          <p className="eyebrow">DOCUMENT MANAGEMENT</p>
          <h2 className="mt-1 text-lg font-bold text-ink">Uploads by category</h2>
        </div>
        <div className="grid grid-cols-4 gap-3.5 max-lg:grid-cols-2 max-sm:gap-2.5">
          {(dashboard?.typeCounts ?? [
            { type: 'innovator', count: '—' },
            { type: 'project', count: '—' },
            { type: 'ip', count: '—' },
            { type: 'event', count: '—' },
          ]).map(({ type, count }) => (
            <div className="rounded-2xl border border-line bg-white p-4.5 transition-colors hover:border-[#c5d3e2]" key={type}>
              <p className="text-sm font-semibold text-muted">{typeLabels[type]}</p>
              {loading ? (
                <Skeleton className="mt-2 h-7 w-14 rounded" />
              ) : (
                <p className="mt-2 text-xl font-bold text-ink">{count}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section aria-busy={loading} className="mt-8 grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <div className="min-w-0 rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgb(15_23_42/4%)] max-sm:p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">DOCUMENT MANAGEMENT</p>
              <h2 className="mt-1 text-base font-bold text-ink">Recent uploads</h2>
            </div>
          </div>
          {loading ? (
            <div aria-label="Loading uploads" role="status">
              <span className="sr-only">Loading uploads...</span>
              <RowsSkeleton count={3} />
            </div>
          ) : dashboard?.recentUploads.length ? (
            <ul className="divide-y divide-line">
              {dashboard.recentUploads.map((document) => (
                <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0" key={document.id}>
                  <div className="min-w-0">
                    <p className="wrap-anywhere text-sm font-semibold text-ink">{document.name}</p>
                    <div className="mt-1">
                      <DocumentCategoryPill type={document.record_type} />
                    </div>
                  </div>
                  <time className="shrink-0 text-xs text-muted" dateTime={document.created_at}>
                    {formatDate(document.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No documents have been uploaded yet.</p>
          )}
        </div>

        <div className="min-w-0 rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgb(15_23_42/4%)] max-sm:p-4">
          <div className="mb-4">
            <p className="eyebrow">ACCESS OVERVIEW</p>
            <h2 className="mt-1 text-base font-bold text-ink">Recently registered users</h2>
          </div>
          {loading ? (
            <div aria-label="Loading user accounts" role="status">
              <span className="sr-only">Loading user accounts...</span>
              <RowsSkeleton count={3} />
            </div>
          ) : dashboard?.recentUsers.length ? (
            <ul className="divide-y divide-line">
              {dashboard.recentUsers.map((user) => (
                <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0" key={user.id}>
                  <div className="min-w-0">
                    <p className="wrap-anywhere text-sm font-semibold text-ink">
                      {user.full_name || user.email || 'Unnamed user'}
                    </p>
                    <p className="mt-1 text-xs capitalize text-muted">
                      {user.role} · {user.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-muted" dateTime={user.created_at}>
                    {formatDate(user.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No user accounts found.</p>
          )}
        </div>
      </section>
    </>
  )
}
