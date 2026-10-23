// @vitest-environment node
import { beforeAll, beforeEach, afterAll, afterEach, describe, expect, it } from 'vitest'
import migration from '../supabase/migrations/20261023021014_diagnosticos.sql?raw'
import protecao from '../supabase/migrations/20261023021117_protecao_projecao_publica.sql?raw'
import { PGlite } from '@electric-sql/pglite'
import { registrosDemonstrativos } from '../src/data/diagnosticos'
import { criarBackup, registroParaBanco } from '../supabase/functions/_shared/contratos.ts'
import { criarHandler, type DependenciasServidor } from '../supabase/functions/_shared/handlers.ts'

let banco: PGlite
beforeAll(async () => {
  banco = new PGlite()
  await banco.exec('create role anon; create role authenticated; create role service_role bypassrls;')
  await banco.exec(migration)
  await banco.exec(protecao)
}, 30000)
beforeEach(async () => { await banco.exec('reset role; truncate table privado.envios, privado.limites, public.diagnosticos;') })
afterEach(async () => { await banco.exec('reset role;') })
afterAll(async () => { await banco?.close() })
async function rpc(nome: string, parametros: Record<string, unknown> = {}) {
  const entradas = Object.entries(parametros)
  const argumentos = entradas.map(([campo], indice) => `${campo} => $${indice + 1}`).join(', ')
  const resultado = await banco.query<{ resultado: unknown }>(`select public.${nome}(${argumentos}) as resultado`, entradas.map(([, valor]) => typeof valor === 'object' ? JSON.stringify(valor) : valor))
  return resultado.rows[0].resultado as Record<string, unknown>
}
async function importarExemplos() { return rpc('importar_diagnosticos', { p_registros: registrosDemonstrativos.map(registroParaBanco) }) }
const segredos: Record<string, string> = { ADMIN_API_TOKEN: 'a'.repeat(40), RATE_LIMIT_SALT: 's'.repeat(40), ALLOWED_ORIGINS: 'http://localhost:5173' }
const deps: DependenciasServidor = { ambiente: nome => segredos[nome], rpc }
const enviar = criarHandler('enviar', deps)
const administrar = criarHandler('administrar', deps)
function requisicao(corpo: unknown, administrativa = false, cabecalhos: Record<string, string> = {}) {
  return new Request('https://exemplo.supabase.co/functions/v1/teste', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '192.0.2.10', ...(administrativa ? { 'x-admin-key': segredos.ADMIN_API_TOKEN } : {}), ...cabecalhos }, body: JSON.stringify(corpo) })
}
function dadosEnvio() { return { instituicao: 'Arquivo de teste', respostas: registrosDemonstrativos[0].respostas, versaoQuestionario: 1, idEnvio: crypto.randomUUID() } }

