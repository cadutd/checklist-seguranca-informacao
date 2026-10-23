import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProvedorDiagnosticos } from '../src/contexts/Diagnosticos'
import { Painel } from '../src/pages/Painel'
import { Checklist } from '../src/pages/Checklist'
import { criarRepositorioMemoria } from '../src/services/memoria'
import { criarRepositorioSupabase } from '../src/services/diagnosticos'
import { obterConfiguracao } from '../src/services/supabase'
import { registrosDemonstrativos } from '../src/data/diagnosticos'
import { registroParaBanco } from '../supabase/functions/_shared/contratos.ts'

vi.mock('recharts', async importar => {
  const original = await importar<typeof import('recharts')>()
  const { cloneElement } = await import('react')
  return { ...original, ResponsiveContainer: ({ children }: { children: React.ReactElement }) => cloneElement(children, { width: 800, height: 300 } as object) }
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals() })
describe('Conexão e atualização do painel', () => {
  it('mostra carregamento e estado vazio ao consultar uma base sem diagnósticos', async () => {
    let resolver: (valor: []) => void = () => {}
    const listar = vi.fn(() => new Promise<[]>((resolucao) => { resolver = resolucao }))
    const repositorio = { ...criarRepositorioMemoria([]), modo: 'supabase' as const, listar }
    render(<ProvedorDiagnosticos repositorio={repositorio}><MemoryRouter><Painel/></MemoryRouter></ProvedorDiagnosticos>)
    expect(screen.getByRole('status')).toHaveTextContent('Carregando diagnósticos')
    await act(async () => { resolver([]) })
    expect(screen.getByRole('heading', { name: 'Nenhum diagnóstico encontrado' })).toBeInTheDocument()
  })
  it('consulta a cada 15 segundos e não sobrepõe requisições pendentes', async () => {
    vi.useFakeTimers()
    const dados = criarRepositorioMemoria().iniciais!
    let resolver: (valor: typeof dados) => void = () => {}
    const listar = vi.fn(() => new Promise<typeof dados>(resolucao => { resolver = resolucao }))
    const repositorio = { ...criarRepositorioMemoria(), listar }
    const tela = render(<ProvedorDiagnosticos repositorio={repositorio}><MemoryRouter><Painel/></MemoryRouter></ProvedorDiagnosticos>)
    expect(listar).toHaveBeenCalledTimes(1)
    await act(async () => { vi.advanceTimersByTime(30000) })
    expect(listar).toHaveBeenCalledTimes(1)
    await act(async () => { resolver([]) })
    expect(screen.getByRole('heading', { name: 'Nenhum diagnóstico encontrado' })).toBeInTheDocument()
    await act(async () => { vi.advanceTimersByTime(15000) })
    expect(listar).toHaveBeenCalledTimes(2)
    await act(async () => { resolver(dados) })
    expect(screen.getByRole('button', { name: 'Arquivo Raízes do Bairro' })).toBeInTheDocument()
    tela.unmount()
    await act(async () => { vi.advanceTimersByTime(30000) })
    expect(listar).toHaveBeenCalledTimes(2)
  })
  it('preserva os últimos resultados quando a consulta falha', async () => {
    const repositorio = { ...criarRepositorioMemoria(), listar: vi.fn().mockRejectedValue(new Error('Consulta indisponível')) }
    render(<ProvedorDiagnosticos repositorio={repositorio}><MemoryRouter><Painel/></MemoryRouter></ProvedorDiagnosticos>)
    expect(await screen.findByRole('alert')).toHaveTextContent('Consulta indisponível')
    expect(screen.getByRole('button', { name: 'Arquivo Raízes do Bairro' })).toBeInTheDocument()
  })
  it('erro de envio preserva nome e respostas e permite repetir com o mesmo identificador', async () => {
    const enviar = vi.fn().mockRejectedValue(new Error('Falha de rede'))
    const repositorio = { ...criarRepositorioMemoria(), modo: 'supabase' as const, enviar }
    render(<ProvedorDiagnosticos repositorio={repositorio}><MemoryRouter><Checklist/></MemoryRouter></ProvedorDiagnosticos>)
    fireEvent.change(screen.getByLabelText(/Nome da instituição/), { target: { value: 'Arquivo de teste' } })
    for (const grupo of screen.getAllByRole('group')) fireEvent.click(within(grupo).getByLabelText('Sim'))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar diagnóstico' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha de rede')
    expect(screen.getByLabelText(/Nome da instituição/)).toHaveValue('Arquivo de teste')
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(20)
    fireEvent.click(screen.getByRole('button', { name: 'Enviar diagnóstico' }))
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(2))
    expect(enviar.mock.calls[0][0].idEnvio).toBe(enviar.mock.calls[1][0].idEnvio)
  })
  it('usa o endpoint seguro sem mandar notas e não consulta a tabela completa', async () => {
    const resumo = registroParaBanco(registrosDemonstrativos[0])
    const buscar = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([resumo]))).mockResolvedValueOnce(new Response(JSON.stringify({ diagnostico: resumo })))
    vi.stubGlobal('fetch', buscar)
    const repositorio = criarRepositorioSupabase({ url: 'https://exemplo.supabase.co', chave: 'sb_publishable_teste' })
    expect(await repositorio.listar()).toHaveLength(1)
    const envio = { instituicao: 'Arquivo', respostas: registrosDemonstrativos[0].respostas, versaoQuestionario: 1, idEnvio: crypto.randomUUID() }
    await repositorio.enviar(envio)
    expect(buscar.mock.calls[0][0]).toContain('/rpc/listar_resultados')
    expect(buscar.mock.calls[1][0]).toContain('/functions/v1/enviar-diagnostico')
    expect(JSON.parse(buscar.mock.calls[1][1].body)).toEqual(envio)
    expect(JSON.parse(buscar.mock.calls[1][1].body)).not.toHaveProperty('nota_total')
  })
  it('recusa chaves administrativas e configuração parcial em variáveis públicas', () => {
    vi.stubEnv('VITE_MODO_DEMONSTRACAO', 'false')
    vi.stubEnv('VITE_SUPABASE_URL', 'https://exemplo.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    expect(() => obterConfiguracao()).toThrow('URL e a chave pública')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'sb_secret_nao_expor')
    expect(() => obterConfiguracao()).toThrow('chave pública')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiJ9.' + btoa(JSON.stringify({ role: 'service_role' })) + '.assinatura')
    expect(() => obterConfiguracao()).toThrow('chave pública')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'sb_publishable_teste')
    expect(obterConfiguracao()?.chave).toBe('sb_publishable_teste')
  })
})

