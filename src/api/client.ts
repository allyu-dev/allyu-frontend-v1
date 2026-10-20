interface ErrorDetail {
  field: string
  message: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: ErrorDetail[]

  constructor(status: number, code: string, message: string, details: ErrorDetail[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

interface TokenUser {
  getIdToken(forceRefresh?: boolean): Promise<string>
}

interface ClientOptions {
  baseUrl: string
  getUser: () => TokenUser | null
  onUnauthorized: () => Promise<void>
  transport?: typeof fetch
}

export function createApiClient(options: ClientOptions) {
  async function unauthorized(): Promise<never> {
    await options.onUnauthorized()
    throw new ApiError(401, 'UNAUTHORIZED', 'Tu sesion ha expirado. Inicia sesion nuevamente.')
  }

  return async function request<Result>(path: string, init: RequestInit = {}): Promise<Result> {
    const transport = options.transport ?? fetch
    const user = options.getUser()
    if (!user) return unauthorized()

    for (const forceRefresh of [false, true]) {
      let token: string
      try {
        token = await user.getIdToken(forceRefresh)
      } catch {
        return unauthorized()
      }

      const headers = new Headers(init.headers)
      headers.set('Authorization', `Bearer ${token}`)
      if (init.body !== undefined) headers.set('Content-Type', 'application/json')

      let response: Response
      try {
        response = await transport(`${options.baseUrl}${path}`, {
          ...init, headers, credentials: 'omit',
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error
        throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor. Revisa tu conexion.')
      }

      if (response.status === 401) {
        if (forceRefresh) return unauthorized()
        continue
      }

      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const body = payload as { error?: { code?: string; message?: string; details?: ErrorDetail[] } } | null
        throw new ApiError(
          response.status,
          body?.error?.code ?? 'HTTP_ERROR',
          body?.error?.message ?? 'No se pudo completar la solicitud.',
          body?.error?.details,
        )
      }
      if (payload === null) {
        throw new ApiError(502, 'INVALID_RESPONSE', 'El servidor devolvio una respuesta no valida.')
      }
      return payload as Result
    }
    return unauthorized()
  }
}

export type ApiRequest = ReturnType<typeof createApiClient>