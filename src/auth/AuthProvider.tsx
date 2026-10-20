import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  browserLocalPersistence, onAuthStateChanged, setPersistence,
  signInWithEmailAndPassword, signOut,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { firebaseAuth } from '../config/firebase'
import { usersApi } from '../api'
import { AuthContext } from './auth-context'
import type { AuthState } from './auth-context'
import { errorMessage } from './messages'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: firebaseAuth ? 'loading' : 'anonymous', user: null, profile: null, error: null,
  })
  const generation = useRef(0)
  const retry = useRef<() => void>(() => undefined)

  useEffect(() => {
    const auth = firebaseAuth
    if (!auth) return
    let active = true
    let unsubscribe: (() => void) | undefined

    async function synchronize(user: User | null) {
      const current = ++generation.current
      if (!user) {
        setState({ status: 'anonymous', user: null, profile: null, error: null })
        return
      }
      setState({ status: 'loading', user, profile: null, error: null })
      try {
        const profile = await usersApi.sync()
        if (active && current === generation.current && auth!.currentUser?.uid === user.uid) {
          setState({ status: 'ready', user, profile, error: null })
        }
      } catch (error) {
        if (active && current === generation.current && auth!.currentUser?.uid === user.uid) {
          setState({ status: 'error', user, profile: null, error: errorMessage(error) })
        }
      }
    }

    retry.current = () => { void synchronize(auth.currentUser) }
    void setPersistence(auth, browserLocalPersistence).then(() => {
      if (!active) return
      unsubscribe = onAuthStateChanged(auth, (user) => { void synchronize(user) }, () => {
        if (active) setState({ status: 'error', user: null, profile: null, error: 'No se pudo restaurar la sesion.' })
      })
    }).catch(() => {
      if (active) setState({ status: 'error', user: null, profile: null, error: 'No se pudo guardar la sesion en este navegador.' })
    })

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [])

  async function login(email: string, password: string) {
    if (!firebaseAuth) throw new Error('Firebase no esta configurado.')
    await signInWithEmailAndPassword(firebaseAuth, email.trim(), password)
  }

  async function logout() {
    if (firebaseAuth) await signOut(firebaseAuth)
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, retrySync: () => retry.current() }}>
      {children}
    </AuthContext.Provider>
  )
}