import { validarBackup, limiteArquivo } from '../../supabase/functions/_shared/contratos.ts'
import type { Backup } from '../services/repositorio'

export async function lerBackup(arquivo: File): Promise<Backup> {
  if (arquivo.size > limiteArquivo) throw new Error('O arquivo deve ter no máximo 5 MB.')
  const texto = await new Promise<string>((resolver, rejeitar) => {
    const leitor = new FileReader()
    leitor.onerror = () => rejeitar(new Error('Não foi possível ler o arquivo selecionado.'))
    leitor.onload = () => resolver(String(leitor.result))
    leitor.readAsText(arquivo, 'utf-8')
  })
  let valor: unknown
  try { valor = JSON.parse(texto) } catch { throw new Error('O arquivo não contém um JSON válido.') }
  return validarBackup(valor)
}
export function baixarBackup(backup: Backup) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `diagnosticos-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
