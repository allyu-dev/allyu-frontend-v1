import type { ApiRequest } from './client'

export interface Role {
  id: string
  name: string
  description: string
  iconKey: string
  isActive: boolean
  order: number
}

export function createCatalogApi(request: ApiRequest) {
  return {
    getRoles: (signal?: AbortSignal) => request<Role[]>('/api/v1/roles', { signal }),
  }
}