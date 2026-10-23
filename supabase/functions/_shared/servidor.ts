import type { DependenciasServidor } from './handlers.ts'

export function criarDependencias(ambiente: DependenciasServidor['ambiente']): DependenciasServidor {
  return {
    ambiente,
    async rpc(nome, parametros) {
      const url = ambiente('SUPABASE_URL')
      const chave = ambiente('SUPABASE_SERVICE_ROLE_KEY')
      if (!url || !chave) throw new Error('Configuração de servidor ausente.')
      const resposta = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/${nome}`, {
        method: 'POST', signal: AbortSignal.timeout(20000),
        headers: { apikey: chave, Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(parametros),
      })
      if (!resposta.ok) throw new Error('Falha na operação do banco de dados.')
      return resposta.json()
    },
  }
}