describe('PostgreSQL: acesso público e operações atômicas', () => {
  it.each(['anon', 'authenticated'])('nega leitura completa, escrita, alteração, exclusão e RPCs administrativos a %s', async papel => {
    await importarExemplos()
    await banco.exec(`set role ${papel}`)
    for (const sql of [
      'select * from public.diagnosticos',
      'select respostas from public.diagnosticos',
      "insert into public.diagnosticos(instituicao) values ('Arquivo')",
      "update public.diagnosticos set instituicao = 'Alterado'",
      'delete from public.diagnosticos',
      'delete from public.resultados_publicos',
      "update public.resultados_publicos set instituicao = 'Alterado'",
      'select public.exportar_diagnosticos()',
      "select public.importar_diagnosticos('[]'::jsonb)",
      "select public.limpar_diagnosticos('EXCLUIR TUDO')",
      "select public.registrar_diagnostico('{}', gen_random_uuid(), 'origem', 'assinatura')",
      "select * from privado.envios",
    ]) await expect(banco.query(sql)).rejects.toThrow(/permission denied/)
    const definidor = await banco.query<{ reloptions: string[] }>("select reloptions from pg_class where oid = 'public.resultados_publicos'::regclass")
    expect(definidor.rows[0].reloptions).toContain('security_invoker=true')
    const publico = await rpc('listar_resultados')
    expect(publico).toHaveLength(5)
    for (const registro of publico as unknown as Record<string, unknown>[]) {
      expect(Object.keys(registro).sort()).toEqual(['id', 'instituicao', 'nota_total', 'notas_dimensoes', 'quantidade_nao_sei', 'versao_questionario', 'criado_em'].sort())
      expect(registro).not.toHaveProperty('respostas')
    }
    await expect(banco.query('select respostas from public.resultados_publicos')).rejects.toThrow()
  })
  it('aplica limites persistentes por origem sem depender da memória da Edge Function', async () => {
    for (let i = 0; i < 60; i++) expect(await rpc('verificar_limite', { p_origem: 'origem', p_administrativo: false })).toBe(true)
    expect(await rpc('verificar_limite', { p_origem: 'origem', p_administrativo: false })).toBe(false)
    expect(await rpc('verificar_limite', { p_origem: 'outra', p_administrativo: false })).toBe(true)
  })
  it('ignora IDs existentes e reverte a importação inteira diante de uma violação', async () => {
    const registros = registrosDemonstrativos.map(registroParaBanco)
    await expect(rpc('importar_diagnosticos', { p_registros: [registros[0], { ...registros[1], instituicao: 'ab' }] })).rejects.toThrow()
    expect(await rpc('listar_resultados')).toEqual([])
    expect(await importarExemplos()).toEqual({ importados: 5, ignorados: 0 })
    expect(await importarExemplos()).toEqual({ importados: 0, ignorados: 5 })
  })
  it('impede limpeza sem confirmação e apaga diagnósticos e controles quando confirmada', async () => {
    await enviar(requisicao(dadosEnvio()))
    await expect(rpc('limpar_diagnosticos', { p_confirmacao: 'não' })).rejects.toThrow()
    expect(await rpc('listar_resultados')).toHaveLength(1)
    expect(await rpc('limpar_diagnosticos', { p_confirmacao: 'EXCLUIR TUDO' })).toEqual({ excluidos: 1 })
    expect(await rpc('listar_resultados')).toEqual([])
    expect((await banco.query('select count(*)::int as total from privado.envios')).rows).toEqual([{ total: 0 }])
    expect((await banco.query('select count(*)::int as total from privado.limites')).rows).toEqual([{ total: 0 }])
  })
})
describe('Edge Functions integradas ao PostgreSQL', () => {
  it('valida, recalcula, persiste e retorna somente o resumo; retry não duplica o envio', async () => {
    const dados = dadosEnvio()
    const resposta = await enviar(requisicao(dados))
    expect(resposta.status).toBe(201)
    const criado = await resposta.json()
    expect(criado.diagnostico.nota_total).toBe(85)
    expect(criado.diagnostico).not.toHaveProperty('respostas')
    const repetido = await enviar(requisicao(dados))
    expect(repetido.status).toBe(200)
    expect((await repetido.json()).diagnostico.id).toBe(criado.diagnostico.id)
    expect(await rpc('listar_resultados')).toHaveLength(1)
    expect((await enviar(requisicao({ ...dados, idEnvio: crypto.randomUUID() }))).status).toBe(429)
    expect((await enviar(requisicao({ ...dados, instituicao: 'Outro arquivo' }))).status).toBe(409)
  })
  it.each([
    { nota_total: 100 }, { respostas: {} }, { respostas: { ...registrosDemonstrativos[0].respostas, COMP01: 'talvez' } },
    { respostas: { ...registrosDemonstrativos[0].respostas, EXTRA: 'sim' } }, { instituicao: 'a' }, { versaoQuestionario: 2 },
  ])('rejeita payload inválido sem inserir: %j', async alteracoes => {
    expect((await enviar(requisicao({ ...dadosEnvio(), ...alteracoes }))).status).toBe(400)
    expect(await rpc('listar_resultados')).toEqual([])
  })
  it('valida exportação, importação e limpeza com as respectivas regras de chave e confirmação no servidor', async () => {
    await importarExemplos()
    expect((await administrar(requisicao({ acao: 'exportar' }))).status).toBe(401)
    expect((await administrar(requisicao({ acao: 'importar', backup: {} }))).status).toBe(401)
    expect((await administrar(requisicao({ acao: 'limpar', confirmacao: 'não' }))).status).toBe(400)
    const exportacao = await administrar(requisicao({ acao: 'exportar' }, true))
    expect(exportacao.status).toBe(200)
    const backup = await exportacao.json()
    expect(backup.diagnosticos).toHaveLength(5)
    expect(backup.diagnosticos[0]).toHaveProperty('respostas')
    expect((await administrar(requisicao({ acao: 'limpar', confirmacao: 'EXCLUIR TUDO' }))).status).toBe(200)
    expect(await rpc('listar_resultados')).toEqual([])
    // A limpeza também reinicia os controles administrativos desta base isolada.
    const restauracao = await administrar(requisicao({ acao: 'importar', backup }, true))
    expect(await restauracao.json()).toEqual({ importados: 5, ignorados: 0 })
    expect(await rpc('listar_resultados')).toHaveLength(5)
  })
  it('rejeita importação adulterada integralmente e recalcula os dados válidos', async () => {
    const backup = criarBackup(registrosDemonstrativos)
    const invalido = { ...backup, diagnosticos: [...backup.diagnosticos.slice(0, 4), { ...backup.diagnosticos[4], nota_total: 100 }] }
    expect((await administrar(requisicao({ acao: 'importar', backup: invalido }, true))).status).toBe(400)
    expect(await rpc('listar_resultados')).toEqual([])
    expect((await administrar(requisicao({ acao: 'importar', backup }, true))).status).toBe(200)
    const resultados = await rpc('listar_resultados') as unknown as Record<string, unknown>[]
    expect(resultados.map(r => r.nota_total).sort((a, b) => Number(a) - Number(b))).toEqual([15, 30, 45, 65, 85])
  })
  it('trata CORS, métodos e JSON inválido sem depender de CORS como autorização', async () => {
    const preflight = await enviar(new Request('https://exemplo/teste', { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' } }))
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
    expect((await enviar(requisicao(dadosEnvio(), false, { Origin: 'https://malicioso.test' }))).status).toBe(403)
    expect((await enviar(new Request('https://exemplo/teste'))).status).toBe(405)
    expect((await enviar(new Request('https://exemplo/teste', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }))).status).toBe(400)
    expect((await enviar(requisicao(dadosEnvio(), false, { 'Content-Type': 'text/plain' }))).status).toBe(415)
    expect((await enviar(requisicao({ dados: 'x'.repeat(20000) }))).status).toBe(413)
  })
})




