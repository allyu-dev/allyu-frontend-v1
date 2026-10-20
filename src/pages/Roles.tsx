import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BriefcaseBusiness, RefreshCw } from 'lucide-react'
import { catalogApi } from '../api'
import type { Role } from '../api/catalog'
import { errorMessage } from '../auth/messages'
import { Loading } from '../components/Loading'
import { usePlacement } from '../placement/PlacementProvider'

export function Roles() {
  const { state, dispatch } = usePlacement()
  const navigate = useNavigate()
  const [roles, setRoles] = useState<Role[]>([])
  const [selected, setSelected] = useState(state.role?.id ?? '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    void catalogApi.getRoles(controller.signal).then(result => {
      if (!controller.signal.aborted) setRoles(result)
    }).catch(cause => {
      if (!controller.signal.aborted) setError(errorMessage(cause))
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [version])

  function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const role = roles.find(item => item.id === selected && item.isActive)
    if (!role) return
    dispatch({ type: 'selectRole', role })
    navigate('/test')
  }

  return (
    <main className="content">
      <h1>Elige tu rol</h1>
      {loading ? <Loading /> : error ? (
        <div><p className="error" role="alert">{error}</p>
          <button onClick={() => setVersion(value => value + 1)}><RefreshCw size={18} aria-hidden="true" /> Reintentar</button>
        </div>
      ) : roles.length === 0 ? (
        <div><p role="status">No hay roles disponibles.</p>
          <button className="secondary" onClick={() => setVersion(value => value + 1)}><RefreshCw size={18} aria-hidden="true" /> Actualizar</button>
        </div>
      ) : (
        <form onSubmit={start}>
          <fieldset className="role-list">
            <legend>Perfil profesional</legend>
            {roles.map(role => (
              <label className="role-option" key={role.id}>
                <input type="radio" name="role" value={role.id} checked={selected === role.id}
                  disabled={!role.isActive} onChange={() => setSelected(role.id)} required />
                <BriefcaseBusiness size={22} strokeWidth={1.5} aria-hidden="true" />
                <span><strong>{role.name}</strong><span className="role-description">{role.description}</span></span>
              </label>
            ))}
          </fieldset>
          <button type="submit" disabled={!roles.some(role => role.id === selected && role.isActive)}>
            Continuar <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>
      )}
    </main>
  )
}