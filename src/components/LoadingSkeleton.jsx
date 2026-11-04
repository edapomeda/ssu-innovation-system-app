function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`loading-shimmer ${className}`} />
}

function RowsSkeleton({ count = 3 }) {
  return (
    <div aria-hidden="true" className="grid gap-3">
      {Array.from({ length: count }, (_, index) => (
        <div className="flex items-center gap-3 rounded-xl border border-line p-4" key={index}>
          <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-2/5 rounded" />
            <Skeleton className="h-3 w-1/4 rounded" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg max-sm:hidden" />
        </div>
      ))}
    </div>
  )
}

function PageLoadingSkeleton() {
  return (
    <div aria-label="Loading page" className="grid gap-8" role="status">
      <span className="sr-only">Loading page...</span>
      <div className="grid gap-3">
        <Skeleton className="h-3 w-28 rounded" />
        <Skeleton className="h-8 w-64 max-w-full rounded-lg" />
        <Skeleton className="h-4 w-96 max-w-full rounded" />
      </div>
      <div className="grid gap-4 rounded-3xl border border-line bg-white p-5.5">
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="flex gap-3 border-b border-line pb-3">
          <Skeleton className="h-8 w-24 rounded" />
          <Skeleton className="h-8 w-28 rounded" />
        </div>
        <RowsSkeleton />
      </div>
    </div>
  )
}

function AccountLoadingSkeleton() {
  return (
    <main aria-label="Loading your account" className="mx-auto grid min-h-screen max-w-xl content-center gap-4 px-6" role="status">
      <span className="sr-only">Loading your account...</span>
      <Skeleton className="mx-auto h-12 w-12 rounded-full" />
      <Skeleton className="mx-auto h-6 w-56 max-w-full rounded" />
      <Skeleton className="mx-auto h-4 w-72 max-w-full rounded" />
      <Skeleton className="mx-auto h-10 w-28 rounded-lg" />
    </main>
  )
}

export { AccountLoadingSkeleton, PageLoadingSkeleton, RowsSkeleton, Skeleton }
