import { alternativas, dimensoes, type Resposta } from './perguntas.ts'
import type { NotasDimensoes, Pontuacao } from './tipos.ts'
import { classificarNota } from './classificacao.ts'

export const valoresRespostas: Readonly<Record<Resposta, number>> = {
  sim: 1, parcialmente: 0.5, nao: 0, nao_sei: 0,
}
export const versaoQuestionario = 1
export function arredondarNota(nota: number) { return Math.round((nota + Number.EPSILON) * 100) / 100 }

// Regra compartilhada pelo servidor, demonstração e testes.
// Na base real, somente o servidor determina a pontuação persistida.
export function calcularPontuacao(entrada: unknown): Pontuacao {
  if (typeof entrada !== 'object' || entrada === null || Array.isArray(entrada)) {
    throw new Error('As respostas devem formar um objeto com as vinte perguntas.')
  }
  const respostas = entrada as Record<string, unknown>
  const ids = dimensoes.flatMap(d => d.perguntas.map(([id]) => id))
  if (Object.keys(respostas).length !== ids.length || Object.keys(respostas).some(id => !ids.some(conhecido => conhecido === id))) {
    throw new Error('Informe exatamente os vinte IDs de perguntas conhecidos.')
  }
  for (const id of ids) {
    if (!Object.hasOwn(respostas, id) || !alternativas.some(a => a.valor === respostas[id])) {
      throw new Error(`Resposta inválida ou ausente para ${id}.`)
    }
  }
  let total = 0
  const notas = {} as NotasDimensoes
  let quantidadeNaoSei = 0
  for (const dimensao of dimensoes) {
    let soma = 0
    for (const [id] of dimensao.perguntas) {
      const resposta = respostas[id] as Resposta
      soma += valoresRespostas[resposta]
      if (resposta === 'nao_sei') quantidadeNaoSei++
    }
    const notaDimensao = soma / dimensao.perguntas.length * 100
    notas[dimensao.id] = arredondarNota(notaDimensao)
    // Usa a precisão integral das dimensões antes de arredondar a nota final.
    total += notaDimensao * dimensao.peso / 100
  }
  const nota = arredondarNota(total)
  return { nota, dimensoes: notas, quantidadeNaoSei, classificacao: classificarNota(nota) }
}

