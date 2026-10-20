import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { errorMessage } from '../auth/messages'
import { firebaseConfigured } from '../config/env'
import { Loading } from '../components/Loading'
import { SessionError } from '../components/SessionError'

export function Login() {
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  if (auth.status === 'loading') return <Loading />
  if (auth.status === 'ready') return <Navigate to="/" replace />
  if (auth.status === 'error' && auth.user) return <SessionError />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setError('')
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contrasena.')
      return
    }
    setPending(true)
    try {
      await auth.login(email, password)
    } catch (loginError) {
      setError(errorMessage(loginError))
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="login-layout">
      <form className="login-form" onSubmit={submit} aria-labelledby="login-title">
        <h1 id="login-title">Iniciar sesion</h1>
        {!firebaseConfigured && <p role="alert">Falta configurar Firebase. Completa las variables de entorno.</p>}
        {(error || auth.error) && <p className="error" role="alert">{error || auth.error}</p>}
        <label htmlFor="email">Correo electronico</label>
        <input id="email" name="email" type="email" autoComplete="username" required maxLength={254}
          value={email} onChange={event => setEmail(event.target.value)} disabled={pending} />
        <label htmlFor="password">Contrasena</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required
          value={password} onChange={event => setPassword(event.target.value)} disabled={pending} />
        <button type="submit" disabled={pending || !firebaseConfigured}>
          <LogIn size={18} aria-hidden="true" /> {pending ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </main>
  )
}