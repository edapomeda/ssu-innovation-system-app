import { Fragment, Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, m } from 'motion/react'
import { useAuth } from '../auth/useAuth'
import { PageLoadingSkeleton } from './LoadingSkeleton'
import AppLink from './AppLink'
import Brand from './Brand'
import Icon from './Icon'
import Collapse from './motion/Collapse'
import PageTransition from './motion/PageTransition'
import { spring } from '../lib/motion'

const pages = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'uploads', label: 'Uploads', icon: 'upload' },
  { id: 'profile', label: 'Profile', icon: 'user' },
]

const recordPages = [
  { label: 'Shared Records', to: '/records', icon: 'users', id: 'shared' },
  { label: 'My Records', to: '/records/my', icon: 'user', id: 'mine' },
]

const adminPages = [
  { id: 'admin', label: 'Dashboard', icon: 'dashboard', to: '/admin' },
  { id: 'admin/files', label: 'File management', icon: 'folder', to: '/admin/files' },
  ...pages.filter((page) => ['uploads', 'profile'].includes(page.id)),
]

function NavigationLinks({ mobile = false }) {
  const { profile } = useAuth()
  const { pathname } = useLocation()
  const recordsActive = pathname.startsWith('/records')
  const isMyRecordsRoute = /^\/records\/[^/]+$/.test(pathname) && pathname !== '/records/all'
  const [recordsExpanded, setRecordsExpanded] = useState(!mobile && recordsActive)
  const navigationPages = profile?.role === 'admin' ? adminPages : pages
  const recordsNavigation = profile?.role !== 'admin' && (
    <div className={mobile ? 'min-w-0' : 'my-1'}>
      {mobile ? (
        <button
          aria-controls="mobile-records-submenu"
          aria-expanded={recordsExpanded}
          className={`mx-0.5 flex min-h-14 w-[calc(100%-0.25rem)] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border-0 px-1 text-[10px] font-semibold transition-colors ${recordsActive ? 'bg-white font-bold text-accent shadow-sm' : 'bg-transparent text-white/75 hover:bg-white/10 hover:text-white'}`}
          onClick={() => setRecordsExpanded((expanded) => !expanded)}
          type="button"
        >
          <Icon className="h-5 w-5 shrink-0" name="folder" />
          <span className="max-w-full truncate">Records</span>
        </button>
      ) : (
        <button
          aria-controls="desktop-records-submenu"
          aria-expanded={recordsExpanded}
          className={`relative flex min-h-12 w-full items-center gap-3 rounded-xl border-0 px-3 text-left text-sm font-semibold transition-colors ${recordsActive ? 'bg-white font-bold text-accent shadow-sm' : 'bg-transparent text-white/85 hover:bg-white/15 hover:text-white'}`}
          onClick={() => setRecordsExpanded((expanded) => !expanded)}
          type="button"
        >
          <Icon className="h-5 w-5 shrink-0" name="folder" />
          <span>Records</span>
          <m.span
            animate={{ rotate: recordsExpanded ? 90 : 0 }}
            className="ml-auto"
            transition={spring}
          >
            <Icon className="h-4 w-4" name="chevron" />
          </m.span>
        </button>
      )}

      <Collapse
        className={mobile
          ? 'absolute inset-x-2 bottom-full mb-2 grid grid-cols-2 gap-1 rounded-xl border border-white/15 bg-[#173b65] p-2 shadow-lg'
          : 'ml-5 mt-1 grid gap-1 border-l border-white/20 pl-3'}
        id={mobile ? 'mobile-records-submenu' : 'desktop-records-submenu'}
        open={recordsExpanded}
      >
          {recordPages.map((item) => (
            <NavLink
              aria-current={pathname === item.to || (item.id === 'mine' && isMyRecordsRoute) ? 'page' : undefined}
              className={({ isActive }) =>
                mobile
                  ? `flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-xs font-semibold no-underline transition-colors ${isActive || (item.id === 'mine' && isMyRecordsRoute) ? 'bg-white font-bold text-accent' : 'text-white/85 hover:bg-white/10 hover:text-white'}`
                  : `relative flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-semibold no-underline transition-colors ${isActive || (item.id === 'mine' && isMyRecordsRoute) ? 'bg-white/15 font-bold text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'}`
              }
              end={item.id === 'shared'}
              key={item.id}
              onClick={mobile ? () => setRecordsExpanded(false) : undefined}
              to={item.to}
            >
              {({ isActive }) => {
                const active = isActive || (item.id === 'mine' && isMyRecordsRoute)

                return (
                  <>
                    <Icon className="h-4 w-4 shrink-0" name={item.icon} />
                    <span className={mobile ? 'max-w-full truncate' : undefined}>{item.label}</span>
                    {!mobile && active && (
                      <m.span
                        className="absolute -right-3.75 h-5 w-0.75 rounded-l bg-white"
                        layoutId="sidebar-active-indicator"
                        transition={spring}
                      />
                    )}
                  </>
                )
              }}
            </NavLink>
          ))}
      </Collapse>
    </div>
  )

  return (
    <>
      {navigationPages.map((item) => (
        <Fragment key={item.id}>
          <NavLink
            className={({ isActive }) =>
              mobile
                ? `mx-0.5 flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold no-underline transition-colors ${isActive ? 'bg-white font-bold text-accent shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white'}`
                : `relative my-1 flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold no-underline transition-colors ${isActive ? 'bg-white font-bold text-accent shadow-sm' : 'text-white/85 hover:bg-white/15 hover:text-white'}`
            }
            end={item.id === 'admin'}
            to={item.to || `/${item.id}`}
          >
            {({ isActive }) => (
              <>
                <Icon className="h-5 w-5 shrink-0" name={item.icon} />
                <span className={mobile ? 'max-w-full truncate' : undefined}>
                  {mobile && item.id === 'admin' ? 'Admin' : mobile && item.id === 'admin/files' ? 'Files' : item.label}
                </span>
                {!mobile && isActive && (
                  <m.span
                    className="absolute -right-4.25 h-6 w-0.75 rounded-l bg-white"
                    layoutId="sidebar-active-indicator"
                    transition={spring}
                  />
                )}
              </>
            )}
          </NavLink>
          {item.id === 'home' && recordsNavigation}
        </Fragment>
      ))}
    </>
  )
}

