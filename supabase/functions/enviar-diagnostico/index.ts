import { criarHandler } from '../_shared/handlers.ts'
import { criarDependencias } from '../_shared/servidor.ts'
Deno.serve(criarHandler('enviar', criarDependencias(nome => Deno.env.get(nome))))
