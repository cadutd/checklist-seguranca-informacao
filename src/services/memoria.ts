import { registrosDemonstrativos } from '../data/diagnosticos'
import { criarBackup, validarBackup, validarEnvio, resumirRegistro } from '../../supabase/functions/_shared/contratos.ts'
import type { RepositorioDiagnosticos, RegistroBackup } from './repositorio'
import { capacidadeDiagnosticos, ErroCapacidade } from '../../supabase/functions/_shared/capacidade.ts'

export function criarRepositorioMemoria(iniciais: RegistroBackup[] = registrosDemonstrativos): RepositorioDiagnosticos {
  let registros = structuredClone(iniciais)
  return {
    modo: 'demonstracao', iniciais: registros.map(resumirRegistro),
    async listar() { return registros.map(resumirRegistro) },
    async enviar(entrada) {
      const envio = validarEnvio(entrada)
      await new Promise(resolve => setTimeout(resolve, 150))
      const existente = registros.find(r => r.id === envio.idEnvio)
      if (existente) return resumirRegistro(existente)
      if (registros.length >= capacidadeDiagnosticos) throw new ErroCapacidade()
      const registro = { id: envio.idEnvio, instituicao: envio.instituicao, respostas: envio.respostas, criadoEm: new Date().toISOString(), versaoQuestionario: envio.versaoQuestionario }
      registros = [registro, ...registros]
      return resumirRegistro(registro)
    },
    async exportar() { return criarBackup(structuredClone(registros)) },
    async importar(entrada) {
      const backup = validarBackup(entrada)
      const ids = new Set(registros.map(r => r.id))
      const novos = backup.diagnosticos.filter(r => !ids.has(r.id))
      if (registros.length + novos.length > capacidadeDiagnosticos) throw new ErroCapacidade()
      registros = [...novos, ...registros]
      return { importados: novos.length, ignorados: backup.diagnosticos.length - novos.length }
    },
    async limpar(confirmacao) {
      if (confirmacao !== 'EXCLUIR TUDO') throw new Error('Digite EXCLUIR TUDO para confirmar a exclusão.')
      const excluidos = registros.length
      registros = []
      return { excluidos }
    },
  }
}
