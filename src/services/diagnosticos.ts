import type { Diagnostico, NotasDimensoes } from '../types/diagnostico'
import { classificarNota } from '../utils/classificacao'
import { dimensoes } from '../data/perguntas'
import { objeto, validarUuid, normalizarNome, validarBackup } from '../../supabase/functions/_shared/contratos.ts'
import { obterConfiguracao, requisitar, type ConfiguracaoSupabase } from './supabase'
import { criarRepositorioMemoria } from './memoria'
import type { RepositorioDiagnosticos } from './repositorio'

export function converterResultado(entrada: unknown): Diagnostico {
  const d = objeto(entrada)
  function numero(valor: unknown, maximo: number) {
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0 || valor > maximo) throw new Error('O serviço retornou uma nota ou contagem inválida.')
    return valor
  }
  const notas = objeto(d.notas_dimensoes)
  const notasDimensoes = Object.fromEntries(dimensoes.map(d => [d.id, numero(notas[d.id], 100)])) as NotasDimensoes
  const nota = numero(d.nota_total, 100)
  if (typeof d.criado_em !== 'string' || !Number.isFinite(Date.parse(d.criado_em)) || d.versao_questionario !== 1) throw new Error('O serviço retornou um diagnóstico inválido.')
  const quantidadeNaoSei = numero(d.quantidade_nao_sei, 20)
  if (!Number.isInteger(quantidadeNaoSei)) throw new Error('Contagem de respostas desconhecidas inválida.')
  return { id: validarUuid(d.id), instituicao: normalizarNome(d.instituicao), nota, dimensoes: notasDimensoes, quantidadeNaoSei, versaoQuestionario: 1, data: d.criado_em, classificacao: classificarNota(nota) }
}
export function criarRepositorioSupabase(configuracao: ConfiguracaoSupabase): RepositorioDiagnosticos {
  const administrar = (corpo: unknown, chave: string) => {
    if (!chave.trim()) throw new Error('Informe a chave administrativa.')
    if (!configuracao.chave.startsWith('eyJ')) throw new Error('A administração desta publicação exige a chave pública anon (JWT) na configuração do Supabase.')
    return requisitar(configuracao, '/functions/v1/administrar-diagnosticos', corpo, chave)
  }
  return {
    modo: 'supabase',
    async listar() {
      const dados = await requisitar(configuracao, '/rest/v1/rpc/listar_resultados', {})
      if (!Array.isArray(dados)) throw new Error('O serviço retornou uma lista inválida.')
      return dados.map(converterResultado)
    },
    async enviar(envio) {
      const dados = objeto(await requisitar(configuracao, '/functions/v1/enviar-diagnostico', envio))
      return converterResultado(dados.diagnostico)
    },
    async exportar(chave) { return validarBackup(await administrar({ acao: 'exportar' }, chave)) },
    async importar(backup, chave) {
      const dados = objeto(await administrar({ acao: 'importar', backup: validarBackup(backup) }, chave))
      if (!Number.isInteger(dados.importados) || !Number.isInteger(dados.ignorados)) throw new Error('Resposta de importação inválida.')
      return { importados: dados.importados as number, ignorados: dados.ignorados as number }
    },
    async limpar(confirmacao) {
      const dados = objeto(await requisitar(configuracao, '/functions/v1/administrar-diagnosticos', { acao: 'limpar', confirmacao }))
      if (!Number.isInteger(dados.excluidos)) throw new Error('Resposta de exclusão inválida.')
      return { excluidos: dados.excluidos as number }
    },
  }
}
export function criarRepositorio(): RepositorioDiagnosticos {
  try {
    const configuracao = obterConfiguracao()
    return configuracao ? criarRepositorioSupabase(configuracao) : criarRepositorioMemoria()
  } catch (erro) {
    const falhar = async (): Promise<never> => { throw erro }
    return { modo: 'supabase', listar: falhar, enviar: falhar, exportar: falhar, importar: falhar, limpar: falhar }
  }
}

