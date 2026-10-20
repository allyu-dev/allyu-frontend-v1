import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from './auth-context'
import type { AuthContextValue } from './auth-context'
import { ProtectedRoute } from './ProtectedRoute'

function renderRoute(status: AuthContextValue['status']) {
  render(
    <AuthContext.Provider value={{ status, user: null, profile: null, error: null,
      login: vi.fn(), logout: vi.fn(), retrySync: vi.fn() }}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/login" element={<h1>Login</h1>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<h1>Privado</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('ruta protegida', () => {
  it('redirige al login sin sesion', () => {
    renderRoute('anonymous')
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
  })
  it('espera la restauracion y sincronizacion antes de mostrar contenido', () => {
    renderRoute('loading')
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Privado')).not.toBeInTheDocument()
  })
  it('permite acceso solo tras sincronizar', () => {
    renderRoute('ready')
    expect(screen.getByRole('heading', { name: 'Privado' })).toBeInTheDocument()
  })
})