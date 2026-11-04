import { Suspense, lazy, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import AppShell from './components/AppShell'
import RequireAdmin from './components/RequireAdmin'
import RequireAuth from './components/RequireAuth'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import WelcomePage from './pages/WelcomePage'
import { useAuth } from './auth/useAuth'
import { PageLoadingSkeleton } from './components/LoadingSkeleton'

const RecordsPage = lazy(() => import('./pages/RecordsPage'))
const AllRecordsPage = lazy(() => import('./pages/AllRecordsPage'))
const SharedFolderDocumentsPage = lazy(() => import('./pages/SharedFolderDocumentsPage'))
const UploadsPage = lazy(() => import('./pages/UploadsPage'))
const FolderDocumentsPage = lazy(() => import('./pages/FolderDocumentsPage'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'))
const AdminFilesPage = lazy(() => import('./pages/AdminFilesPage'))

export default function App() {
  const navigate = useNavigate()
  const { isConfigured, loading, profile, session, supabase } = useAuth()
  const [logoutError, setLogoutError] = useState('')

  function showPlaceholderNotice(event) {
    event.preventDefault()
    window.alert('This feature is a placeholder and is not connected yet.')
  }

  async function handleAuthSubmit(type, event) {
    event.preventDefault()

    if (!supabase) {
      throw new Error('Supabase is not configured. Add the project URL and anon key to .env.local.')
    }

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email')
    const password = formData.get('password')

    if (type === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: formData.get('name') },
        },
      })

      if (error) throw error

      if (data.session) {
        navigate('/home')
        return ''
      }

      return 'Account created, but Supabase did not start a session. Turn off email confirmation in Supabase, then log in. If this account was created before confirmation was disabled and login fails, delete that test account in Supabase and sign up again.'
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) throw error

    navigate('/home')
    return ''
  }

  async function logOut() {
    setLogoutError('')

    if (!supabase) {
      setLogoutError('Supabase is not configured, so you cannot log out from this session.')
      return
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      setLogoutError(error.message)
      return
    }

    navigate('/')
  }

  return (
    <Suspense fallback={<PageLoadingSkeleton />}>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route
          path="/login"
          element={
            session && !loading ? (
              <Navigate replace to="/home" />
            ) : (
              <AuthPage
                isConfigured={isConfigured}
                onSubmit={(event) => handleAuthSubmit('login', event)}
                type="login"
              />
            )
          }
        />
        <Route
          path="/signup"
          element={
            session && !loading ? (
              <Navigate replace to="/home" />
            ) : (
              <AuthPage
                isConfigured={isConfigured}
                onSubmit={(event) => handleAuthSubmit('signup', event)}
                type="signup"
              />
            )
          }
        />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route
              path="/home"
              element={profile?.role === 'admin' ? <Navigate replace to="/admin" /> : <HomePage />}
            />
            <Route
              path="/records"
              element={profile?.role === 'admin' ? <Navigate replace to="/admin/files" /> : <AllRecordsPage />}
            />
            <Route
              path="/records/my"
              element={profile?.role === 'admin' ? <Navigate replace to="/admin/files" /> : <RecordsPage />}
            />
            <Route
              path="/records/all"
              element={<Navigate replace to="/records" />}
            />
            <Route
              path="/records/shared/:folderId"
              element={profile?.role === 'admin' ? <Navigate replace to="/admin/files" /> : <SharedFolderDocumentsPage />}
            />
            <Route
              path="/records/:folderId"
              element={
                profile?.role === 'admin' ? (
                  <Navigate replace to="/admin/files" />
                ) : (
                  <FolderDocumentsPage />
                )
              }
            />
            <Route path="/uploads" element={<UploadsPage />} />
            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/files" element={<AdminFilesPage />} />
            </Route>
            <Route
              path="/profile"
              element={
                <ProfilePage
                  logoutError={logoutError}
                  onLogout={logOut}
                  onSubmit={showPlaceholderNotice}
                  profile={profile}
                />
              }
            />
          </Route>
        </Route>
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </Suspense>
  )
}
