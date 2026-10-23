import { describe, expect, it } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Checklist } from '../src/pages/Checklist'
import { ProvedorDiagnosticos } from '../src/contexts/Diagnosticos'
function montar() {
  render(<ProvedorDiagnosticos><MemoryRouter initialEntries={['/checklist']}><Routes><Route path="/checklist" element={<Checklist/>}/><Route path="/" element={<p>Painel demonstrativo</p>}/></Routes></MemoryRouter></ProvedorDiagnosticos>)
}
describe('Interface do checklist', () => {
  it('apresenta vinte grupos acessíveis e quatro alternativas por pergunta', () => {
    montar()
    expect(screen.getAllByRole('group')).toHaveLength(20)
    for (const grupo of screen.getAllByRole('group')) expect(within(grupo).getAllByRole('radio')).toHaveLength(4)
  })
  it('indica erros e preserva as respostas já preenchidas', async () => {
    montar()
    fireEvent.change(screen.getByLabelText(/Nome da instituição/), { target: { value: 'Arquivo fictício' } })
    const sim = within(screen.getAllByRole('group')[0]).getByLabelText('Sim')
    fireEvent.click(sim)
    fireEvent.click(screen.getByRole('button', { name: 'Enviar diagnóstico' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Revise os campos')
    expect(sim).toBeChecked()
    expect(screen.getByLabelText(/Nome da instituição/)).toHaveValue('Arquivo fictício')
  })
  it('bloqueia envio durante a simulação e retorna ao painel', async () => {
    montar()
    fireEvent.change(screen.getByLabelText(/Nome da instituição/), { target: { value: 'Arquivo fictício' } })
    for (const grupo of screen.getAllByRole('group')) fireEvent.click(within(grupo).getByLabelText('Não sei'))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar diagnóstico' }))
    expect(screen.getByRole('button', { name: 'Validando demonstração…' })).toBeDisabled()
    await waitFor(() => expect(screen.getByText('Painel demonstrativo')).toBeInTheDocument())
  })
})


it('permite corrigir um erro sem alterar a rota ou perder o preenchimento', async () => {
  montar()
  fireEvent.change(screen.getByLabelText(/Nome da instituição/), { target: { value: 'Arquivo fictício' } })
  fireEvent.click(screen.getByRole('button', { name: 'Enviar diagnóstico' }))
  const alerta = await screen.findByRole('alert')
  fireEvent.click(within(alerta).getByRole('button', { name: /COMP01:/ }))
  expect(within(screen.getAllByRole('group')[0]).getByLabelText('Sim')).toHaveFocus()
  expect(screen.getByLabelText(/Nome da instituição/)).toHaveValue('Arquivo fictício')
  expect(screen.getAllByRole('group')).toHaveLength(20)
})
