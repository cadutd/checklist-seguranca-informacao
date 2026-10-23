import { useEffect, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { Diagnostico } from '../types/diagnostico'
import { analisarDimensoes } from '../utils/resumo'

const formato = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
export function DetalheInstituicao({ diagnostico, fechar }: { diagnostico: Diagnostico; fechar: () => void }) {
  const titulo = useRef<HTMLHeadingElement>(null)
  const { notas, pontosFortes, melhorias } = analisarDimensoes(diagnostico)
  useEffect(() => { titulo.current?.focus() }, [diagnostico.id])
  return <section id="detalhe-instituicao" className="cartao detalhe" aria-labelledby="titulo-detalhe">
    <div className="cabecalho-detalhe"><div><p className="sobretitulo">DETALHAMENTO INDIVIDUAL</p><h2 id="titulo-detalhe" tabIndex={-1} ref={titulo}>{diagnostico.instituicao}</h2></div><button type="button" className="botao-secundario" onClick={fechar}>Fechar detalhe</button></div>
    <dl className="resumo-individual"><div><dt>Nota final</dt><dd><strong>{formato.format(diagnostico.nota)}</strong> / 100</dd></div><div><dt>Classificação didática</dt><dd>{diagnostico.classificacao}</dd></div><div><dt>Respostas “Não sei”</dt><dd>{diagnostico.quantidadeNaoSei} de 20</dd></div></dl>
    <h3>Notas das cinco dimensões</h3>
    <div className="area-grafico" role="img" aria-label={notas.map(d => `${d.nome}: ${formato.format(d.nota)} pontos`).join('; ')}>
      <ResponsiveContainer width="100%" height="100%"><BarChart data={notas} layout="vertical" margin={{ right: 18 }}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" domain={[0, 100]}/><YAxis type="category" dataKey="nome" width={155} tick={{ fontSize: 11 }}/><Tooltip/><Bar dataKey="nota" name="Nota da dimensão" fill="#176d78" barSize={24} radius={[0, 5, 5, 0]} isAnimationActive={false}/></BarChart></ResponsiveContainer>
    </div>
    <dl className="notas-detalhe">{notas.map(d => <div key={d.nome}><dt>{d.nome}</dt><dd>{formato.format(d.nota)} / 100</dd></div>)}</dl>
    <p className="texto-apoio">Critério didático de orientação: dimensões com 80 pontos ou mais são pontos fortes; abaixo de 80 pontos, precisam de melhoria.</p>
    <div className="orientacoes"><div><h3>Pontos fortes</h3>{pontosFortes.length ? <ul>{pontosFortes.map(d => <li key={d.nome}>{d.nome}</li>)}</ul> : <p>Nenhuma dimensão atingiu 80 pontos. Comece com pequenas ações de proteção.</p>}</div><div><h3>Dimensões que precisam de melhoria</h3>{melhorias.length ? <ul>{melhorias.map(d => <li key={d.nome}>{d.nome}</li>)}</ul> : <p>Todas as dimensões atingiram 80 pontos ou mais. Mantenha e revise essas práticas.</p>}</div></div>
    <p className="texto-apoio">Pontuação exclusivamente didática, sem caráter de certificação ou auditoria. Somente o resumo é exibido; as respostas individuais não são publicadas.</p>
  </section>
}

