import type { dimensoes } from './perguntas.ts'
import type { Classificacao } from './classificacao.ts'

export type DimensaoId = typeof dimensoes[number]['id']
export type NotasDimensoes = Record<DimensaoId, number>
export interface Pontuacao {
  nota: number
  dimensoes: NotasDimensoes
  quantidadeNaoSei: number
  classificacao: Classificacao
}
// O painel recebe apenas o resumo, nunca as respostas individuais.
export interface Diagnostico extends Pontuacao {
  id: string
  instituicao: string
  data: string
  versaoQuestionario: number
}

