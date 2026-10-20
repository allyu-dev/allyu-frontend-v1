import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from './client'
import { createUsersApi } from './users'

function setup(result: unknown) {
  const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json(result))
  const request = createApiClient({
    baseUrl: '',
    getUser: () => ({ getIdToken: async () => 'fixture-token' }),
    onUnauthorized: async () => undefined,
    transport,
  })
  return { api: createUsersApi(request), transport }
}

describe('API de usuarios', () => {
  it('sincroniza con un objeto vacio sin tomar identidad del formulario', async () => {
    const { api, transport } = setup({ id: 'uid' })
    await api.sync()
    expect(transport).toHaveBeenCalledWith('/api/v1/users/sync', expect.objectContaining({ method: 'POST', body: '{}' }))
  })

  it('consulta el perfil y propaga la cancelacion', async () => {
    const { api, transport } = setup({ id: 'uid' })
    const controller = new AbortController()
    await api.getProfile(controller.signal)
    expect(transport).toHaveBeenCalledWith('/api/v1/users/me', expect.objectContaining({ signal: controller.signal }))
  })

  it.each(['Usuario Demo', null])('actualiza solamente displayName (%s)', async displayName => {
    const { api, transport } = setup({ displayName })
    await api.updateProfile(displayName)
    expect(transport).toHaveBeenCalledWith('/api/v1/users/me', expect.objectContaining({
      method: 'PATCH', body: JSON.stringify({ displayName }),
    }))
  })
})