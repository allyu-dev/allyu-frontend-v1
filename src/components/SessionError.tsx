import { useState } from 'react'
import { RefreshCw, LogOut } from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { errorMessage } from '../auth/messages'

export function SessionError() {
  const auth = useAuth()
  const [logoutError, setLogoutError] = useState('')
  return (
    <main className="content">
      <h1>No se pudo cargar tu perfil</h1>
      <p role="alert">{logoutError || auth.error}</p>
      <div className="actions">
        <button onClick={auth.retrySync}><RefreshCw size={18} aria-hidden="true" /> Reintentar</button>
        <button className="secondary" onClick={() => { void auth.logout().catch(error => setLogoutError(errorMessage(error))) }}>
          <LogOut size={18} aria-hidden="true" /> Cerrar sesion
        </button>
      </div>
    </main>
  )
}