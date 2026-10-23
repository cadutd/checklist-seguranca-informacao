import { criarBackup, validarBackup, validarEnvio, registroParaBanco, camposExatos, objeto, limiteArquivo, limiteRegistros } from './contratos.ts'

export interface DependenciasServidor {
  ambiente: (nome: string) => string | undefined
  rpc: (nome: string, parametros: Record<string, unknown>) => Promise<unknown>
}
class ErroHttp extends Error {
  constructor(readonly status: number, mensagem: string) { super(mensagem) }
}
const codificador = new TextEncoder()
async function resumoHash(valor: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', codificador.encode(valor)))
}
async function chavesIguais(recebida: string, esperada: string) {
  const [primeira, segunda] = await Promise.all([resumoHash(recebida), resumoHash(esperada)])
  let diferenca = 0
  for (let i = 0; i < primeira.length; i++) diferenca |= primeira[i] ^ segunda[i]
  return diferenca === 0
}
async function hashOrigem(req: Request, segredo: string) {
  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'origem-indisponivel').slice(0, 128)
  const chave = await crypto.subtle.importKey('raw', codificador.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', chave, codificador.encode(ip))), valor => valor.toString(16).padStart(2, '0')).join('')
}
function validar<T>(funcao: () => T): T {
  try { return funcao() } catch (erro) { throw new ErroHttp(400, erro instanceof Error ? erro.message : 'Dados inválidos.') }
}
async function lerJson(req: Request, limite: number) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get('content-type') ?? '')) throw new ErroHttp(415, 'Envie um corpo application/json.')
  if (Number(req.headers.get('content-length') ?? 0) > limite) throw new ErroHttp(413, 'O arquivo excede o tamanho permitido.')
  const leitor = req.body?.getReader()
  if (!leitor) throw new ErroHttp(400, 'O corpo JSON é obrigatório.')
  const partes: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const parte = await leitor.read()
      if (parte.done) break
      total += parte.value.byteLength
      if (total > limite) { await leitor.cancel(); throw new ErroHttp(413, 'O arquivo excede o tamanho permitido.') }
      partes.push(parte.value)
    }
  } finally { leitor.releaseLock() }
  const bytes = new Uint8Array(total)
  let posicao = 0
  for (const parte of partes) { bytes.set(parte, posicao); posicao += parte.length }
  return validar(() => JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))) as unknown
}

