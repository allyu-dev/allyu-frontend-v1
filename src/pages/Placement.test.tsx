import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { ApiError } from '../api/client'
import type { Role } from '../api/catalog'
import type { PlacementResult } from '../api/placement'
import { PlacementProvider } from '../placement/PlacementProvider'
import { Roles } from './Roles'
import { Test } from './Test'
import { Result } from './Result'

const mocks = vi.hoisted(() => ({ getRoles: vi.fn(), getQuestions: vi.fn(), evaluate: vi.fn() }))
vi.mock('../api', () => ({
  catalogApi: { getRoles: mocks.getRoles },
  placementApi: { getQuestions: mocks.getQuestions, evaluate: mocks.evaluate },
}))

const roles: Role[] = [
  { id: 'software-engineer', name: 'Software Engineer', description: 'Software', iconKey: 'code', isActive: true, order: 1 },
  { id: 'devops-engineer', name: 'DevOps Engineer', description: 'Operaciones', iconKey: 'cloud', isActive: true, order: 2 },
]
const questions = Array.from({ length: 12 }, (_, index) => ({
  id: `q${index + 1}`, prompt: `Pregunta de prueba ${index + 1}`,
  options: [{ id: 'a', text: 'Opcion A' }, { id: 'b', text: 'Opcion B' }],
}))
const result: PlacementResult = { roleId: 'software-engineer', englishLevel: 'A2', correctAnswers: 5, totalQuestions: 12 }

function renderFlow(path = '/roles') {
  render(<MemoryRouter initialEntries={[path]}><PlacementProvider>
    <nav><Link to="/perfil">Perfil</Link><Link to="/roles">Roles</Link></nav>
    <Routes>
      <Route path="/roles" element={<Roles />} />
      <Route path="/test" element={<Test />} />
      <Route path="/resultado" element={<Result />} />
      <Route path="/perfil" element={<h1>Perfil de prueba</h1>} />
    </Routes>
  </PlacementProvider></MemoryRouter>)
}

async function chooseRole(name = /Software Engineer/) {
  fireEvent.click(await screen.findByRole('radio', { name }))
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
}

async function answerAll() {
  await screen.findByRole('group', { name: 'Pregunta de prueba 1' })
  for (let index = 0; index < 12; index++) {
    fireEvent.click(screen.getByRole('radio', { name: 'Opcion A' }))
    if (index < 11) fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  }
}

