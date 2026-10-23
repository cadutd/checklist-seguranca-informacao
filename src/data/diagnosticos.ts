import { dimensoes, type Resposta } from './perguntas'
import { resumirRegistro, type RegistroBackup } from '../../supabase/functions/_shared/contratos.ts'

function criarExemplo(numero: number, instituicao: string, data: string, unidades: number[]): RegistroBackup {
  const respostas: Record<string, Resposta> = {}
  dimensoes.forEach((dimensao, indice) => {
    let restantes = unidades[indice]
    dimensao.perguntas.forEach(([pergunta], posicao) => {
      respostas[pergunta] = restantes >= 2 ? 'sim' : restantes === 1 ? 'parcialmente' : posicao === dimensao.perguntas.length - 1 ? 'nao_sei' : 'nao'
      restantes = Math.max(0, restantes - 2)
    })
  })
  return { id: `00000000-0000-4000-8000-${String(numero).padStart(12, '0')}`, instituicao, criadoEm: `${data}T12:00:00.000Z`, versaoQuestionario: 1, respostas }
}
export const registrosDemonstrativos = [
  criarExemplo(1, 'Arquivo Raízes do Bairro', '2026-10-20', [8, 10, 6, 6, 4]),
  criarExemplo(2, 'Centro de Memória Popular', '2026-10-19', [6, 8, 6, 2, 4]),
  criarExemplo(3, 'Acervo Vozes da Comunidade', '2026-10-18', [3, 7, 4, 2, 2]),
  criarExemplo(4, 'Memória da Vila', '2026-10-17', [4, 2, 2, 2, 2]),
  criarExemplo(5, 'Arquivo Caminhos do Rio', '2026-10-16', [2, 2, 2, 0, 0]),
]
export const diagnosticos = registrosDemonstrativos.map(resumirRegistro)
