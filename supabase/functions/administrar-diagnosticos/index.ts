import { criarHandler } from '../_shared/handlers.ts'
import { criarDependencias } from '../_shared/servidor.ts'
Deno.serve(criarHandler('administrar', criarDependencias(nome => Deno.env.get(nome))))
