import type { ApiRequest } from './client'

export interface UserProfile {
  id: string
  email: string
  displayName: string | null
  roleId: string | null
  englishLevel: 'A1' | 'A2' | 'B1' | 'B2' | null
  xp: number
  streak: number
  lastActivityDate: string | null
  createdAt: string
  updatedAt: string
}

export interface SyncResult extends UserProfile {
  isNewUser: boolean
}

export const syncRequest = {
  path: '/api/v1/users/sync',
  init: { method: 'POST', body: JSON.stringify({}) },
}

export function createUsersApi(request: ApiRequest) {
  return {
    sync: () => request<SyncResult>(syncRequest.path, syncRequest.init),
    getProfile: (signal?: AbortSignal) =>
      request<UserProfile>('/api/v1/users/me', { signal }),
    updateProfile: (displayName: string | null) =>
      request<UserProfile>('/api/v1/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ displayName }),
      }),
  }
}