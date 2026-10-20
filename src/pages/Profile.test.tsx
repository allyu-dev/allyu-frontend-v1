import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import type { UserProfile } from '../api/users'
import { AuthContext } from '../auth/auth-context'
import { Profile } from './Profile'

const mocks = vi.hoisted(() => ({ getProfile: vi.fn(), updateProfile: vi.fn(), logout: vi.fn(), retrySync: vi.fn() }))
vi.mock('../api', () => ({ usersApi: { getProfile: mocks.getProfile, updateProfile: mocks.updateProfile } }))

const profile: UserProfile = {
  id: 'uid', email: 'demo@example.com', displayName: 'Demo', roleId: null, englishLevel: null,
  xp: 0, streak: 0, lastActivityDate: '2026-10-19',
  createdAt: '2026-10-19T12:00:00.000Z', updatedAt: '2026-10-19T12:00:00.000Z',
}

function renderProfile() {
  return render(<AuthContext.Provider value={{ status: 'ready', user: null, profile,
    error: null, login: vi.fn(), logout: mocks.logout, retrySync: mocks.retrySync }}><Profile /></AuthContext.Provider>)
}

async function editName(value: string) {
  const input = await screen.findByLabelText('Nombre visible (opcional)')
  fireEvent.change(input, { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar nombre' }))
}

describe('perfil', () => {
  beforeEach(() => {
    mocks.getProfile.mockReset().mockResolvedValue({ ...profile })
    mocks.updateProfile.mockReset()
    mocks.logout.mockReset().mockResolvedValue(undefined)
    mocks.retrySync.mockReset()
  })

  it('carga el perfil, muestra datos y estados sin rol ni nivel', async () => {
    renderProfile()
    expect(screen.getByRole('status')).toHaveTextContent('Cargando')
    expect(await screen.findByText('demo@example.com')).toBeInTheDocument()
    expect(screen.getByText('Sin asignar')).toBeInTheDocument()
    expect(screen.getByText('Sin evaluar')).toBeInTheDocument()
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Guardar nombre' })).toBeDisabled()
  })

  it('guarda el nombre sin espacios extremos y usa la respuesta del servidor', async () => {
    mocks.updateProfile.mockResolvedValue({ ...profile, displayName: 'Nuevo nombre' })
    renderProfile()
    await editName('  Nuevo nombre  ')
    expect(mocks.updateProfile).toHaveBeenCalledWith('Nuevo nombre')
    expect(await screen.findByRole('status')).toHaveTextContent('Nombre actualizado.')
    expect(screen.getByLabelText('Nombre visible (opcional)')).toHaveValue('Nuevo nombre')
    expect(screen.getByRole('button', { name: 'Guardar nombre' })).toBeDisabled()
  })

  it('envia null cuando el nombre queda vacio', async () => {
    mocks.updateProfile.mockResolvedValue({ ...profile, displayName: null })
    renderProfile()
    await editName('   ')
    expect(mocks.updateProfile).toHaveBeenCalledWith(null)
    expect(await screen.findByRole('status')).toHaveTextContent('Nombre actualizado.')
  })

  it.each(['A', 'x'.repeat(61)])('rechaza longitud invalida sin llamar a la API (%s)', async value => {
    renderProfile()
    await editName(value)
    expect(screen.getByRole('alert')).toHaveTextContent('entre 2 y 60')
    expect(mocks.updateProfile).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Nombre visible (opcional)')).toHaveAttribute('aria-invalid', 'true')
  })

  it('muestra detalles de validacion del backend sin perder el texto', async () => {
    mocks.updateProfile.mockRejectedValue(new ApiError(400, 'VALIDATION_ERROR', 'Invalido', [
      { field: 'displayName', message: 'Nombre rechazado' },
    ]))
    renderProfile()
    await editName('Nuevo nombre')
    expect(await screen.findByRole('alert')).toHaveTextContent('Nombre rechazado')
    expect(screen.getByLabelText('Nombre visible (opcional)')).toHaveValue('Nuevo nombre')
  })

  it('permite reintentar la carga despues de un fallo del servidor', async () => {
    mocks.getProfile.mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'Error'))
    renderProfile()
    expect(await screen.findByRole('alert')).toHaveTextContent('servidor no esta disponible')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('demo@example.com')).toBeInTheDocument()
    expect(mocks.getProfile).toHaveBeenCalledTimes(2)
  })

  it('permite resincronizar un perfil eliminado', async () => {
    mocks.getProfile.mockRejectedValueOnce(new ApiError(404, 'USER_NOT_FOUND', 'No existe'))
    renderProfile()
    expect(await screen.findByRole('alert')).toHaveTextContent('No se encontro tu perfil')
    fireEvent.click(screen.getByRole('button', { name: 'Sincronizar perfil' }))
    expect(mocks.retrySync).toHaveBeenCalledOnce()
  })

  it('descarta cambios sin escribir al servidor', async () => {
    renderProfile()
    const input = await screen.findByLabelText('Nombre visible (opcional)')
    fireEvent.change(input, { target: { value: 'Otro nombre' } })
    fireEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }))
    expect(input).toHaveValue('Demo')
    expect(mocks.updateProfile).not.toHaveBeenCalled()
  })

  it('cancela la consulta al salir de la pantalla', async () => {
    mocks.getProfile.mockReturnValueOnce(new Promise(() => undefined))
    const view = renderProfile()
    const signal = mocks.getProfile.mock.calls[0][0] as AbortSignal
    await act(async () => view.unmount())
    expect(signal.aborted).toBe(true)
  })
})