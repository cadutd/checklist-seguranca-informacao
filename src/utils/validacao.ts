import { alternativas, dimensoes } from '../data/perguntas'

export function normalizarNome(nome: string) { return nome.trim().replace(/\s+/g, ' ') }
export function validarFormulario(nome: string, respostas: Record<string, string>) {
  const erros: Record<string, string> = {}
  const nomeLimpo = normalizarNome(nome)
  if (nomeLimpo.length < 3 || nomeLimpo.length > 120) erros.instituicao = 'Informe um nome com 3 a 120 caracteres.'
  const ids = dimensoes.flatMap(d => d.perguntas.map(([id]) => id))
  for (const id of ids) {
    if (!alternativas.some(a => a.valor === respostas[id])) erros[id] = 'Selecione uma das quatro alternativas.'
  }
  if (Object.keys(respostas).some(id => !ids.some(conhecido => conhecido === id))) erros.geral = 'O formulário contém perguntas desconhecidas.'
  return erros
}
