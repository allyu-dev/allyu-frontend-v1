import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './auth-context'
import { Loading } from '../components/Loading'
import { SessionError } from '../components/SessionError'

export function ProtectedRoute() {
  const auth = useAuth()
  const location = useLocation()
  if (auth.status === 'loading') return <Loading />
  if (auth.status === 'error' && auth.user) return <SessionError />
  if (auth.status !== 'ready') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}