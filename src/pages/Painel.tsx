import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useDiagnosticos } from '../contexts/Diagnosticos'
import { resumirDiagnosticos } from '../utils/resumo'
import { GraficoInstituicoes } from '../components/GraficoInstituicoes'
import { DetalheInstituicao } from '../components/DetalheInstituicao'
import { GerenciarDados } from '../components/GerenciarDados'

const formato = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
export function Painel() {
  const { diagnosticos, modo, carregando, erro, atualizar } = useDiagnosticos()
  useEffect(() => {
    void atualizar()
    const intervalo = setInterval(() => void atualizar(), 15000)
    return () => clearInterval(intervalo)
  }, [atualizar])
  const [ordem, definirOrdem] = useState<'nome' | 'nota'>('nota')
  const [crescente, definirCrescente] = useState(false)
  const local = useLocation()
  const [selecionado, selecionar] = useState<string | null>(local.state?.diagnosticoId ?? null)
  const diagnosticoSelecionado = diagnosticos.find(d => d.id === selecionado)
  const resumo = resumirDiagnosticos(diagnosticos)
  function ordenar(campo: 'nome' | 'nota') { definirOrdem(campo); definirCrescente(campo === ordem ? !crescente : true) }
  function fecharDetalhe() { selecionar(null); document.getElementById(`selecionar-${selecionado}`)?.focus() }
  const lista = [...diagnosticos].sort((a, b) => (ordem === 'nome' ? a.instituicao.localeCompare(b.instituicao, 'pt-BR') : a.nota - b.nota) * (crescente ? 1 : -1))
  return <main id="conteudo" className="limite pb-12">
    <section className="introducao"><div><p className="sobretitulo">CONHECER PARA PROTEGER</p><h1>Diagnóstico de Segurança Digital</h1><p className="subtitulo">Avaliação de segurança da informação para arquivos comunitários</p></div><Link className="botao" to="/checklist">Responder checklist <span aria-hidden="true">↗</span></Link></section>
    {local.state?.enviado && <p role="status" className="aviso sucesso">{modo === 'demonstracao' ? 'Prévia calculada! Os dados estão somente na memória desta aba e serão descartados ao recarregar.' : 'Diagnóstico gravado com sucesso! O resultado foi confirmado pelo servidor.'}</p>}
    <div className="aviso"><strong>{modo === 'demonstracao' ? 'Modo demonstrativo' : 'Resultados públicos'}</strong><span> {modo === 'demonstracao' ? 'Sem Supabase configurado: dados fictícios e operações somente em memória. ' : ''}A pontuação é didática e não representa certificação, auditoria ou conformidade.</span></div>
    <GerenciarDados/>
    <div className="estado-consulta"><p className="texto-apoio">{carregando ? 'Consultando resultados…' : 'Resultados atualizados automaticamente a cada 15 segundos.'}</p><button type="button" className="botao-secundario" disabled={carregando} onClick={() => void atualizar()}>Atualizar resultados</button></div>
    {carregando && diagnosticos.length === 0 && <p role="status" className="aviso">Carregando diagnósticos…</p>}
    {erro && <p role="alert" className="aviso erro-resumo">{erro} {diagnosticos.length > 0 && 'Os últimos resultados disponíveis foram preservados.'}</p>}
    {!carregando && !erro && diagnosticos.length === 0 && <section className="cartao estado-vazio"><h2>Nenhum diagnóstico encontrado</h2><p>Responda ao checklist para começar a construir o painel coletivo.</p><Link to="/checklist" className="botao">Responder ao primeiro checklist</Link></section>}
    <section aria-label="Indicadores dos diagnósticos" className="indicadores">{[['Diagnósticos realizados', resumo.quantidade, 'diagnósticos no painel'], ['Média geral', resumo.media, 'pontos de 100'], ['Maior nota', resumo.maior, 'pontos de 100'], ['Menor nota', resumo.menor, 'pontos de 100']].map(([titulo, valor, apoio]) => <article className="cartao indicador" key={titulo}><p>{titulo}</p><strong>{formato.format(Number(valor))}</strong><small>{apoio}</small></article>)}</section>
    {diagnosticos.length > 0 && <>
    {diagnosticoSelecionado && <DetalheInstituicao diagnostico={diagnosticoSelecionado} fechar={fecharDetalhe}/>}
    <GraficoInstituicoes diagnosticos={diagnosticos} selecionado={selecionado} selecionar={selecionar}/>
    <div className="graficos-secundarios"><section className="cartao grafico"><h2>As cinco dimensões</h2><p className="texto-apoio">Médias por dimensão · escala de 0 a 100</p><div className="area-grafico" role="img" aria-label={resumo.mediasDimensoes.map(d => `${d.nome}: ${formato.format(d.nota)}`).join('; ')}><ResponsiveContainer width="100%" height="100%"><BarChart data={resumo.mediasDimensoes} layout="vertical" margin={{ right: 12 }}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" domain={[0, 100]}/><YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 11 }}/><Tooltip/><Bar dataKey="nota" name="Média" fill="#176d78" radius={[0, 5, 5, 0]} isAnimationActive={false}/></BarChart></ResponsiveContainer></div><p className="texto-apoio">{resumo.mediasDimensoes.map(d => `${d.nome}: ${formato.format(d.nota)}`).join(' · ')}</p></section>
    <section className="cartao grafico"><h2>Classificações didáticas</h2><p className="texto-apoio">Distribuição das instituições no painel</p><div className="area-grafico" role="img" aria-label={resumo.distribuicao.map(d => `${d.nome}: ${d.quantidade}`).join('; ')}><ResponsiveContainer width="100%" height="100%"><BarChart data={resumo.distribuicao} layout="vertical"><XAxis type="number" allowDecimals={false} domain={[0, Math.max(1, diagnosticos.length)]}/><YAxis type="category" dataKey="nome" width={135} tick={{ fontSize: 11 }}/><Tooltip/><Bar dataKey="quantidade" name="Instituições" fill="#41648a" barSize={20} radius={[0, 5, 5, 0]} isAnimationActive={false}/></BarChart></ResponsiveContainer></div></section></div>
    <section className="cartao tabela"><div className="p-6"><h2>Resultados das instituições</h2><p className="texto-apoio">Selecione o nome para ver o detalhe. Ordene por instituição ou nota usando os títulos.</p></div><div className="overflow-x-auto"><table><caption className="sr-only">Diagnósticos das instituições</caption><thead><tr><th aria-sort={ordem === 'nome' ? crescente ? 'ascending' : 'descending' : 'none'}><button onClick={() => ordenar('nome')}>Instituição ↕</button></th><th aria-sort={ordem === 'nota' ? crescente ? 'ascending' : 'descending' : 'none'}><button onClick={() => ordenar('nota')}>Nota final ↕</button></th><th>Classificação</th><th>Data do diagnóstico</th></tr></thead><tbody>{lista.map(d => <tr key={d.id}><th scope="row"><button type="button" id={`selecionar-${d.id}`} className="seletor-instituicao" aria-controls="detalhe-instituicao" aria-expanded={selecionado === d.id} onClick={() => selecionar(d.id)}>{d.instituicao}</button></th><td><strong>{formato.format(d.nota)}</strong><small> / 100</small></td><td><span className="etiqueta">{d.classificacao}</span></td><td>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(d.data.length === 10 ? `${d.data}T12:00:00Z` : d.data))}</td></tr>)}</tbody></table></div></section>
    </>}
  </main>
}




