import { validarChavePublica } from './chavePublica'

export interface ConfiguracaoSupabase { url: string; chave: string }
export function obterConfiguracao(): ConfiguracaoSupabase | null {
  const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
  const chave = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  if (import.meta.env.VITE_MODO_DEMONSTRACAO === 'true' || (!url && !chave)) return null
  if (!url || !chave) throw new Error('Preencha a URL e a chave pública do Supabase em .env.local.')
  let endereco: URL
  try { endereco = new URL(url) } catch { throw new Error('URL do Supabase inválida.') }
  if (endereco.protocol !== 'https:' && !(endereco.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(endereco.hostname))) throw new Error('A URL do Supabase deve usar HTTPS.')
  validarChavePublica(chave)
  return { url: url.replace(/\/$/, ''), chave }
}
export async function requisitar(configuracao: ConfiguracaoSupabase, caminho: string, corpo: unknown): Promise<unknown> {
  let resposta: Response
  try { resposta = await fetch(`${configuracao.url}${caminho}`, {
    method: 'POST', signal: AbortSignal.timeout(25000),
    headers: { apikey: configuracao.chave, ...(configuracao.chave.startsWith('eyJ') ? { Authorization: 'Bearer ' + configuracao.chave } : {}), 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
  } catch { throw new Error('Não foi possível conectar ao Supabase. Verifique a conexão e tente novamente.') }
  let dados: unknown
  try { dados = await resposta.json() } catch { throw new Error('O serviço retornou uma resposta inválida.') }
  if (!resposta.ok) {
    const mensagem = dados && typeof dados === 'object' && 'erro' in dados && typeof dados.erro === 'string' ? dados.erro : 'Não foi possível concluir a operação no Supabase.'
    throw new Error(mensagem)
  }
  return dados
}