describe('flujo de roles y placement', () => {
  beforeEach(() => {
    mocks.getRoles.mockReset().mockResolvedValue(roles)
    mocks.getQuestions.mockReset().mockResolvedValue(questions)
    mocks.evaluate.mockReset().mockResolvedValue(result)
  })

  it('muestra catalogo vacio sin inventar roles', async () => {
    mocks.getRoles.mockResolvedValueOnce([])
    renderFlow()
    expect(await screen.findByText('No hay roles disponibles.')).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(mocks.getQuestions).not.toHaveBeenCalled()
  })

  it('muestra un 403 del catalogo y permite reintentar', async () => {
    mocks.getRoles.mockRejectedValueOnce(new ApiError(403, 'FORBIDDEN', 'Denegado'))
    renderFlow()
    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes permiso')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('radio', { name: /Software Engineer/ })).toBeInTheDocument()
  })

  it('conserva respuestas al retroceder y muestra el resultado del servidor', async () => {
    renderFlow()
    await chooseRole()
    await screen.findByRole('group', { name: 'Pregunta de prueba 1' })
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    fireEvent.click(screen.getByRole('radio', { name: 'Opcion A' }))
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Opcion B' }))
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(screen.getByRole('radio', { name: 'Opcion A' })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByRole('radio', { name: 'Opcion B' })).toBeChecked()
    for (let index = 1; index < 12; index++) {
      if (index > 1) fireEvent.click(screen.getByRole('radio', { name: 'Opcion A' }))
      if (index < 11) fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    }
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '12')
    fireEvent.click(screen.getByRole('button', { name: 'Evaluar' }))
    expect(await screen.findByText('A2', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('5 de 12')).toBeInTheDocument()
    expect(mocks.evaluate).toHaveBeenCalledWith('software-engineer', questions.map((question, index) => ({
      questionId: question.id, optionId: index === 1 ? 'b' : 'a',
    })))
    fireEvent.click(screen.getByRole('button', { name: 'Repetir evaluacion' }))
    expect(await screen.findByRole('group', { name: 'Pregunta de prueba 1' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Opcion A' })).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  })

  it('no pierde el borrador al visitar el perfil y volver al mismo rol', async () => {
    renderFlow()
    await chooseRole()
    await screen.findByRole('group', { name: 'Pregunta de prueba 1' })
    fireEvent.click(screen.getByRole('radio', { name: 'Opcion B' }))
    fireEvent.click(screen.getByRole('link', { name: 'Perfil' }))
    expect(screen.getByRole('heading', { name: 'Perfil de prueba' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Roles' }))
    await screen.findByRole('radio', { name: /Software Engineer/ })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByRole('group', { name: 'Pregunta de prueba 1' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Opcion B' })).toBeChecked()
    expect(mocks.getQuestions).toHaveBeenCalledOnce()
  })

  it('reinicia las respuestas si se elige otro rol', async () => {
    renderFlow()
    await chooseRole()
    await screen.findByRole('group', { name: 'Pregunta de prueba 1' })
    fireEvent.click(screen.getByRole('radio', { name: 'Opcion A' }))
    fireEvent.click(screen.getByRole('link', { name: 'Cambiar rol' }))
    await chooseRole(/DevOps Engineer/)
    await screen.findByRole('group', { name: 'Pregunta de prueba 1' })
    expect(screen.getByRole('radio', { name: 'Opcion A' })).not.toBeChecked()
  })

  it('rechaza un banco incompleto en lugar de inventar preguntas', async () => {
    mocks.getQuestions.mockResolvedValueOnce(questions.slice(0, 11))
    renderFlow()
    await chooseRole()
    expect(await screen.findByRole('alert')).toHaveTextContent('12 preguntas validas')
    expect(screen.queryByRole('button', { name: 'Evaluar' })).not.toBeInTheDocument()
  })

  it('conserva las respuestas despues de un 500 y permite reenviar', async () => {
    mocks.evaluate.mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'Error'))
    renderFlow()
    await chooseRole()
    await answerAll()
    fireEvent.click(screen.getByRole('button', { name: 'Evaluar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('servidor no esta disponible')
    expect(screen.getByRole('radio', { name: 'Opcion A' })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Evaluar' }))
    expect(await screen.findByText('A2', { exact: true })).toBeInTheDocument()
    expect(mocks.evaluate).toHaveBeenCalledTimes(2)
  })

  it('bloquea envios duplicados mientras el servidor evalua', async () => {
    let resolveResult!: (value: PlacementResult) => void
    mocks.evaluate.mockReturnValueOnce(new Promise(resolve => { resolveResult = resolve }))
    renderFlow()
    await chooseRole()
    await answerAll()
    fireEvent.click(screen.getByRole('button', { name: 'Evaluar' }))
    const pending = screen.getByRole('button', { name: 'Evaluando...' })
    expect(pending).toBeDisabled()
    fireEvent.click(pending)
    expect(mocks.evaluate).toHaveBeenCalledOnce()
    await act(async () => resolveResult(result))
    expect(await screen.findByText('A2', { exact: true })).toBeInTheDocument()
  })

  it.each(['/test', '/resultado'])('redirige %s sin un borrador valido', async path => {
    renderFlow(path)
    expect(await screen.findByRole('heading', { name: 'Elige tu rol' })).toBeInTheDocument()
    expect(mocks.getQuestions).not.toHaveBeenCalled()
    expect(mocks.evaluate).not.toHaveBeenCalled()
  })
})