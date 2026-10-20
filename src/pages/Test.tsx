import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, LoaderCircle, RefreshCw } from 'lucide-react'
import { placementApi } from '../api'
import { ApiError } from '../api/client'
import { errorMessage } from '../auth/messages'
import { Loading } from '../components/Loading'
import { usePlacement } from '../placement/PlacementProvider'

export function Test() {
  const { state, dispatch } = usePlacement()
  const navigate = useNavigate()
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [version, setVersion] = useState(0)
  const lifetime = useRef({ active: true })

  useEffect(() => {
    const current = lifetime.current
    current.active = true
    return () => { current.active = false }
  }, [])

  useEffect(() => {
    if (!state.role || state.questions.length > 0) return
    const controller = new AbortController()
    setLoadError('')
    void placementApi.getQuestions(controller.signal).then(questions => {
      if (controller.signal.aborted) return
      if (questions.length !== 12 || new Set(questions.map(question => question.id)).size !== 12 ||
        questions.some(question => question.options.length === 0)) {
        setLoadError('El test no tiene las 12 preguntas validas esperadas.')
        return
      }
      dispatch({ type: 'questionsLoaded', questions })
    }).catch(error => {
      if (!controller.signal.aborted) setLoadError(errorMessage(error))
    })
    return () => controller.abort()
  }, [state.role, state.questions.length, version, dispatch])

  if (!state.role) return <Navigate to="/roles" replace />
  if (state.result) return <Navigate to="/resultado" replace />

  async function evaluate() {
    if (submitting || !state.role) return
    if (state.questions.length !== 12 || state.questions.some(question =>
      !question.options.some(option => option.id === state.answers[question.id]))) {
      setSubmitError('Responde las 12 preguntas antes de enviar el test.')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const result = await placementApi.evaluate(state.role.id, state.questions.map(question => ({
        questionId: question.id, optionId: state.answers[question.id],
      })))
      if (!lifetime.current.active) return
      dispatch({ type: 'complete', result })
      navigate('/resultado', { replace: true })
    } catch (error) {
      if (!lifetime.current.active) return
      setSubmitError(error instanceof ApiError && error.code === 'ROLE_NOT_FOUND'
        ? 'El rol seleccionado ya no esta disponible. Selecciona otro rol.'
        : errorMessage(error))
    } finally {
      if (lifetime.current.active) setSubmitting(false)
    }
  }

  const question = state.questions[state.index]
  const last = state.index === state.questions.length - 1
  const answered = question && !!state.answers[question.id]

  return (
    <main className="content test-content">
      <div className="page-heading"><h1>Evaluacion de ingles</h1><span className="muted">{state.role.name}</span></div>
      {!submitting && <Link className="text-link" to="/roles">Cambiar rol</Link>}
      {!question ? loadError ? (
        <div><p className="error" role="alert">{loadError}</p>
          <button onClick={() => setVersion(value => value + 1)}><RefreshCw size={18} aria-hidden="true" /> Reintentar</button>
        </div>
      ) : <Loading /> : (
        <>
          <div className="test-progress">
            <label htmlFor="test-progress">Pregunta {state.index + 1} de {state.questions.length}</label>
            <progress id="test-progress" value={state.index + 1} max={state.questions.length} />
          </div>
          <fieldset className="question-options" disabled={submitting}>
            <legend>{question.prompt}</legend>
            {question.options.map(option => (
              <label className="answer-option" key={option.id}>
                <input type="radio" name={question.id} value={option.id} checked={state.answers[question.id] === option.id}
                  onChange={() => { dispatch({ type: 'answer', questionId: question.id, optionId: option.id }); setSubmitError('') }} />
                <span>{option.text}</span>
              </label>
            ))}
          </fieldset>
          {submitError && <p className="error" role="alert">{submitError}</p>}
          <div className="test-actions">
            <button className="secondary" disabled={state.index === 0 || submitting} onClick={() => dispatch({ type: 'previous' })}>
              <ArrowLeft size={18} aria-hidden="true" /> Anterior
            </button>
            {last ? <button disabled={!answered || submitting} onClick={() => { void evaluate() }}>
              {submitting ? <LoaderCircle className="spinner" size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
              {submitting ? 'Evaluando...' : 'Evaluar'}
            </button> : <button disabled={!answered || submitting} onClick={() => dispatch({ type: 'next' })}>
              Siguiente <ArrowRight size={18} aria-hidden="true" />
            </button>}
          </div>
        </>
      )}
    </main>
  )
}