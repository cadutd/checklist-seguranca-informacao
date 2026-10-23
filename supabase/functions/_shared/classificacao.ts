export const classificacoes = ['Inicial', 'Básico', 'Em desenvolvimento', 'Estruturado', 'Avançado'] as const
export type Classificacao = typeof classificacoes[number]

export function classificarNota(nota: number): Classificacao {
  if (!Number.isFinite(nota) || nota < 0 || nota > 100) {
    throw new Error('A nota deve ser um número entre 0 e 100.')
  }
  if (nota <= 20) return 'Inicial'
  if (nota <= 40) return 'Básico'
  if (nota <= 60) return 'Em desenvolvimento'
  if (nota <= 80) return 'Estruturado'
  return 'Avançado'
}
