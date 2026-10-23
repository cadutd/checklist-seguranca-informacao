// Compartilhada pelo Vite e pelo navegador: impede que uma chave privilegiada
// seja incorporada ao build, antes de qualquer arquivo público ser gerado.
export function validarChavePublica(chave: string) {
  if (chave.startsWith('sb_secret_')) throw new Error('Use somente a chave pública anon ou publishable do Supabase.')
  if (chave.startsWith('eyJ')) {
    try {
      const partes = chave.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
      if (JSON.parse(atob(partes)).role !== 'anon') throw new Error()
    } catch { throw new Error('Use somente a chave pública anon ou publishable do Supabase.') }
  } else if (!chave.startsWith('sb_publishable_')) throw new Error('Chave pública do Supabase inválida.')
}
