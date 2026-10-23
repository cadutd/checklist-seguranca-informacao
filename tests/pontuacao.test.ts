import { describe, expect, it } from 'vitest'
import { dimensoes, type Resposta } from '../src/data/perguntas'
import { calcularPontuacao } from '../src/utils/pontuacao'
import { classificarNota } from '../src/utils/classificacao'

function preencher(resposta: Resposta) {
  return Object.fromEntries(dimensoes.flatMap(d => d.perguntas.map(([id]) => [id, resposta])))
}
describe('Pontuação do questionário', () => {
  it.each([['sim', 100, 0], ['nao', 0, 0], ['nao_sei', 0, 20], ['parcialmente', 50, 0]] as const)('pontua todas as respostas %s', (resposta, nota, desconhecidas) => {
    const resultado = calcularPontuacao(preencher(resposta))
    expect(resultado.nota).toBe(nota)
    expect(Object.values(resultado.dimensoes)).toEqual([nota, nota, nota, nota, nota])
    expect(resultado.quantidadeNaoSei).toBe(desconhecidas)
    expect(resultado.classificacao).toBe(classificarNota(nota))
  })
  it('utiliza os pesos especificados e totaliza 100%', () => {
    expect(dimensoes.map(d => d.peso)).toEqual([25, 25, 20, 15, 15])
    expect(dimensoes.reduce((soma, d) => soma + d.peso, 0)).toBe(100)
  })
  it.each(dimensoes)('aplica o peso da dimensão $id', dimensao => {
    const respostas = preencher('nao')
    for (const [id] of dimensao.perguntas) respostas[id] = 'sim'
    const resultado = calcularPontuacao(respostas)
    expect(resultado.nota).toBe(dimensao.peso)
    expect(resultado.dimensoes[dimensao.id]).toBe(100)
    expect(Object.values(resultado.dimensoes).filter(nota => nota !== 0)).toHaveLength(1)
  })
  it('calcula respostas mistas, dimensões fracionárias e desconhecidas separadamente', () => {
    const respostas = { ...preencher('nao'), COMP01: 'sim', COMP02: 'parcialmente', ACES01: 'nao_sei', BACK01: 'sim', GEST01: 'parcialmente' }
    const copia = { ...respostas }
    expect(calcularPontuacao(respostas)).toEqual({
      nota: 15, dimensoes: { COMP: 30, ACES: 0, DADO: 0, BACK: 33.33, GEST: 16.67 }, quantidadeNaoSei: 1, classificacao: 'Inicial',
    })
    expect(respostas).toEqual(copia)
  })
  it('arredonda as dimensões sem perder precisão na soma ponderada final', () => {
    const respostas = { ...preencher('nao'), BACK01: 'sim', GEST01: 'sim' }
    expect(calcularPontuacao(respostas).dimensoes.BACK).toBe(33.33)
    expect(calcularPontuacao(respostas).nota).toBe(10)
  })
  it.each([null, undefined, [], 'sim', 42, {}, { COMP01: 'sim' }])('rejeita estrutura incompleta ou inválida: %j', entrada => {
    expect(() => calcularPontuacao(entrada)).toThrow()
  })
  it('rejeita valores inválidos, perguntas desconhecidas e notas fornecidas pelo cliente', () => {
    expect(() => calcularPontuacao({ ...preencher('sim'), COMP01: 'talvez' })).toThrow()
    expect(() => calcularPontuacao({ ...preencher('sim'), COMP01: 1 })).toThrow()
    expect(() => calcularPontuacao({ ...preencher('sim'), EXTRA: 'sim' })).toThrow()
    expect(() => calcularPontuacao({ ...preencher('sim'), nota: 100 })).toThrow()
    const respostas = preencher('sim')
    delete respostas.COMP01
    expect(() => calcularPontuacao({ ...respostas, EXTRA: 'sim' })).toThrow()
  })
})
describe('Classificações didáticas', () => {
  it.each([
    [0, 'Inicial'], [20, 'Inicial'], [20.01, 'Básico'], [40, 'Básico'],
    [40.01, 'Em desenvolvimento'], [60, 'Em desenvolvimento'],
    [60.01, 'Estruturado'], [80, 'Estruturado'], [80.01, 'Avançado'], [100, 'Avançado'],
  ])('classifica %s como %s', (nota, classificacao) => {
    expect(classificarNota(Number(nota))).toBe(classificacao)
  })
  it.each([-1, 100.01, NaN, Infinity, -Infinity])('rejeita nota fora do domínio: %s', nota => {
    expect(() => classificarNota(nota)).toThrow()
  })
})
