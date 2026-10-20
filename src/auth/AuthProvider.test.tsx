import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from 'firebase/auth'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './auth-context'

const mocks = vi.hoisted(() => ({
  auth: { currentUser: null as User | null },
  persistence: vi.fn(), subscribe: vi.fn(), login: vi.fn(), logout: vi.fn(),
}))

vi.mock('../config/firebase', () => ({ firebaseAuth: mocks.auth }))
vi.mock('firebase/auth', () => ({
  browserLocalPersistence: 'local', setPersistence: mocks.persistence,
  onAuthStateChanged: mocks.subscribe,
  signInWithEmailAndPassword: mocks.login, signOut: mocks.logout,
}))

function Probe() {
  const auth = useAuth()
  return <>
    <span data-testid="status">{auth.status}</span>
    <span>{auth.profile?.email}</span>
    <button onClick={() => { void auth.login('  demo@example.com  ', 'password') }}>Login</button>
    <button onClick={() => { void auth.logout() }}>Logout</button>
  </>
}

describe('sesion Firebase', () => {
  let listener: (user: User | null) => void
  const transport = vi.fn<typeof fetch>()

  beforeEach(() => {
    mocks.auth.currentUser = null
    mocks.persistence.mockResolvedValue(undefined)
    mocks.login.mockResolvedValue(undefined)
    mocks.logout.mockResolvedValue(undefined)
    mocks.subscribe.mockImplementation((_auth, callback) => {
      listener = callback
      return vi.fn()
    })
    transport.mockReset()
    vi.stubGlobal('fetch', transport)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('restaura persistencia y sincroniza antes de habilitar la sesion', async () => {
    let resolveResponse!: (response: Response) => void
    transport.mockReturnValueOnce(new Promise(resolve => { resolveResponse = resolve }))
    const user = { uid: 'uid', getIdToken: vi.fn().mockResolvedValue('private-token') } as unknown as User
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(mocks.subscribe).toHaveBeenCalled())
    expect(mocks.persistence).toHaveBeenCalledWith(mocks.auth, 'local')
    mocks.auth.currentUser = user
    act(() => listener(user))
    await waitFor(() => expect(transport).toHaveBeenCalledOnce())
    expect(screen.getByTestId('status')).toHaveTextContent('loading')
    expect(transport.mock.calls[0][0]).toBe('/api/v1/users/sync')
    expect(transport.mock.calls[0][1]?.body).toBe('{}')
    await act(async () => {
      resolveResponse(Response.json({ id: 'uid', email: 'demo@example.com', isNewUser: false }))
    })
    expect(screen.getByTestId('status')).toHaveTextContent('ready')
    expect(screen.getByText('demo@example.com')).toBeInTheDocument()
    mocks.auth.currentUser = null
    act(() => listener(null))
    expect(screen.getByTestId('status')).toHaveTextContent('anonymous')
    expect(screen.queryByText('demo@example.com')).not.toBeInTheDocument()
  })

  it('inicia y cierra sesion mediante el SDK sin registrar cuentas', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(mocks.subscribe).toHaveBeenCalled())
    await act(async () => screen.getByText('Login').click())
    expect(mocks.login).toHaveBeenCalledWith(mocks.auth, 'demo@example.com', 'password')
    await act(async () => screen.getByText('Logout').click())
    expect(mocks.logout).toHaveBeenCalledWith(mocks.auth)
  })

  it('un fallo de sincronizacion no permite acceso a las rutas privadas', async () => {
    transport.mockResolvedValueOnce(Response.json({ error: { code: 'INTERNAL_ERROR', message: 'Error' } }, { status: 500 }))
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(mocks.subscribe).toHaveBeenCalled())
    mocks.auth.currentUser = { uid: 'uid', getIdToken: vi.fn().mockResolvedValue('private-token') } as unknown as User
    act(() => listener(mocks.auth.currentUser))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('error'))
  })
})