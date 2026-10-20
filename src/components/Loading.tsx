import { LoaderCircle } from 'lucide-react'

export function Loading() {
  return <div className="loading" role="status"><LoaderCircle className="spinner" aria-hidden="true" /> Cargando...</div>
}