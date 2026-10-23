import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// Evita publicar acidentalmente a demonstração ou referências incorretas aos assets.
const html = readFileSync('dist/index.html', 'utf8')
const locais = existsSync('.env.local') ? Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] })) : {}
const ambiente = { ...locais, ...process.env }
const base = ambiente.VITE_BASE_PATH || '/'
if (!html.includes(`${base}assets/`)) throw new Error('O build não usa o caminho público esperado.')
const scripts = readdirSync('dist/assets').filter(nome => nome.endsWith('.js')).map(nome => readFileSync(join('dist/assets', nome), 'utf8')).join('\n')
if (ambiente.VITE_SUPABASE_URL && !scripts.includes(ambiente.VITE_SUPABASE_URL)) throw new Error('URL do Supabase ausente do build.')
if (ambiente.VITE_SUPABASE_ANON_KEY && !scripts.includes(ambiente.VITE_SUPABASE_ANON_KEY)) throw new Error('Chave pública do Supabase ausente do build.')
readFileSync('dist/.nojekyll', 'utf8')
if (!html.includes('pt-BR') || !html.includes('Content-Security-Policy')) throw new Error('Idioma da página não configurado.')
console.log('Build verificado: caminho dos assets e configuração pública consistentes.')

