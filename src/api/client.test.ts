import { describe, expect, it, vi } from 'vitest'
import { ApiError, createApiClient } from './client'

function setup(responses: Response[]) {
  const getIdToken = vi.fn(async (refresh?: boolean) => refresh ? 'fresh' : 'initial')
  const onUnauthorized = vi.fn(async () => undefined)
  const transport = vi.fn<typeof fetch>()
  for (const response of responses) transport.mockResolvedValueOnce(response)
  const request = createApiClient({ baseUrl: '', getUser: () => ({ getIdToken }), onUnauthorized, transport })
  return { request, getIdToken, onUnauthorized, transport }
}

describe('cliente autenticado', () => {
  it('sincroniza con body vacio y Bearer sin cookies', async () => {
    const { request, transport } = setup([Response.json({ id: 'uid' })])
    await request('/api/v1/users/sync', { method: 'POST', body: '{}' })
    const [path, init] = transport.mock.calls[0]
    expect(path).toBe('/api/v1/users/sync')
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer initial')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(init?.body).toBe('{}')
    expect(init?.credentials).toBe('omit')
  })

  it('reintenta solo una vez con getIdToken(true) tras 401', async () => {
    const { request, getIdToken, onUnauthorized, transport } = setup([
      new Response(null, { status: 401 }), Response.json({ id: 'uid' }),
    ])
    await expect(request('/api/v1/users/me')).resolves.toEqual({ id: 'uid' })
    expect(getIdToken.mock.calls).toEqual([[false], [true]])
    expect(new Headers(transport.mock.calls[1][1]?.headers).get('Authorization')).toBe('Bearer fresh')
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('cierra sesion si el segundo intento devuelve 401', async () => {
    const { request, transport, onUnauthorized } = setup([
      new Response(null, { status: 401 }), new Response(null, { status: 401 }),
    ])
    await expect(request('/api/v1/users/me')).rejects.toMatchObject({ status: 401 })
    expect(transport).toHaveBeenCalledTimes(2)
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('no reintenta otros errores y conserva details', async () => {
    const { request, transport } = setup([Response.json({ error: {
      code: 'VALIDATION_ERROR', message: 'Invalido', details: [{ field: 'body', message: 'Vacio' }],
    } }, { status: 400 })])
    await expect(request('/api/v1/users/sync')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR', details: [{ field: 'body', message: 'Vacio' }],
    })
    expect(transport).toHaveBeenCalledOnce()
  })

  it('distingue una desconexion sin cerrar la sesion', async () => {
    const { request, transport, onUnauthorized } = setup([])
    transport.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(request('/api/v1/users/me')).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('rechaza sin llamar a la API si no hay usuario', async () => {
    const transport = vi.fn<typeof fetch>()
    const request = createApiClient({ baseUrl: '', getUser: () => null, onUnauthorized: async () => undefined, transport })
    await expect(request('/api/v1/users/me')).rejects.toBeInstanceOf(ApiError)
    expect(transport).not.toHaveBeenCalled()
  })

  it.each([403, 404, 500])('conserva el estado HTTP %s sin reintentar ni cerrar sesion', async status => {
    const { request, transport, onUnauthorized } = setup([
      Response.json({ error: { code: 'HTTP_ERROR', message: 'Solicitud rechazada' } }, { status }),
    ])
    await expect(request('/api/v1/users/me')).rejects.toMatchObject({ status })
    expect(transport).toHaveBeenCalledOnce()
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('cierra sesion si falla la renovacion del token tras un 401', async () => {
    const { request, getIdToken, transport, onUnauthorized } = setup([new Response(null, { status: 401 })])
    getIdToken.mockResolvedValueOnce('initial').mockRejectedValueOnce(new Error('Token no disponible'))
    await expect(request('/api/v1/users/me')).rejects.toMatchObject({ status: 401 })
    expect(transport).toHaveBeenCalledOnce()
    expect(getIdToken.mock.calls).toEqual([[false], [true]])
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })
})