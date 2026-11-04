import { useEffect, useState } from 'react'
import AppLink from '../components/AppLink'
import EmptyState from '../components/EmptyState'
import Icon from '../components/Icon'
import { RowsSkeleton } from '../components/LoadingSkeleton'
import PageHeading from '../components/PageHeading'
import QuickAction from '../components/QuickAction'
import { useAuth } from '../auth/useAuth'
import { getCachedData, hasCachedData } from '../lib/dataCache'
import { documentsCacheKey, listMyDocuments } from '../services/documents'

export default function HomePage() {
  const { session, profile } = useAuth()
  const userId = session.user.id
  const cacheKey = documentsCacheKey(userId, 'all')
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'there'
  const [documents, setDocuments] = useState(() => getCachedData(cacheKey)?.slice(0, 4) ?? [])
  const [loading, setLoading] = useState(() => !hasCachedData(cacheKey))
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true

    listMyDocuments(userId)
      .then((data) => {
        if (active) setDocuments(data.slice(0, 4))
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
  }, [reload, userId])

  return (
    <>
      <PageHeading
        description="Here’s what’s happening at the Innovation Office."
        eyebrow="YOUR WORKSPACE"
        title={`${greeting}, ${firstName}!`}
      />
      <section className="relative flex min-h-56.25 items-center justify-between gap-6 overflow-hidden rounded-4.5 bg-linear-to-r from-[#173b65] via-[#25528a] to-[#3b6ea0] px-10.75 py-8.75 text-white shadow-[0_16px_40px_rgb(23_59_101/16%)] max-sm:min-h-51.25 max-sm:px-6.25 max-sm:py-5.25">
        <div className="relative z-1 min-w-0">
          <p className="eyebrow text-[#cbd8ff]">WELCOME BACK</p>
          <h2 className="mb-2 mt-3 max-w-[18ch] text-balance text-[clamp(28px,4vw,36px)] font-bold leading-tight tracking-tight">
            Make room <span className="whitespace-nowrap">for the</span>{' '}
            <br className="max-sm:hidden" />
            next big idea.
          </h2>
          <p className="max-w-96 text-pretty text-sm leading-relaxed text-[#e2eaff]">
            Keep your innovation projects and resources in one place.
          </p>
          <AppLink
            className="mt-4.25 inline-flex min-h-10 items-center gap-1 text-sm font-bold text-white no-underline hover:text-[#e2eaff]"
            to="uploads"
          >
            Start with an upload <Icon className="h-3.75 w-3.75" name="chevron" />
          </AppLink>
        </div>
        <div aria-hidden="true" className="relative h-37.5 w-44.5 shrink-0 max-sm:absolute max-sm:-bottom-8.5 max-sm:-right-8.75 max-sm:opacity-30">
          <div className="absolute right-7.5 top-2.5 grid h-28.5 w-28.5 place-items-center rounded-full border border-white/30 bg-white/10 text-[#ffe9a7] shadow-[0_0_50px_rgb(198_215_255/18%)]">
            <Icon className="h-12 w-12 stroke-[1.3]" name="lightbulb" />
          </div>
          <span className="absolute right-4.5 top-1.75 text-2xl text-[#ffe7a0]">✦</span>
        </div>
      </section>

      <section className="mt-9 max-sm:mt-7">
        <div className="mb-3.75">
          <p className="eyebrow">GET THINGS DONE</p>
          <h2 className="mt-1 text-4.25 font-bold text-ink">Quick actions</h2>
        </div>
        <div className="grid grid-cols-1 gap-3.25 md:grid-cols-2 xl:grid-cols-3">
          <QuickAction description="Add a new project file" icon="upload" title="Upload documents" to="uploads" />
          <QuickAction description="Explore your documents" icon="folder" title="Browse records" to="records" />
          <QuickAction description="Manage your account" icon="user" title="View profile" to="profile" />
        </div>
      </section>

      <section className="mt-9 max-sm:mt-7">
        <div className="mb-3.75 flex items-center justify-between gap-5">
          <div>
            <p className="eyebrow">YOUR LIBRARY</p>
            <h2 className="mt-1 text-4.25 font-bold text-ink">Recent records</h2>
          </div>
          <AppLink className="inline-flex items-center gap-1 text-xs font-bold text-purple no-underline" to="records">
            View all <Icon className="h-3.75 w-3.75" name="chevron" />
          </AppLink>
        </div>
        {error ? (
          <div className="grid gap-3 rounded-xl border border-[#f1caca] bg-[#fff7f7] p-4 text-sm text-[#9b3434]">
            <p role="alert">{error}</p>
            <button
              className="w-fit rounded-lg border border-[#e8caca] bg-white px-3 py-2 text-xs font-bold hover:bg-[#fff1f1]"
              onClick={() => {
                setError('')
                setLoading(true)
                setReload((count) => count + 1)
              }}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <div aria-label="Loading recent documents" role="status">
            <span className="sr-only">Loading recent documents...</span>
            <RowsSkeleton count={2} />
          </div>
        ) : documents.length ? (
          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgb(15_23_42/4%)]">
            {documents.map((document) => (
              <AppLink
                className="group flex min-w-0 items-center gap-3.5 border-b border-line p-4 no-underline last:border-b-0 hover:bg-slate-50/80 max-sm:p-3.5"
                key={document.id}
                to={`records/${document.folder_id}`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf0f7] text-accent transition-colors group-hover:bg-[#dce8f5]">
                  <Icon name="file" />
                </span>
                <span className="grid min-w-0 flex-1 gap-1">
                  <strong className="truncate text-sm text-ink group-hover:text-accent">{document.name}</strong>
                  <small className="truncate text-xs text-muted">
                    {document.folder_name} · {new Date(document.created_at).toLocaleDateString()}
                  </small>
                </span>
                <Icon className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" name="chevron" />
              </AppLink>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="folder"
            text="Upload your first file to start building your library."
            title="No documents yet"
          />
        )}
      </section>
    </>
  )
}
