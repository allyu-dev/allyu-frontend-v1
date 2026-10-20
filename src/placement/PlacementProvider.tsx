import { createContext, useContext, useReducer } from 'react'
import type { Dispatch, ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { initialPlacementState, placementReducer } from './flow'
import type { PlacementAction, PlacementState } from './flow'

const PlacementContext = createContext<{
  state: PlacementState
  dispatch: Dispatch<PlacementAction>
} | null>(null)

export function PlacementProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(placementReducer, initialPlacementState)
  return <PlacementContext.Provider value={{ state, dispatch }}>{children}</PlacementContext.Provider>
}

export function PlacementLayout() {
  const { user } = useAuth()
  return <PlacementProvider key={user?.uid}><Outlet /></PlacementProvider>
}

export function usePlacement() {
  const context = useContext(PlacementContext)
  if (!context) throw new Error('usePlacement requiere PlacementProvider.')
  return context
}