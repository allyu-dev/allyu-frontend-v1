import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from './client'
import { createCatalogApi } from './catalog'
import { createPlacementApi } from './placement'

function setup() {
  const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json([]))
  const request = createApiClient({
    baseUrl: '',
    getUser: () => ({ getIdToken: async () => 'fixture-only' }),
    onUnauthorized: async () => undefined,
    transport,
  })
  return { catalog: createCatalogApi(request), placement: createPlacementApi(request), transport }
}

describe('catalogo y placement', () => {
  it('consulta roles y propaga la cancelacion', async () => {
    const { catalog, transport } = setup()
    const controller = new AbortController()
    await catalog.getRoles(controller.signal)
    expect(transport).toHaveBeenCalledWith('/api/v1/roles', expect.objectContaining({ signal: controller.signal }))
  })

  it('consulta las preguntas sin enviar un body', async () => {
    const { placement, transport } = setup()
    await placement.getQuestions()
    expect(transport.mock.calls[0][0]).toBe('/api/v1/placement/questions')
    expect(transport.mock.calls[0][1]?.body).toBeUndefined()
  })

  it('envia rol y respuestas sin identidad ni nivel calculado por el cliente', async () => {
    const { placement, transport } = setup()
    const answers = Array.from({ length: 12 }, (_, index) => ({ questionId: `q${index + 1}`, optionId: 'a' }))
    await placement.evaluate('software-engineer', answers)
    expect(transport).toHaveBeenCalledWith('/api/v1/placement/evaluate', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ roleId: 'software-engineer', answers }),
    }))
  })
})