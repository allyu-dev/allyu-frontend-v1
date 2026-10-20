import { signOut } from 'firebase/auth'
import { firebaseAuth } from '../config/firebase'
import { apiBaseUrl } from '../config/env'
import { createApiClient } from './client'
import { createUsersApi } from './users'
import { createCatalogApi } from './catalog'
import { createPlacementApi } from './placement'

export const request = createApiClient({
  baseUrl: apiBaseUrl,
  getUser: () => firebaseAuth?.currentUser ?? null,
  onUnauthorized: async () => {
    if (firebaseAuth) await signOut(firebaseAuth)
  },
})

export const usersApi = createUsersApi(request)
export const catalogApi = createCatalogApi(request)
export const placementApi = createPlacementApi(request)