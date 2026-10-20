import { describe, expect, it } from 'vitest'
import type { Role } from '../api/catalog'
import { initialPlacementState, placementReducer } from './flow'

const role: Role = { id: 'software-engineer', name: 'Software Engineer', description: 'Software', iconKey: 'code', isActive: true, order: 1 }
const questions = Array.from({ length: 12 }, (_, index) => ({
  id: `q${index + 1}`, prompt: `Pregunta ${index + 1}`, options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
}))
const state = { ...initialPlacementState, role, questions }

describe('borrador de placement', () => {
  it('no avanza si falta responder y nunca retrocede fuera del rango', () => {
    expect(placementReducer(state, { type: 'next' })).toBe(state)
    expect(placementReducer(state, { type: 'previous' }).index).toBe(0)
  })

  it('conserva respuestas al avanzar y retroceder', () => {
    let draft = placementReducer(state, { type: 'answer', questionId: 'q1', optionId: 'b' })
    draft = placementReducer(draft, { type: 'next' })
    expect(draft.index).toBe(1)
    draft = placementReducer(draft, { type: 'answer', questionId: 'q2', optionId: 'a' })
    draft = placementReducer(draft, { type: 'previous' })
    expect(draft.answers).toEqual({ q1: 'b', q2: 'a' })
    expect(draft.index).toBe(0)
  })

  it('ignora preguntas y opciones desconocidas', () => {
    expect(placementReducer(state, { type: 'answer', questionId: 'q99', optionId: 'a' })).toBe(state)
    expect(placementReducer(state, { type: 'answer', questionId: 'q1', optionId: 'z' })).toBe(state)
  })

  it('conserva el borrador al elegir el mismo rol y lo reinicia si cambia', () => {
    const draft = { ...state, index: 3, answers: { q1: 'a' } }
    expect(placementReducer(draft, { type: 'selectRole', role }).answers).toEqual({ q1: 'a' })
    const changed = placementReducer(draft, { type: 'selectRole', role: { ...role, id: 'devops-engineer' } })
    expect(changed.answers).toEqual({})
    expect(changed.questions).toEqual([])
    expect(changed.index).toBe(0)
  })

  it('muestra el nivel del servidor sin recalcularlo y no acepta otro rol', () => {
    const result = { roleId: role.id, englishLevel: 'A2' as const, correctAnswers: 5, totalQuestions: 12 }
    expect(placementReducer(state, { type: 'complete', result }).result).toEqual(result)
    expect(placementReducer(state, { type: 'complete', result: { ...result, roleId: 'otro' } }).result).toBeNull()
  })

  it('repetir borra respuestas y resultado pero conserva rol y preguntas', () => {
    const draft = { ...state, answers: { q1: 'a' }, index: 11,
      result: { roleId: role.id, englishLevel: 'B1' as const, correctAnswers: 8, totalQuestions: 12 } }
    const restarted = placementReducer(draft, { type: 'restart' })
    expect(restarted).toEqual({ ...state, answers: {}, index: 0, result: null })
    expect(placementReducer(draft, { type: 'reset' })).toEqual(initialPlacementState)
  })
})