export default function AppShell() {
  const [now, setNow] = useState(() => new Date())
  const { pathname } = useLocation()

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timerId)
  }, [])

  const phtTime = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(now)
  const phtDate = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(now)

  return (
    <div className="min-h-screen">
      <aside
        aria-label="Main navigation"
        className="fixed inset-y-0 left-0 z-40 hidden h-screen overflow-y-auto border-r border-white/10 bg-[#173b65] px-4.25 pb-28 pt-5 shadow-[12px_0_36px_rgb(15_23_42/16%)] sm:block sm:w-52 lg:w-64 max-sm:hidden max-lg:px-4"
      >
        <AppLink
          aria-label="Go to home"
          className="mb-9 flex min-h-16 items-center px-2 text-inherit no-underline"
          to="home"
        >
          <Brand compact inverse />
        </AppLink>
        <p className="mb-3.75 px-3.25 text-[10px] font-extrabold tracking-[0.13em] text-white/60">
          WORKSPACE
        </p>
        <NavigationLinks />
        <div className="absolute inset-x-4.25 bottom-6 rounded-xl border border-white/20 bg-white/10 p-3.75 text-xs leading-relaxed text-white/90">
          <Icon className="mb-2 h-4.5 w-4.5 text-white" name="lightbulb" />
          <p>Ideas become impact when they are shared.</p>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex w-full min-h-19.5 items-center justify-between gap-3 border-b border-white/15 bg-[#173b65]/85 px-4 py-3 text-white shadow-sm backdrop-blur sm:px-6 sm:pl-[calc(13rem+1.5rem)] lg:px-10.5 lg:pl-[calc(16rem+2.625rem)] max-sm:min-h-14 max-sm:py-2">
        <p className="min-w-0 text-xs font-extrabold leading-snug tracking-[0.08em] text-white sm:text-sm max-sm:max-w-[195px] max-sm:text-[9px] max-sm:leading-tight max-sm:tracking-[0.04em]">
          <span className="hidden sm:inline">
            INNOVATION OFFICE MANAGEMENT AND DATABASE SYSTEM
          </span>
          <span className="sm:hidden">
            INNOVATION OFFICE MANAGEMENT
            <br />
            AND DATABASE SYSTEM
          </span>
        </p>
        <time
          aria-label={`Philippine time ${phtTime}, ${phtDate}`}
          className="shrink-0 font-mono text-sm font-bold tabular-nums text-white max-sm:text-xs"
          dateTime={now.toISOString()}
        >
          {phtTime} <span className="font-sans text-[11px] font-semibold text-white/75">PHT</span>
        </time>
      </header>

      <div className="min-h-screen sm:pl-52 lg:pl-64 max-sm:pl-0">
        <div className="flex min-h-[calc(100vh-78px)] max-sm:min-h-[calc(100vh-112px)]">
          <main className="mx-auto min-w-0 max-w-280 flex-1 px-[clamp(28px,5vw,70px)] pb-20 pt-10.75 max-lg:px-7.5 max-sm:w-full max-sm:px-4.75 max-sm:pb-24 max-sm:pt-7.5">
            <Suspense fallback={<PageLoadingSkeleton />}>
              <AnimatePresence mode="wait" initial={false}>
                <PageTransition key={pathname}>
                  <Outlet />
                </PageTransition>
              </AnimatePresence>
            </Suspense>
          </main>
        </div>
      </div>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-50 hidden min-h-16.5 grid-cols-4 border-t border-white/15 bg-[#173b65] px-1.5 py-1.5 pb-[max(7px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(15_23_42/18%)] backdrop-blur-xl max-sm:grid"
      >
        <NavigationLinks mobile />
      </nav>
    </div>
  )
}
