import type { Backup, Envio, RegistroBackup } from '../../supabase/functions/_shared/contratos.ts'
import type { Diagnostico } from '../types/diagnostico'
export interface ResultadoImportacao { importados: number; ignorados: number }
export interface RepositorioDiagnosticos {
  modo: 'demonstracao' | 'supabase'
  iniciais?: Diagnostico[]
  listar(): Promise<Diagnostico[]>
  enviar(envio: Envio): Promise<Diagnostico>
  exportar(): Promise<Backup>
  importar(backup: Backup): Promise<ResultadoImportacao>
  limpar(confirmacao: string): Promise<{ excluidos: number }>
}
export type { Backup, Envio, RegistroBackup }
