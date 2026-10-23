import { describe, expect, it, vi } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProvedorDiagnosticos, useDiagnosticos } from '../src/contexts/Diagnosticos'
import { GerenciarDados } from '../src/components/GerenciarDados'
import { criarRepositorioMemoria } from '../src/services/memoria'
import { criarBackup } from '../supabase/functions/_shared/contratos.ts'
import { registrosDemonstrativos } from '../src/data/diagnosticos'
import { baixarBackup } from '../src/utils/arquivo'

vi.mock('../src/utils/arquivo', async importar => ({ ...await importar<typeof import('../src/utils/arquivo')>(), baixarBackup: vi.fn() }))
function Quantidade() { const { diagnosticos } = useDiagnosticos(); return <p data-testid="quantidade">{diagnosticos.length}</p> }
function montar(repositorio = criarRepositorioMemoria()) {
  render(<ProvedorDiagnosticos repositorio={repositorio}><GerenciarDados/><Quantidade/></ProvedorDiagnosticos>)
}
describe('Botões de dados do sistema', () => {
  it('exporta um JSON de backup com respostas e sem credenciais', async () => {
    montar()
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Exportar JSON' }))
    await usuario.click(screen.getByRole('button', { name: 'Baixar JSON' }))
    await waitFor(() => expect(baixarBackup).toHaveBeenCalled())
    const backup = vi.mocked(baixarBackup).mock.calls.at(-1)![0]
    expect(backup.diagnosticos).toHaveLength(5)
    expect(backup.diagnosticos[0]).toHaveProperty('respostas')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent('Arquivo JSON exportado')
  })
  it('cancelar a limpeza não modifica os dados; confirmação exata é obrigatória', async () => {
    montar()
    const usuario = userEvent.setup()
    const abrir = screen.getByRole('button', { name: 'Limpar base de dados' })
    await usuario.click(abrir)
    expect(screen.getByRole('button', { name: 'Confirmar exclusão de todos os dados' })).toBeDisabled()
    await usuario.type(screen.getByLabelText('Digite EXCLUIR TUDO para confirmar'), 'excluir tudo')
    expect(screen.getByRole('button', { name: 'Confirmar exclusão de todos os dados' })).toBeDisabled()
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByTestId('quantidade')).toHaveTextContent('5')
    expect(abrir).toHaveFocus()
    await usuario.click(abrir)
    await usuario.type(screen.getByLabelText('Digite EXCLUIR TUDO para confirmar'), 'EXCLUIR TUDO')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar exclusão de todos os dados' }))
    expect(await screen.findByRole('status')).toHaveTextContent('5 diagnóstico(s) excluído(s)')
    expect(screen.getByTestId('quantidade')).toHaveTextContent('0')
  })
  it('importa arquivo válido e recusa JSON inválido sem alterar os dados', async () => {
    montar(criarRepositorioMemoria([]))
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Importar JSON' }))
    await usuario.upload(screen.getByLabelText('Arquivo JSON de backup'), new File(['{'], 'invalido.json', { type: 'application/json' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('JSON válido')
    expect(screen.getByRole('button', { name: 'Confirmar importação' })).toBeDisabled()
    expect(screen.getByTestId('quantidade')).toHaveTextContent('0')
    const backup = criarBackup(registrosDemonstrativos)
    await usuario.upload(screen.getByLabelText('Arquivo JSON de backup'), new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' }))
    expect(await screen.findByText('Arquivo válido: 5 diagnóstico(s) para importar.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Confirmar importação' }))
    expect(await screen.findByRole('status')).toHaveTextContent('5 diagnóstico(s) adicionado(s)')
    expect(screen.getByTestId('quantidade')).toHaveTextContent('5')
  })
  it('exige chave na base real, bloqueia duplicidade e preserva o diálogo diante de erro', async () => {
    let rejeitar: (erro: Error) => void = () => {}
    const limpar = vi.fn(() => new Promise<{ excluidos: number }>((_, rejeicao) => { rejeitar = rejeicao }))
    const repositorio = { ...criarRepositorioMemoria(), modo: 'supabase' as const, limpar }
    montar(repositorio)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Limpar base de dados' }))
    await usuario.type(screen.getByLabelText('Digite EXCLUIR TUDO para confirmar'), 'EXCLUIR TUDO')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar exclusão de todos os dados' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe a chave administrativa')
    expect(limpar).not.toHaveBeenCalled()
    await usuario.type(screen.getByLabelText('Chave administrativa'), 'chave-de-teste')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar exclusão de todos os dados' }))
    expect(screen.getByRole('button', { name: 'Processando…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(limpar).toHaveBeenCalledTimes(1)
    rejeitar(new Error('Erro de rede'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro de rede')
    expect(screen.getByTestId('quantidade')).toHaveTextContent('5')
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    await usuario.click(screen.getByRole('button', { name: 'Exportar JSON' }))
    expect(screen.getByLabelText('Chave administrativa')).toHaveValue('')
  })
})