export function criarHandler(tipo: 'enviar' | 'administrar', deps: DependenciasServidor) {
  return async (req: Request): Promise<Response> => {
    const origem = req.headers.get('origin')
    const permitidas = (deps.ambiente('ALLOWED_ORIGINS') ?? '').split(',').map(v => v.trim()).filter(Boolean)
    const cabecalhos: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
      'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff',
    }
    if (origem && permitidas.includes(origem)) {
      cabecalhos['Access-Control-Allow-Origin'] = origem
      cabecalhos['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
      cabecalhos['Access-Control-Allow-Headers'] = 'content-type, apikey, authorization, x-admin-key'
    }
    function responder(status: number, corpo: unknown) {
      return new Response(status === 204 ? null : JSON.stringify(corpo), { status, headers: cabecalhos })
    }
    try {
      if (origem && !permitidas.includes(origem)) throw new ErroHttp(403, 'Origem não autorizada.')
      if (req.method === 'OPTIONS') return responder(204, null)
      if (req.method !== 'POST') { cabecalhos.Allow = 'POST, OPTIONS'; throw new ErroHttp(405, 'Método não permitido.') }
      const sal = deps.ambiente('RATE_LIMIT_SALT') ?? ''
      if (sal.length < 32) throw new ErroHttp(503, 'O serviço ainda não foi configurado.')
      const origemHash = await hashOrigem(req, sal)
      const permitido = await deps.rpc('verificar_limite', { p_origem: origemHash, p_administrativo: tipo === 'administrar' })
      if (permitido !== true) throw new ErroHttp(429, 'Limite de requisições atingido. Aguarde antes de tentar novamente.')
      const entrada = await lerJson(req, tipo === 'enviar' ? 16 * 1024 : limiteArquivo + 1024)
      const limpeza = tipo === 'administrar' && validar(() => objeto(entrada)).acao === 'limpar'
      if (tipo === 'administrar' && !limpeza) {
        const esperada = deps.ambiente('ADMIN_API_TOKEN') ?? ''
        if (esperada.length < 32) throw new ErroHttp(503, 'As operações administrativas ainda não foram configuradas.')
        const recebida = req.headers.get('x-admin-key') ?? ''
        if (!recebida || recebida.length > 512 || !await chavesIguais(recebida, esperada)) throw new ErroHttp(401, 'Chave administrativa inválida.')
      }
      if (tipo === 'enviar') {
        const envio = validar(() => validarEnvio(entrada))
        const assinatura = Array.from(await resumoHash(JSON.stringify({ instituicao: envio.instituicao, respostas: envio.respostas, versaoQuestionario: envio.versaoQuestionario })), valor => valor.toString(16).padStart(2, '0')).join('')
        const registro = registroParaBanco({ id: crypto.randomUUID(), instituicao: envio.instituicao, respostas: envio.respostas, criadoEm: new Date().toISOString(), versaoQuestionario: envio.versaoQuestionario })
        const resultado = objeto(await deps.rpc('registrar_diagnostico', { p_registro: registro, p_id_envio: envio.idEnvio, p_origem: origemHash, p_assinatura: assinatura }))
        if (resultado.erro === 'conflito') throw new ErroHttp(409, 'Este identificador de envio já foi usado para outros dados. Recarregue o formulário antes de um novo envio.')
        if (resultado.erro === 'repetido') throw new ErroHttp(429, 'Um diagnóstico igual acabou de ser enviado. Aguarde 30 segundos para enviar outro.')
        return responder(resultado.repetido ? 200 : 201, resultado)
      }
      const acao = validar(() => objeto(entrada))
      if (acao.acao === 'exportar') {
        validar(() => camposExatos(acao, ['acao']))
        const registros = await deps.rpc('exportar_diagnosticos', {})
        if (Array.isArray(registros) && registros.length > limiteRegistros) throw new ErroHttp(413, 'A base excede 5.000 diagnósticos. Use a exportação administrativa do Supabase.')
        const backup = criarBackup(registros as Parameters<typeof criarBackup>[0])
        if (codificador.encode(JSON.stringify(backup)).byteLength > limiteArquivo) throw new ErroHttp(413, 'A base excede o limite de 5 MB do backup pela interface. Use a exportação administrativa do Supabase.')
        return responder(200, backup)
      }
      if (acao.acao === 'importar') {
        validar(() => camposExatos(acao, ['acao', 'backup']))
        const backup = validar(() => validarBackup(acao.backup))
        return responder(200, await deps.rpc('importar_diagnosticos', { p_registros: backup.diagnosticos.map(registroParaBanco) }))
      }
      if (acao.acao === 'limpar') {
        validar(() => camposExatos(acao, ['acao', 'confirmacao']))
        if (acao.confirmacao !== 'EXCLUIR TUDO') throw new ErroHttp(400, 'Digite EXCLUIR TUDO para confirmar a exclusão.')
        return responder(200, await deps.rpc('limpar_diagnosticos', { p_confirmacao: acao.confirmacao }))
      }
      throw new ErroHttp(400, 'Operação administrativa desconhecida.')
    } catch (erro) {
      if (erro instanceof ErroHttp) {
        if (erro.status === 429) cabecalhos['Retry-After'] = '60'
        return responder(erro.status, { erro: erro.message })
      }
      // Nunca retorna mensagens do PostgreSQL, credenciais ou payloads privados.
      return responder(503, { erro: 'Não foi possível concluir a operação. Tente novamente mais tarde.' })
    }
  }
}


