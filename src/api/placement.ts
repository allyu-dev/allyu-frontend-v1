import type { ApiRequest } from './client'
import type { UserProfile } from './users'

export interface PlacementQuestion {
  id: string
  prompt: string
  options: { id: string; text: string }[]
}

export interface PlacementAnswer {
  questionId: string
  optionId: string
}

export interface PlacementResult {
  roleId: string
  englishLevel: NonNullable<UserProfile['englishLevel']>
  correctAnswers: number
  totalQuestions: number
}

export function createPlacementApi(request: ApiRequest) {
  return {
    getQuestions: (signal?: AbortSignal) =>
      request<PlacementQuestion[]>('/api/v1/placement/questions', { signal }),
    evaluate: (roleId: string, answers: PlacementAnswer[]) =>
      request<PlacementResult>('/api/v1/placement/evaluate', {
        method: 'POST',
        body: JSON.stringify({ roleId, answers }),
      }),
  }
}