it('uma consulta antiga não repõe os dados após a limpeza confirmada', async () => {
  const memoria = criarRepositorioMemoria()
  const antigos = memoria.iniciais!
  let resolver: (valor: typeof antigos) => void = () => {}
  const listar = vi.fn().mockImplementationOnce(() => new Promise<typeof antigos>(resolucao => { resolver = resolucao })).mockResolvedValue([])
  const repositorio = { ...memoria, listar }
  render(<ProvedorDiagnosticos repositorio={repositorio}><MemoryRouter><Painel/></MemoryRouter></ProvedorDiagnosticos>)
  fireEvent.click(screen.getByRole('button', { name: 'Limpar base de dados' }))
  fireEvent.change(screen.getByLabelText('Digite EXCLUIR TUDO para confirmar'), { target: { value: 'EXCLUIR TUDO' } })
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão de todos os dados' }))
  await act(async () => { await Promise.resolve() })
  await act(async () => { resolver(antigos) })
  expect(await screen.findByRole('heading', { name: 'Nenhum diagnóstico encontrado' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Arquivo Raízes do Bairro' })).not.toBeInTheDocument()
  expect(listar).toHaveBeenCalledTimes(2)
})

it('apresenta falha de conexão em português sem trocar a base real por dados simulados', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  const repositorio = criarRepositorioSupabase({ url: 'https://exemplo.supabase.co', chave: 'sb_publishable_teste' })
  await expect(repositorio.listar()).rejects.toThrow('Não foi possível conectar ao Supabase')
  expect(repositorio.modo).toBe('supabase')
})



it('exporta com JWT público sem enviar chave administrativa', async () => {
  const buscar = vi.fn().mockResolvedValue(new Response(JSON.stringify({ formato: 'checklist-seguranca-informacao', versao: 1, exportadoEm: '2026-10-22T12:00:00.000Z', diagnosticos: [] })))
  vi.stubGlobal('fetch', buscar)
  const chavePublica = 'eyJhbGciOiJIUzI1NiJ9.' + btoa(JSON.stringify({ role: 'anon' })) + '.assinatura'
  const repositorio = criarRepositorioSupabase({ url: 'https://exemplo.supabase.co', chave: chavePublica })
  await repositorio.exportar()
  expect(buscar.mock.calls[0][1].headers.Authorization).toBe('Bearer ' + chavePublica)
  expect(buscar.mock.calls[0][1].headers['x-admin-key']).toBeUndefined()
  expect(buscar.mock.calls[0][1].body).not.toContain('chave-administrativa-de-teste')
})

it('envia a limpeza sem chave administrativa e com confirmação explícita', async () => {
  const buscar = vi.fn().mockResolvedValue(new Response(JSON.stringify({ excluidos: 3 })))
  vi.stubGlobal('fetch', buscar)
  const repositorio = criarRepositorioSupabase({ url: 'https://exemplo.supabase.co', chave: 'eyJ.publica.assinatura' })
  expect(await repositorio.limpar('EXCLUIR TUDO')).toEqual({ excluidos: 3 })
  expect(buscar.mock.calls[0][1].headers['x-admin-key']).toBeUndefined()
  expect(JSON.parse(buscar.mock.calls[0][1].body)).toEqual({ acao: 'limpar', confirmacao: 'EXCLUIR TUDO' })
})

it('importa sem enviar chave administrativa', async () => {
  const buscar = vi.fn().mockResolvedValue(new Response(JSON.stringify({ importados: 0, ignorados: 0 })))
  vi.stubGlobal('fetch', buscar)
  const repositorio = criarRepositorioSupabase({ url: 'https://exemplo.supabase.co', chave: 'eyJ.publica.assinatura' })
  const backup = { formato: 'checklist-seguranca-informacao' as const, versao: 1 as const, exportadoEm: '2026-10-22T12:00:00.000Z', diagnosticos: [] }
  expect(await repositorio.importar(backup)).toEqual({ importados: 0, ignorados: 0 })
  expect(buscar.mock.calls[0][1].headers['x-admin-key']).toBeUndefined()
  expect(JSON.parse(buscar.mock.calls[0][1].body)).toEqual({ acao: 'importar', backup })
})
