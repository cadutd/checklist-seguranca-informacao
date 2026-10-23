import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { Diagnostico } from '../types/diagnostico'

interface Propriedades {
  diagnosticos: Diagnostico[]
  selecionado: string | null
  selecionar: (id: string) => void
}
export function GraficoInstituicoes({ diagnosticos, selecionado, selecionar }: Propriedades) {
  return <section className="cartao grafico">
    <h2>Um olhar sobre as instituições</h2>
    <p className="texto-apoio">Selecione uma barra para ver o detalhe. Pelo teclado, use Tab e Enter ou Espaço.</p>
    <div className="area-grafico" role="group" aria-label="Selecionar instituição pelo gráfico">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={diagnosticos} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
          <XAxis type="number" domain={[0, 100]}/>
          <YAxis type="category" dataKey="instituicao" width={145} tick={{ fontSize: 11 }}/>
          <Tooltip/>
          <Bar dataKey="nota" name="Nota final" isAnimationActive={false} barSize={24} shape={propriedades => {
            const { x, y, width, height, index } = propriedades as { x: number; y: number; width: number; height: number; index: number }
            const diagnostico = diagnosticos[index]
            return <g role="button" tabIndex={0} className="barra-selecionavel"
              aria-label={`Ver diagnóstico de ${diagnostico.instituicao}: ${diagnostico.nota} pontos`}
              aria-pressed={selecionado === diagnostico.id} aria-controls="detalhe-instituicao"
              onClick={() => selecionar(diagnostico.id)} onKeyDown={evento => {
                if (evento.key === 'Enter' || evento.key === ' ') { evento.preventDefault(); selecionar(diagnostico.id) }
              }}>
              <rect x={x} y={y} width={Math.max(width, 24)} height={height} fill="transparent"/>
              <rect x={x} y={y} width={width} height={height} fill={selecionado === diagnostico.id ? '#122f49' : '#176d78'} rx={5}/>
            </g>
          }}/>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </section>
}
