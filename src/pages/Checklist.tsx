import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { alternativas, dimensoes, type Resposta } from '../data/perguntas'
import { normalizarNome, validarFormulario } from '../utils/validacao'
import { versaoQuestionario } from '../utils/pontuacao'
import { useDiagnosticos } from '../contexts/Diagnosticos'
export function Checklist() {
  const navegar = useNavigate()
  const { enviarDiagnostico, modo } = useDiagnosticos()
  const [nome, definirNome] = useState('')
  const [respostas, definirRespostas] = useState<Record<string, Resposta>>({})
  const [erros, definirErros] = useState<Record<string, string>>({})
  const [enviando, definirEnviando] = useState(false)
  const bloqueio = useRef(false)
  const resumo = useRef<HTMLDivElement>(null)
  const tentativa = useRef<{ conteudo: string; id: string } | null>(null)
  const [erroEnvio, definirErroEnvio] = useState('')
  function focarErro(id: string) {
    const campo = document.getElementById(id)
    if (campo instanceof HTMLInputElement) campo.focus()
    else campo?.querySelector<HTMLInputElement>('input')?.focus()
  }
  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (bloqueio.current) return
    const novosErros = validarFormulario(nome, respostas)
    definirErros(novosErros)
    if (Object.keys(novosErros).length) { requestAnimationFrame(() => resumo.current?.focus()); return }
    bloqueio.current = true
    definirEnviando(true)
    definirNome(normalizarNome(nome))
    definirErroEnvio('')
    const dados = { instituicao: normalizarNome(nome), respostas, versaoQuestionario }
    const conteudo = JSON.stringify(dados)
    if (tentativa.current?.conteudo !== conteudo) tentativa.current = { conteudo, id: crypto.randomUUID() }
    try {
      const diagnostico = await enviarDiagnostico({ ...dados, idEnvio: tentativa.current.id })
      navegar('/', { state: { enviado: true, simulacao: modo === 'demonstracao', diagnosticoId: diagnostico.id } })
    } catch (erro) {
      definirErroEnvio(erro instanceof Error ? erro.message : 'Falha de comunicação. Suas respostas foram preservadas; tente novamente.')
      bloqueio.current = false
      definirEnviando(false)
    }
  }
  return <main id="conteudo" className="limite formulario pb-12"><Link to="/" className="voltar">← Voltar ao painel</Link><div className="introducao"><div><p className="sobretitulo">UM PASSO PARA CUIDAR DO ACERVO</p><h1>Checklist de segurança</h1><p className="subtitulo">20 perguntas para refletir sobre as práticas da sua instituição.</p></div></div>
    <div className="aviso"><strong>Os resultados resumidos do diagnóstico são públicos.</strong> Use um nome fictício. Não informe vulnerabilidades reais de instituições identificáveis sem autorização. {modo === 'demonstracao' ? 'Modo de demonstração: os dados ficam somente na memória desta aba e são descartados ao recarregar.' : 'As respostas são enviadas com segurança e o painel publica somente o resumo didático.'}</div>
    <form noValidate onSubmit={enviar}>
      <section className="cartao p-6 mb-6"><h2>Sobre a instituição</h2><label className="label-nome" htmlFor="instituicao">Nome da instituição <span>(obrigatório)</span></label><input id="instituicao" value={nome} required maxLength={120} onChange={e => definirNome(e.target.value)} onBlur={() => definirNome(normalizarNome(nome))} aria-invalid={!!erros.instituicao} aria-describedby="ajuda-nome erro-instituicao" placeholder="Ex.: Arquivo Memórias do Bairro"/><p id="ajuda-nome" className="texto-apoio">De 3 a 120 caracteres. Nomes fictícios são bem-vindos.</p><p id="erro-instituicao" className="erro">{erros.instituicao}</p></section>
      <div className="progresso"><span><strong>{Object.keys(respostas).length} de 20</strong> perguntas respondidas</span><span>Todas são obrigatórias</span><progress aria-label="Perguntas respondidas" value={Object.keys(respostas).length} max={20}/></div>
      {Object.keys(erros).length > 0 && <div ref={resumo} tabIndex={-1} role="alert" className="aviso erro-resumo"><strong>Revise os campos para continuar.</strong><ul>{Object.entries(erros).map(([id, mensagem]) => <li key={id}><button type="button" onClick={() => focarErro(id)}>{id === 'instituicao' ? 'Nome da instituição' : id}: {mensagem}</button></li>)}</ul></div>}
      {dimensoes.map((d, indice) => <section className="cartao grupo" key={d.id} aria-labelledby={`titulo-${d.id}`}><div className="titulo-grupo"><span className="numero">0{indice + 1}</span><div><h2 id={`titulo-${d.id}`}>{d.nome}</h2><p className="texto-apoio">{d.perguntas.length} perguntas · peso de {d.peso}% na nota final</p></div></div>{d.perguntas.map(([id, texto]) => <fieldset id={id} key={id} aria-describedby={erros[id] ? `erro-${id}` : undefined} aria-invalid={!!erros[id]}><legend><small>{id}</small>{texto} <span className="sr-only">(obrigatória)</span></legend><div className="alternativas">{alternativas.map(a => <label key={a.valor} className={respostas[id] === a.valor ? 'selecionada' : ''}><input required type="radio" name={id} value={a.valor} checked={respostas[id] === a.valor} onChange={() => definirRespostas(atual => ({ ...atual, [id]: a.valor }))}/>{a.rotulo}</label>)}</div>{erros[id] && <p id={`erro-${id}`} className="erro">{erros[id]}</p>}</fieldset>)}</section>)}
      {erroEnvio && <p role="alert" className="aviso erro-resumo">{erroEnvio} As respostas preenchidas foram preservadas.</p>}
      <div className="envio"><p>{modo === 'demonstracao' ? 'Prévia local: os dados ficam somente em memória e serão descartados ao recarregar.' : 'O envio será validado e pontuado no servidor. Aguarde a confirmação para retornar ao painel.'}</p><button className="botao" disabled={enviando} type="submit">{enviando ? modo === 'demonstracao' ? 'Validando demonstração…' : 'Enviando diagnóstico…' : 'Enviar diagnóstico'}</button></div>
    </form></main>
}



