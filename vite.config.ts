import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { validarChavePublica } from './src/services/chavePublica'

export default defineConfig(({ mode }) => {
  const ambiente = loadEnv(mode, '.', 'VITE_')
  if (ambiente.VITE_SUPABASE_ANON_KEY?.trim()) validarChavePublica(ambiente.VITE_SUPABASE_ANON_KEY.trim())
  return {
    base: ambiente.VITE_BASE_PATH || '/',
    plugins: [react(), tailwindcss(), {
      name: 'politica-conteudo-producao',
      apply: 'build',
      transformIndexHtml() {
        const conexao = ambiente.VITE_SUPABASE_URL ? new URL(ambiente.VITE_SUPABASE_URL).origin : ''
        return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ${conexao}; base-uri 'self'; form-action 'self'; object-src 'none'` }, injectTo: 'head-prepend' }]
      },
    }],
    build: { rollupOptions: { output: { manualChunks: { graficos: ['recharts'], react: ['react', 'react-dom', 'react-router-dom'] } } } },
    test: { environment: 'jsdom', setupFiles: './tests/configuracao.ts', css: false },
  }
})


