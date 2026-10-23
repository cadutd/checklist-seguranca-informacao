import { describe, expect, it } from 'vitest'
import { diagnosticos } from '../src/data/diagnosticos'
import { analisarDimensoes, resumirDiagnosticos } from '../src/utils/resumo'
import { classificarNota } from '../src/utils/classificacao'

describe('Resumo dos diagnósticos', () => {
  it('mantém indicadores, médias e distribuição consistentes com os exemplos', () => {
    const resumo = resumirDiagnosticos(diagnosticos)
    expect(resumo).toMatchObject({ quantidade: 5, media: 48, maior: 85, menor: 15 })
    expect(resumo.mediasDimensoes.map(d => d.nota)).toEqual([46, 58, 50, 40, 40])
    expect(resumo.distribuicao.map(d => d.quantidade)).toEqual([1, 1, 1, 1, 1])
    for (const d of diagnosticos) expect(d.classificacao).toBe(classificarNota(d.nota))
  })
  it('atualiza os agregados ao receber mais um diagnóstico sem alterar os exemplos', () => {
    const extra = { ...diagnosticos[0], id: 'novo', nota: 100, classificacao: classificarNota(100), dimensoes: { COMP: 100, ACES: 100, DADO: 100, BACK: 100, GEST: 100 } }
    const resumo = resumirDiagnosticos([...diagnosticos, extra])
    expect(resumo).toMatchObject({ quantidade: 6, media: 56.67, maior: 100, menor: 15 })
    expect(resumo.distribuicao.find(d => d.nome === 'Avançado')?.quantidade).toBe(2)
    expect(resumo.mediasDimensoes[0].nota).toBe(55)
    expect(diagnosticos).toHaveLength(5)
  })
  it('trata uma coleção vazia sem valores infinitos ou NaN', () => {
    const resumo = resumirDiagnosticos([])
    expect(resumo).toMatchObject({ quantidade: 0, media: 0, maior: 0, menor: 0 })
    expect(resumo.mediasDimensoes.every(d => d.nota === 0)).toBe(true)
  })
  it('separa pontos fortes e melhorias no limiar de 80 pontos', () => {
    const analise = analisarDimensoes(diagnosticos[0])
    expect(analise.pontosFortes.map(d => d.nome)).toEqual(['Proteção dos computadores', 'Senhas e controle de acesso', 'Backup e recuperação'])
    expect(analise.melhorias.map(d => d.nome)).toEqual(['Proteção de dados e mídias', 'Gestão e conscientização'])
    expect(analise.notas).toHaveLength(5)
  })
})
