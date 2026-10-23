import { dimensoes, type Resposta } from './perguntas.ts'
import type { Diagnostico } from './tipos.ts'
import { calcularPontuacao, versaoQuestionario } from './pontuacao.ts'

export const limiteArquivo = 5 * 1024 * 1024
export const limiteRegistros = 5000
export interface RegistroBackup {
  id: string
  instituicao: string
  respostas: Record<string, Resposta>
  versaoQuestionario: number
  criadoEm: string
}
export interface Backup {
  formato: 'checklist-seguranca-informacao'
  versao: 1
  exportadoEm: string
  diagnosticos: RegistroBackup[]
}
export interface Envio {
  instituicao: string
  respostas: Record<string, Resposta>
  versaoQuestionario: number
  idEnvio: string
}
export function objeto(valor: unknown): Record<string, unknown> {
  if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) throw new Error('Era esperado um objeto JSON.')
  return valor as Record<string, unknown>
}
export function camposExatos(valor: Record<string, unknown>, campos: string[]) {
  if (Object.keys(valor).length !== campos.length || Object.keys(valor).some(campo => !campos.includes(campo))) {
    throw new Error('O JSON contém campos ausentes ou desconhecidos.')
  }
}
export function normalizarNome(valor: unknown): string {
  if (typeof valor !== 'string') throw new Error('Informe o nome da instituição.')
  const nome = valor.trim().replace(/\s+/g, ' ')
  if (nome.length < 3 || nome.length > 120 || /[\u0000-\u001f\u007f]/.test(nome)) throw new Error('O nome deve ter de 3 a 120 caracteres e não pode conter caracteres de controle.')
  return nome
}
export function validarUuid(valor: unknown): string {
  if (typeof valor !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)) throw new Error('Identificador UUID inválido.')
  return valor.toLowerCase()
}
function validarRespostas(valor: unknown): Record<string, Resposta> {
  calcularPontuacao(valor)
  const respostas = objeto(valor)
  return Object.fromEntries(dimensoes.flatMap(d => d.perguntas.map(([id]) => [id, respostas[id]]))) as Record<string, Resposta>
}
function validarVersao(valor: unknown): number {
  if (valor !== versaoQuestionario) throw new Error('Versão do questionário não suportada.')
  return versaoQuestionario
}
export function validarEnvio(valor: unknown): Envio {
  const entrada = objeto(valor)
  camposExatos(entrada, ['instituicao', 'respostas', 'versaoQuestionario', 'idEnvio'])
  return { instituicao: normalizarNome(entrada.instituicao), respostas: validarRespostas(entrada.respostas), versaoQuestionario: validarVersao(entrada.versaoQuestionario), idEnvio: validarUuid(entrada.idEnvio) }
}
export function validarBackup(valor: unknown): Backup {
  const entrada = objeto(valor)
  camposExatos(entrada, ['formato', 'versao', 'exportadoEm', 'diagnosticos'])
  if (entrada.formato !== 'checklist-seguranca-informacao' || entrada.versao !== 1) throw new Error('Formato ou versão do arquivo de backup inválidos.')
  function data(valor: unknown) {
    if (typeof valor !== 'string' || !Number.isFinite(Date.parse(valor)) || new Date(valor).toISOString() !== valor) throw new Error('As datas devem usar o formato ISO UTC, com milissegundos.')
    return valor
  }
  if (!Array.isArray(entrada.diagnosticos) || entrada.diagnosticos.length > limiteRegistros) throw new Error(`O arquivo deve conter até ${limiteRegistros} diagnósticos.`)
  const ids = new Set<string>()
  const diagnosticos = entrada.diagnosticos.map((valor, indice) => {
    try {
      const registro = objeto(valor)
      camposExatos(registro, ['id', 'instituicao', 'respostas', 'versaoQuestionario', 'criadoEm'])
      const id = validarUuid(registro.id)
      if (ids.has(id)) throw new Error('O arquivo repete um identificador de diagnóstico.')
      ids.add(id)
      return { id, instituicao: normalizarNome(registro.instituicao), respostas: validarRespostas(registro.respostas), versaoQuestionario: validarVersao(registro.versaoQuestionario), criadoEm: data(registro.criadoEm) }
    } catch (erro) { throw new Error(`Diagnóstico ${indice + 1}: ${erro instanceof Error ? erro.message : 'Dados inválidos.'}`) }
  })
  return { formato: 'checklist-seguranca-informacao', versao: 1, exportadoEm: data(entrada.exportadoEm), diagnosticos }
}
export function criarBackup(registros: RegistroBackup[]): Backup {
  return validarBackup({ formato: 'checklist-seguranca-informacao', versao: 1, exportadoEm: new Date().toISOString(), diagnosticos: registros })
}
export function resumirRegistro(registro: RegistroBackup): Diagnostico {
  return { id: registro.id, instituicao: registro.instituicao, data: registro.criadoEm, versaoQuestionario: registro.versaoQuestionario, ...calcularPontuacao(registro.respostas) }
}
export function registroParaBanco(registro: RegistroBackup) {
  const pontuacao = calcularPontuacao(registro.respostas)
  return { id: registro.id, instituicao: registro.instituicao, respostas: registro.respostas, versao_questionario: registro.versaoQuestionario, criado_em: registro.criadoEm, nota_total: pontuacao.nota, notas_dimensoes: pontuacao.dimensoes, quantidade_nao_sei: pontuacao.quantidadeNaoSei }
}

