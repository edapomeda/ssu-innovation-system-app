import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export default function RequireAdmin() {
  const { profile } = useAuth()

  if (profile?.role !== 'admin') {
    return <Navigate replace to="/home" />
  }

  return <Outlet />
}
