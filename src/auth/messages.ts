import { ApiError } from '../api/client'

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Tu sesion ha expirado. Inicia sesion nuevamente.'
    if (error.status === 403) return 'No tienes permiso para realizar esta accion.'
    if (error.status === 404) return 'No se encontro el recurso solicitado.'
    if (error.status >= 500) return 'El servidor no esta disponible. Intentalo de nuevo mas tarde.'
    return error.message
  }
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? error.code : ''
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'El correo o la contrasena no son correctos.'
    case 'auth/user-disabled': return 'Esta cuenta esta deshabilitada.'
    case 'auth/too-many-requests': return 'Demasiados intentos. Espera un momento antes de volver a intentar.'
    case 'auth/network-request-failed': return 'No se pudo conectar con Firebase. Revisa tu conexion.'
    case 'auth/invalid-api-key': return 'La configuracion de Firebase no es valida.'
    default: return 'No se pudo completar la operacion. Intentalo nuevamente.'
  }
}