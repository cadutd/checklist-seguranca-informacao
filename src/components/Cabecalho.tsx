import { NavLink } from 'react-router-dom'
export function Cabecalho() {
  return <><a className="pular" href="#conteudo">Pular para o conteúdo</a><header className="cabecalho"><div className="limite flex flex-wrap items-center justify-between gap-5"><NavLink to="/" className="marca"><span className="simbolo" aria-hidden="true">◇</span><span>Segurança Digital<small>ARQUIVOS COMUNITÁRIOS</small></span></NavLink><nav aria-label="Navegação principal" className="flex gap-2"><NavLink end to="/" className="nav-link">Painel de resultados</NavLink><NavLink to="/checklist" className="nav-link">Responder checklist</NavLink></nav></div></header></>
}
