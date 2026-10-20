import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { LoaderCircle, LogOut, RefreshCw, Save, Undo2 } from 'lucide-react'
import { usersApi } from '../api'
import { ApiError } from '../api/client'
import type { UserProfile } from '../api/users'
import { useAuth } from '../auth/auth-context'
import { errorMessage } from '../auth/messages'
import { Loading } from '../components/Loading'

function formatDate(value: string | null) {
  if (!value) return 'Sin actividad'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No disponible'
  return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeZone: 'UTC' }).format(date)
}

export function Profile() {
  const { logout, retrySync } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [missing, setMissing] = useState(false)
  const [version, setVersion] = useState(0)
  const [displayName, setDisplayName] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError('')
    setMissing(false)
    void usersApi.getProfile(controller.signal).then(result => {
      if (controller.signal.aborted) return
      setProfile(result)
      setDisplayName(result.displayName ?? '')
    }).catch(error => {
      if (controller.signal.aborted) return
      setLoadError(errorMessage(error))
      setMissing(error instanceof ApiError && error.code === 'USER_NOT_FOUND')
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [version])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || !profile) return
    setSuccess('')
    setSaveError('')
    const normalized = displayName.trim()
    if (normalized && (normalized.length < 2 || normalized.length > 60)) {
      setFieldError('El nombre debe tener entre 2 y 60 caracteres.')
      return
    }
    setFieldError('')
    setSaving(true)
    try {
      const updated = await usersApi.updateProfile(normalized || null)
      setProfile(updated)
      setDisplayName(updated.displayName ?? '')
      setSuccess('Nombre actualizado.')
    } catch (error) {
      const detail = error instanceof ApiError
        ? error.details.find(item => item.field === 'displayName') : undefined
      if (detail) setFieldError(detail.message)
      else setSaveError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function closeSession() {
    setLogoutError('')
    setLoggingOut(true)
    try {
      await logout()
    } catch (error) {
      setLogoutError(errorMessage(error))
      setLoggingOut(false)
    }
  }

  function resetName() {
    setDisplayName(profile?.displayName ?? '')
    setFieldError('')
    setSaveError('')
    setSuccess('')
  }

  const changed = (displayName.trim() || null) !== profile?.displayName

  return (
    <main className="content">
      <div className="page-heading">
        <h1>Mi perfil</h1>
        <button className="secondary" disabled={loggingOut || saving} onClick={() => { void closeSession() }}>
          <LogOut size={18} aria-hidden="true" /> {loggingOut ? 'Cerrando sesion...' : 'Cerrar sesion'}
        </button>
      </div>
      {logoutError && <p className="error" role="alert">{logoutError}</p>}
      {loading ? <Loading /> : loadError ? (
        <section aria-label="Error al cargar perfil">
          <p className="error" role="alert">{missing ? 'No se encontro tu perfil.' : loadError}</p>
          <button onClick={() => missing ? retrySync() : setVersion(value => value + 1)}>
            <RefreshCw size={18} aria-hidden="true" /> {missing ? 'Sincronizar perfil' : 'Reintentar'}
          </button>
        </section>
      ) : profile ? (
        <div className="profile-layout">
          <section aria-labelledby="account-title">
            <h2 id="account-title">Cuenta</h2>
            <dl className="profile-data">
              <div><dt>Correo electronico</dt><dd>{profile.email}</dd></div>
              <div><dt>Identificador</dt><dd>{profile.id}</dd></div>
              <div><dt>Rol</dt><dd>{profile.roleId ?? 'Sin asignar'}</dd></div>
              <div><dt>Nivel de ingles</dt><dd>{profile.englishLevel ?? 'Sin evaluar'}</dd></div>
              <div><dt>Experiencia</dt><dd>{profile.xp} XP</dd></div>
              <div><dt>Racha</dt><dd>{profile.streak} dias</dd></div>
              <div><dt>Ultima actividad</dt><dd>{formatDate(profile.lastActivityDate)}</dd></div>
              <div><dt>Cuenta creada</dt><dd>{formatDate(profile.createdAt)}</dd></div>
            </dl>
          </section>
          <section aria-labelledby="name-title">
            <h2 id="name-title">Nombre visible</h2>
            <form className="profile-form" onSubmit={save}>
              <label htmlFor="displayName">Nombre visible (opcional)</label>
              <input id="displayName" name="displayName" autoComplete="nickname" value={displayName}
                disabled={saving} aria-invalid={!!fieldError} aria-describedby={fieldError ? 'name-error' : undefined}
                onChange={event => { setDisplayName(event.target.value); setFieldError(''); setSuccess('') }} />
              {fieldError && <p id="name-error" className="error" role="alert">{fieldError}</p>}
              {saveError && <p className="error" role="alert">{saveError}</p>}
              {success && <p className="success" role="status">{success}</p>}
              <div className="actions">
                <button type="submit" disabled={saving || !changed}>
                  {saving ? <LoaderCircle className="spinner" size={18} aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
                  {saving ? 'Guardando...' : 'Guardar nombre'}
                </button>
                <button type="button" className="secondary" disabled={saving || !changed} onClick={resetName}
                  title="Descartar cambios" aria-label="Descartar cambios"><Undo2 size={18} aria-hidden="true" /></button>
              </div>
            </form>
          </section>
        </div>
      ) : <p role="status">No hay datos de perfil disponibles.</p>}
    </main>
  )
}