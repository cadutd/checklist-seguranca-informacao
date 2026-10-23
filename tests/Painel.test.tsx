import { describe, expect, it, vi } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProvedorDiagnosticos } from '../src/contexts/Diagnosticos'
import { Painel } from '../src/pages/Painel'
import { Checklist } from '../src/pages/Checklist'

// Apenas o tamanho do contêiner é substituído: os gráficos reais renderizam SVG.
vi.mock('recharts', async importar => {
  const original = await importar<typeof import('recharts')>()
  const { cloneElement } = await import('react')
  return { ...original, ResponsiveContainer: ({ children }: { children: React.ReactElement }) => cloneElement(children, { width: 800, height: 300 } as object) }
})
function montar(caminho = '/') {
  render(<ProvedorDiagnosticos><MemoryRouter initialEntries={[caminho]}><Routes><Route path="/" element={<Painel/>}/><Route path="/checklist" element={<Checklist/>}/></Routes></MemoryRouter></ProvedorDiagnosticos>)
}
function detalhe() { return screen.getByRole('region', { name: /Arquivo|Memória|Acervo|Centro/ }) }
describe('Detalhamento na própria página inicial', () => {
  it('abre pela tabela, mostra apenas o resumo e devolve o foco ao fechar', async () => {
    montar()
    const usuario = userEvent.setup()
    const abrir = screen.getByRole('button', { name: 'Arquivo Raízes do Bairro' })
    await usuario.click(abrir)
    const painel = detalhe()
    expect(within(painel).getByRole('heading', { name: 'Arquivo Raízes do Bairro' })).toHaveFocus()
    expect(within(painel).getByText('Avançado')).toBeInTheDocument()
    expect(within(painel).getByText('85')).toBeInTheDocument()
    expect(within(painel).getByText('3 de 20')).toBeInTheDocument()
    expect(within(painel).getByRole('heading', { name: 'Pontos fortes' })).toBeInTheDocument()
    expect(within(painel).getByRole('heading', { name: 'Dimensões que precisam de melhoria' })).toBeInTheDocument()
    expect(within(painel).queryByRole('radio')).not.toBeInTheDocument()
    await usuario.click(within(painel).getByRole('button', { name: 'Fechar detalhe' }))
    expect(screen.queryByRole('heading', { name: 'Arquivo Raízes do Bairro' })).not.toBeInTheDocument()
    expect(abrir).toHaveFocus()
  })
  it('permite selecionar barras por clique e teclado e alternar instituições', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: /Ver diagnóstico de Memória da Vila:/ }))
    expect(within(detalhe()).getByRole('heading', { name: 'Memória da Vila' })).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('button', { name: /Ver diagnóstico de Arquivo Raízes do Bairro:/ }), { key: 'Enter' })
    expect(within(detalhe()).getByText('Avançado')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('button', { name: /Ver diagnóstico de Arquivo Caminhos do Rio:/ }), { key: ' ' })
    expect(within(detalhe()).getByText('Inicial')).toBeInTheDocument()
  })
  it('ordena a tabela por nome e nota sem perder a seleção', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Memória da Vila' }))
    fireEvent.click(screen.getByRole('button', { name: 'Instituição ↕' }))
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Acervo Vozes da Comunidade')
    fireEvent.click(screen.getByRole('button', { name: 'Nota final ↕' }))
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Arquivo Caminhos do Rio')
    expect(within(detalhe()).getByRole('heading', { name: 'Memória da Vila' })).toBeInTheDocument()
  })
  it('calcula uma prévia e atualiza o painel em memória, permitindo nomes repetidos', async () => {
    montar('/checklist')
    fireEvent.change(screen.getByLabelText(/Nome da instituição/), { target: { value: '  Arquivo   Raízes do Bairro  ' } })
    for (const grupo of screen.getAllByRole('group')) fireEvent.click(within(grupo).getByLabelText('Parcialmente'))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar diagnóstico' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Prévia calculada'))
    expect(screen.getAllByRole('row')).toHaveLength(7)
    expect(within(detalhe()).getByText('Em desenvolvimento')).toBeInTheDocument()
    expect(within(detalhe()).getByText('0 de 20')).toBeInTheDocument()
    expect(within(detalhe()).getByText('Nenhuma dimensão atingiu 80 pontos. Comece com pequenas ações de proteção.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Arquivo Raízes do Bairro' })).toHaveLength(2)
    expect(screen.getByLabelText('Indicadores dos diagnósticos')).toHaveTextContent('48,33')
    expect(within(detalhe()).getByRole('heading', { name: 'Arquivo Raízes do Bairro' })).toBeInTheDocument()
  })
})


