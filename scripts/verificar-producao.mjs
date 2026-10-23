import { existsSync, readFileSync } from 'node:fs'
const locais = existsSync('.env.local') ? Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] })) : {}
const site = process.argv[2] || 'https://cadutd.github.io/checklist-seguranca-informacao/'
const api = process.env.VITE_SUPABASE_URL || locais.VITE_SUPABASE_URL
const chave = process.env.VITE_SUPABASE_ANON_KEY || locais.VITE_SUPABASE_ANON_KEY
function exigir(valor, mensagem) { if (!valor) throw new Error(mensagem) }
async function buscar(url, opcoes = {}) { return fetch(url, { ...opcoes, signal: AbortSignal.timeout(15000) }) }
let pagina
for (let tentativa = 0; tentativa < 15; tentativa++) {
  pagina = await buscar(site)
  if (pagina.ok) break
  await new Promise(resolver => setTimeout(resolver, 3000))
}
exigir(pagina?.ok, `Página indisponível: HTTP ${pagina?.status}`)
const html = await pagina.text()
exigir(html.includes('pt-BR') && html.includes('Content-Security-Policy'), 'HTML sem idioma ou política de conteúdo')
const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(resultado => new URL(resultado[1], site))
exigir(scripts.length > 0, 'Nenhum script de produção encontrado')
for (const url of scripts) {
  exigir(url.origin === new URL(site).origin, 'Script fora da origem da aplicação')
  exigir((await buscar(url)).ok, 'Script de produção indisponível')
}
exigir(api && chave, 'Informe a configuração pública do Supabase para conferir a API')
const headers = { apikey: chave, ...(chave.startsWith('eyJ') ? { Authorization: 'Bearer ' + chave } : {}), 'Content-Type': 'application/json' }
const resposta = await buscar(api + '/rest/v1/rpc/listar_resultados', { method: 'POST', headers, body: '{}' })
exigir(resposta.ok, `Consulta pública falhou: HTTP ${resposta.status}`)
const dados = await resposta.json()
exigir(Array.isArray(dados), 'Consulta pública não retornou uma lista')
exigir(dados.every(d => !('respostas' in d)), 'Consulta pública expôs respostas individuais')
const privada = await buscar(api + '/rest/v1/diagnosticos?select=respostas', { headers })
exigir([401, 403].includes(privada.status), 'A leitura de respostas privadas não foi bloqueada')
console.log(`Produção verificada: página, assets, API pública e privacidade. ${dados.length} diagnóstico(s) no painel. Nenhum diagnóstico foi criado ou excluído.`)
