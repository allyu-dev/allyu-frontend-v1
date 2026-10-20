import type { Role } from '../api/catalog'
import type { PlacementQuestion, PlacementResult } from '../api/placement'

export interface PlacementState {
  role: Role | null
  questions: PlacementQuestion[]
  answers: Record<string, string>
  index: number
  result: PlacementResult | null
}

export const initialPlacementState: PlacementState = {
  role: null, questions: [], answers: {}, index: 0, result: null,
}

export type PlacementAction =
  | { type: 'selectRole'; role: Role }
  | { type: 'questionsLoaded'; questions: PlacementQuestion[] }
  | { type: 'answer'; questionId: string; optionId: string }
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'complete'; result: PlacementResult }
  | { type: 'restart' }
  | { type: 'reset' }

export function placementReducer(state: PlacementState, action: PlacementAction): PlacementState {
  switch (action.type) {
    case 'selectRole':
      return state.role?.id === action.role.id
        ? { ...state, role: action.role }
        : { ...initialPlacementState, role: action.role }
    case 'questionsLoaded':
      return { ...state, questions: action.questions }
    case 'answer': {
      const question = state.questions.find(item => item.id === action.questionId)
      if (state.result || !question?.options.some(option => option.id === action.optionId)) return state
      return { ...state, answers: { ...state.answers, [action.questionId]: action.optionId } }
    }
    case 'next':
      return state.answers[state.questions[state.index]?.id]
        ? { ...state, index: Math.min(state.index + 1, state.questions.length - 1) }
        : state
    case 'previous':
      return { ...state, index: Math.max(0, state.index - 1) }
    case 'complete':
      return action.result.roleId === state.role?.id ? { ...state, result: action.result } : state
    case 'restart':
      return { ...state, answers: {}, index: 0, result: null }
    case 'reset':
      return initialPlacementState
  }
}