import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'
import type { UserProfile } from '../api/users'

export interface AuthState {
  status: 'loading' | 'anonymous' | 'ready' | 'error'
  user: User | null
  profile: UserProfile | null
  error: string | null
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  retrySync: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth requiere AuthProvider.')
  return context
}