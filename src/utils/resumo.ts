import { dimensoes } from '../data/perguntas'
import type { Diagnostico } from '../types/diagnostico'
import { classificacoes } from './classificacao'
import { arredondarNota } from './pontuacao'

const nomesCurtos = ['Computadores', 'Acessos', 'Dados e mídias', 'Backup', 'Gestão']
export function resumirDiagnosticos(diagnosticos: Diagnostico[]) {
  const notas = diagnosticos.map(d => d.nota)
  return {
    quantidade: diagnosticos.length,
    media: notas.length ? arredondarNota(notas.reduce((soma, nota) => soma + nota, 0) / notas.length) : 0,
    maior: notas.length ? Math.max(...notas) : 0,
    menor: notas.length ? Math.min(...notas) : 0,
    mediasDimensoes: dimensoes.map((dimensao, indice) => ({
      nome: nomesCurtos[indice],
      nota: diagnosticos.length ? arredondarNota(diagnosticos.reduce((soma, d) => soma + d.dimensoes[dimensao.id], 0) / diagnosticos.length) : 0,
    })),
    distribuicao: classificacoes.map(nome => ({ nome, quantidade: diagnosticos.filter(d => d.classificacao === nome).length })),
  }
}
export function analisarDimensoes(diagnostico: Diagnostico) {
  const notas = dimensoes.map(d => ({ nome: d.nome, nota: diagnostico.dimensoes[d.id] }))
  // Critério de orientação explicitado na interface, sem caráter de auditoria.
  return { notas, pontosFortes: notas.filter(d => d.nota >= 80), melhorias: notas.filter(d => d.nota < 80) }
}
