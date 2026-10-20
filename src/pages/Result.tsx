import { startTransition } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { RefreshCw, UserRound } from 'lucide-react'
import { usePlacement } from '../placement/PlacementProvider'

export function Result() {
  const { state, dispatch } = usePlacement()
  const navigate = useNavigate()
  if (!state.result || !state.role) return <Navigate to="/roles" replace />
  const { result, role } = state

  return (
    <main className="content result-content">
      <h1>Tu nivel de ingles</h1>
      <p className="result-level" aria-label={`Nivel ${result.englishLevel}`}>{result.englishLevel}</p>
      <dl className="profile-data">
        <div><dt>Respuestas correctas</dt><dd>{result.correctAnswers} de {result.totalQuestions}</dd></div>
        <div><dt>Perfil profesional</dt><dd>{role.name}</dd></div>
      </dl>
      <div className="actions result-actions">
        <Link className="button-link" to="/perfil"><UserRound size={18} aria-hidden="true" /> Ver perfil</Link>
        <button className="secondary" onClick={() => startTransition(() => { dispatch({ type: 'restart' }); navigate('/test') })}>
          <RefreshCw size={18} aria-hidden="true" /> Repetir evaluacion
        </button>
        <button className="secondary" onClick={() => startTransition(() => { dispatch({ type: 'reset' }); navigate('/roles') })}>Elegir otro rol</button>
      </div>
    </main>
  )
}