import { describe, expect, it } from 'vitest'
import { dimensoes } from '../src/data/perguntas'
import { normalizarNome, validarFormulario } from '../src/utils/validacao'
const respostas = Object.fromEntries(dimensoes.flatMap(d => d.perguntas.map(([id]) => [id, 'sim'])))
describe('Validação do checklist', () => {
  it('exige exatamente vinte perguntas com IDs únicos', () => {
    const ids = dimensoes.flatMap(d => d.perguntas.map(([id]) => id))
    expect(ids).toHaveLength(20)
    expect(new Set(ids).size).toBe(20)
  })
  it('normaliza espaços e aceita nomes fictícios', () => {
    expect(normalizarNome('  Arquivo   Fictício  ')).toBe('Arquivo Fictício')
    expect(validarFormulario('Arquivo Fictício', respostas)).toEqual({})
  })
  it.each(['', '  ', 'ab', 'a'.repeat(121)])('rejeita nome inválido: %s', nome => {
    expect(validarFormulario(nome, respostas).instituicao).toBeDefined()
  })
  it('aceita nomes nos dois limites', () => {
    expect(validarFormulario('abc', respostas)).toEqual({})
    expect(validarFormulario('a'.repeat(120), respostas)).toEqual({})
  })
  it('exige as vinte respostas', () => {
    expect(Object.keys(validarFormulario('Arquivo', {}))).toHaveLength(20)
  })
  it('rejeita respostas inválidas e perguntas desconhecidas', () => {
    expect(validarFormulario('Arquivo', { ...respostas, COMP01: 'talvez' }).COMP01).toBeDefined()
    expect(validarFormulario('Arquivo', { ...respostas, EXTRA: 'sim' }).geral).toBeDefined()
  })
})
