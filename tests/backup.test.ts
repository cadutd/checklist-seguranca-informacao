import { describe, expect, it } from 'vitest'
import { criarBackup, validarBackup, validarEnvio, resumirRegistro } from '../supabase/functions/_shared/contratos.ts'
import { registrosDemonstrativos } from '../src/data/diagnosticos'
import { criarRepositorioMemoria } from '../src/services/memoria'

describe('Backup e restauração em JSON', () => {
  it('exporta os dados necessários e restaura preservando IDs, respostas e datas', async () => {
    const repositorio = criarRepositorioMemoria()
    const backup = await repositorio.exportar('')
    expect(backup.diagnosticos).toHaveLength(5)
    expect(backup.diagnosticos[0].respostas.COMP01).toBe('sim')
    expect(backup.diagnosticos[0]).not.toHaveProperty('nota')
    expect(backup).not.toHaveProperty('chave')
    await repositorio.limpar('EXCLUIR TUDO', '')
    expect(await repositorio.listar()).toEqual([])
    expect(await repositorio.importar(JSON.parse(JSON.stringify(backup)), '')).toEqual({ importados: 5, ignorados: 0 })
    expect(await repositorio.listar()).toEqual(registrosDemonstrativos.map(resumirRegistro))
    expect(await repositorio.importar(backup, '')).toEqual({ importados: 0, ignorados: 5 })
  })
  it('não modifica a base quando qualquer registro é inválido', async () => {
    const repositorio = criarRepositorioMemoria([])
    const backup = criarBackup(registrosDemonstrativos)
    backup.diagnosticos[4].respostas.COMP01 = 'talvez' as never
    await expect(repositorio.importar(backup, '')).rejects.toThrow('Diagnóstico 5')
    expect(await repositorio.listar()).toEqual([])
  })
  it('rejeita formato, versão, IDs repetidos, datas e campos extras', () => {
    const backup = criarBackup(registrosDemonstrativos)
    expect(() => validarBackup({ ...backup, versao: 2 })).toThrow()
    expect(() => validarBackup({ ...backup, formato: 'outro' })).toThrow()
    expect(() => validarBackup({ ...backup, diagnosticos: [backup.diagnosticos[0], backup.diagnosticos[0]] })).toThrow()
    expect(() => validarBackup({ ...backup, diagnosticos: [{ ...backup.diagnosticos[0], criadoEm: '2026-02-31T00:00:00.000Z' }] })).toThrow()
    expect(() => validarBackup({ ...backup, diagnosticos: [{ ...backup.diagnosticos[0], nota: 100 }] })).toThrow()
    expect(() => validarBackup({ ...backup, diagnosticos: [{ ...backup.diagnosticos[0], id: 'invalido' }] })).toThrow()
    expect(() => validarBackup({ ...backup, diagnosticos: Array(5001).fill(backup.diagnosticos[0]) })).toThrow()
  })
  it('exige confirmação exata e não limpa a base se ela faltar', async () => {
    const repositorio = criarRepositorioMemoria()
    await expect(repositorio.limpar('excluir tudo', '')).rejects.toThrow()
    expect(await repositorio.listar()).toHaveLength(5)
    expect(await repositorio.limpar('EXCLUIR TUDO', '')).toEqual({ excluidos: 5 })
  })
  it('rejeita notas fornecidas no envio e usa ordem canônica das respostas', () => {
    const dados = { instituicao: 'Arquivo', respostas: registrosDemonstrativos[0].respostas, versaoQuestionario: 1, idEnvio: crypto.randomUUID() }
    expect(() => validarEnvio({ ...dados, nota_total: 100 })).toThrow()
    expect(() => validarEnvio({ ...dados, versaoQuestionario: 2 })).toThrow()
    const invertidas = Object.fromEntries(Object.entries(dados.respostas).reverse())
    expect(JSON.stringify(validarEnvio({ ...dados, respostas: invertidas }))).toBe(JSON.stringify(validarEnvio(dados)))
  })
})
