import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import type { Diagnostico } from '../types/diagnostico'
import { criarRepositorio } from '../services/diagnosticos'
import type { Backup, Envio, RepositorioDiagnosticos, ResultadoImportacao } from '../services/repositorio'

interface ContextoDiagnosticos {
  diagnosticos: Diagnostico[]
  modo: RepositorioDiagnosticos['modo']
  carregando: boolean
  erro: string
  atualizar: () => Promise<void>
  enviarDiagnostico: (envio: Envio) => Promise<Diagnostico>
  exportar: (chave: string) => Promise<Backup>
  importar: (backup: Backup, chave: string) => Promise<ResultadoImportacao>
  limpar: (confirmacao: string, chave: string) => Promise<{ excluidos: number }>
}
const Contexto = createContext<ContextoDiagnosticos | null>(null)
export function ProvedorDiagnosticos({ children, repositorio: fornecido }: { children: ReactNode; repositorio?: RepositorioDiagnosticos }) {
  const [repositorio] = useState(() => fornecido ?? criarRepositorio())
  const [diagnosticos, definirDiagnosticos] = useState(repositorio.iniciais ?? [])
  const [carregando, definirCarregando] = useState(repositorio.modo === 'supabase')
  const [erro, definirErro] = useState('')
  const geracao = useRef(0)
  const consulta = useRef<Promise<void> | null>(null)
  const atualizar = useCallback((): Promise<void> => {
    if (consulta.current) return consulta.current
    const versao = geracao.current
    definirCarregando(true)
    const tarefa = (async () => {
      try {
        const dados = await repositorio.listar()
        if (versao === geracao.current) { definirDiagnosticos(dados); definirErro('') }
      } catch (erro) {
        if (versao === geracao.current) definirErro(erro instanceof Error ? erro.message : 'Não foi possível consultar os diagnósticos.')
      } finally { definirCarregando(false); consulta.current = null }
    })()
    consulta.current = tarefa
    return tarefa
  }, [repositorio])
  async function sincronizar() { geracao.current++; await consulta.current; await atualizar() }
  async function enviarDiagnostico(envio: Envio) {
    const diagnostico = await repositorio.enviar(envio)
    geracao.current++
    definirDiagnosticos(atuais => [diagnostico, ...atuais.filter(d => d.id !== diagnostico.id)])
    return diagnostico
  }
  async function importar(backup: Backup, chave: string) {
    const resultado = await repositorio.importar(backup, chave)
    await sincronizar()
    return resultado
  }
  async function limpar(confirmacao: string, chave: string) {
    const resultado = await repositorio.limpar(confirmacao, chave)
    geracao.current++
    definirDiagnosticos([])
    await consulta.current
    await atualizar()
    return resultado
  }
  return <Contexto.Provider value={{ diagnosticos, modo: repositorio.modo, carregando, erro, atualizar, enviarDiagnostico, exportar: chave => repositorio.exportar(chave), importar, limpar }}>{children}</Contexto.Provider>
}
export function useDiagnosticos() {
  const contexto = useContext(Contexto)
  if (!contexto) throw new Error('O contexto de diagnósticos não foi inicializado.')
  return contexto
}
