import { useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Cabecalho } from './components/Cabecalho'
import { Painel } from './pages/Painel'
import { Checklist } from './pages/Checklist'
import { ProvedorDiagnosticos } from './contexts/Diagnosticos'
function Paginas() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0); document.title = `${pathname === '/checklist' ? 'Checklist' : 'Painel'} | Diagnóstico de Segurança Digital` }, [pathname])
  return <><Cabecalho/><Routes><Route path="/" element={<Painel/>}/><Route path="/checklist" element={<Checklist/>}/><Route path="*" element={<Painel/>}/></Routes><footer className="limite rodape">Segurança digital se constrói em comunidade.<span>Avaliação didática para arquivos comunitários</span></footer></>
}
export default function App() { return <ProvedorDiagnosticos><HashRouter><Paginas/></HashRouter></ProvedorDiagnosticos> }



