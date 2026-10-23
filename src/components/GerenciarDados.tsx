import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useDiagnosticos } from '../contexts/Diagnosticos'
import { baixarBackup, lerBackup } from '../utils/arquivo'
import type { Backup } from '../services/repositorio'

type Acao = 'exportar' | 'importar' | 'limpar'
const titulos = { exportar: 'Exportar dados em JSON', importar: 'Importar dados de JSON', limpar: 'Limpar a base de dados' }
function DialogoDados({ acao, fechar, concluir }: { acao: Acao; fechar: () => void; concluir: (mensagem: string) => void }) {
  const { modo, diagnosticos, exportar, importar, limpar } = useDiagnosticos()
  const dialogo = useRef<HTMLDialogElement>(null)
  const bloqueio = useRef(false)
  const leitura = useRef(0)
  const [chave, definirChave] = useState('')
  const [confirmacao, definirConfirmacao] = useState('')
  const [backup, definirBackup] = useState<Backup | null>(null)
  const [erro, definirErro] = useState('')
  const [ocupado, definirOcupado] = useState(false)
  const [lendo, definirLendo] = useState(false)
  useEffect(() => {
    const elemento = dialogo.current
    elemento?.showModal()
    return () => { leitura.current++; elemento?.close() }
  }, [])
  async function selecionarArquivo(arquivo?: File) {
    const versao = ++leitura.current
    definirBackup(null); definirErro('')
    if (!arquivo) { definirLendo(false); return }
    definirLendo(true)
    try {
      const resultado = await lerBackup(arquivo)
      if (versao === leitura.current) definirBackup(resultado)
    } catch (erro) {
      if (versao === leitura.current) definirErro(erro instanceof Error ? erro.message : 'Arquivo inválido.')
    } finally { if (versao === leitura.current) definirLendo(false) }
  }
  async function executar(evento: FormEvent) {
    evento.preventDefault()
    if (bloqueio.current || lendo) return
    if (modo === 'supabase' && acao !== 'limpar' && !chave.trim()) { definirErro('Informe a chave administrativa.'); return }
    if (acao === 'limpar' && confirmacao !== 'EXCLUIR TUDO') return
    if (acao === 'importar' && !backup) return
    bloqueio.current = true; definirOcupado(true); definirErro('')
    try {
      if (acao === 'exportar') {
        baixarBackup(await exportar(chave))
        concluir('Arquivo JSON exportado. Guarde o backup em local autorizado, pois contém respostas individuais.')
      } else if (acao === 'importar' && backup) {
        const resultado = await importar(backup, chave)
        concluir(`Importação concluída: ${resultado.importados} diagnóstico(s) adicionado(s); ${resultado.ignorados} ID(s) já existente(s) ignorado(s).`)
      } else {
        const resultado = await limpar(confirmacao, chave)
        concluir(`Base de dados limpa: ${resultado.excluidos} diagnóstico(s) excluído(s).`)
      }
    } catch (erro) {
      definirErro(erro instanceof Error ? erro.message : 'Não foi possível concluir a operação.')
      bloqueio.current = false; definirOcupado(false)
    }
  }
  return <dialog ref={dialogo} className="dialogo-dados" aria-labelledby="titulo-dialogo" onCancel={evento => { evento.preventDefault(); if (!ocupado) fechar() }}>
    <form onSubmit={executar}>
      <h2 id="titulo-dialogo">{titulos[acao]}</h2>
      <p className="texto-apoio">{modo === 'demonstracao' ? 'Demonstração: a operação afeta somente os dados em memória desta aba.' : 'Operação administrativa sobre a base compartilhada do Supabase.'}</p>
      <fieldset disabled={ocupado} className="campos-dialogo">
        {modo === 'supabase' && acao !== 'limpar' && <><label htmlFor="chave-administrativa">Chave administrativa</label><input id="chave-administrativa" type="password" autoComplete="off" value={chave} onChange={evento => definirChave(evento.target.value)}/><p className="texto-apoio">Use a chave de administração definida para este aplicativo. Não informe a service_role. A chave é descartada ao fechar.</p></>}
        {acao === 'exportar' && <p>O JSON incluirá os diagnósticos e suas respostas, para permitir restauração. Este arquivo não deve ser compartilhado publicamente.</p>}
        {acao === 'importar' && <><label htmlFor="arquivo-json">Arquivo JSON de backup</label><input id="arquivo-json" type="file" accept=".json,application/json" onChange={evento => void selecionarArquivo(evento.target.files?.[0])}/><p className="texto-apoio">Até 5 MB e 5.000 diagnósticos. As notas serão recalculadas. IDs já existentes serão ignorados; dados atuais não serão sobrescritos.</p>{lendo && <p role="status">Validando arquivo…</p>}{backup && <p className="aviso sucesso">Arquivo válido: {backup.diagnosticos.length} diagnóstico(s) para importar.</p>}</>}
        {acao === 'limpar' && <><p className="alerta-exclusao">Todos os diagnósticos serão excluídos ({diagnosticos.length} atualmente no painel). A exclusão não pode ser desfeita na aplicação. Você pode exportar um backup antes.</p><label htmlFor="confirmacao-exclusao">Digite EXCLUIR TUDO para confirmar</label><input id="confirmacao-exclusao" value={confirmacao} autoComplete="off" onChange={evento => definirConfirmacao(evento.target.value)}/></>}
      </fieldset>
      {erro && <p role="alert" className="erro">{erro}</p>}
      <div className="acoes-dialogo"><button className="botao-secundario" type="button" disabled={ocupado} onClick={fechar}>Cancelar</button><button className={acao === 'limpar' ? 'botao botao-perigo' : 'botao'} type="submit" disabled={ocupado || lendo || (acao === 'importar' && !backup) || (acao === 'limpar' && confirmacao !== 'EXCLUIR TUDO')}>{ocupado ? 'Processando…' : acao === 'limpar' ? 'Confirmar exclusão de todos os dados' : acao === 'exportar' ? 'Baixar JSON' : 'Confirmar importação'}</button></div>
    </form>
  </dialog>
}
export function GerenciarDados() {
  const [acao, definirAcao] = useState<Acao | null>(null)
  const [mensagem, definirMensagem] = useState('')
  const origem = useRef<HTMLButtonElement | null>(null)
  function fechar() { definirAcao(null); origem.current?.focus() }
  return <section className="cartao gestao-dados" aria-label="Dados do sistema">
    <div><h2>Dados do sistema</h2><p className="texto-apoio">Backup, restauração e limpeza dos diagnósticos.</p></div>
    <div className="botoes-dados">{(['exportar', 'importar', 'limpar'] as const).map(item => <button key={item} className={`botao-secundario ${item === 'limpar' ? 'texto-perigo' : ''}`} type="button" aria-haspopup="dialog" onClick={evento => { origem.current = evento.currentTarget; definirMensagem(''); definirAcao(item) }}>{item === 'exportar' ? 'Exportar JSON' : item === 'importar' ? 'Importar JSON' : 'Limpar base de dados'}</button>)}</div>
    {mensagem && <p role="status" className="mensagem-dados">{mensagem}</p>}
    {acao && <DialogoDados acao={acao} fechar={fechar} concluir={mensagem => { definirMensagem(mensagem); fechar() }}/>}
  </section>
}


