# Revisão de segurança da publicação

Data: 22/10/2026. Escopo: React/Vite, Edge Functions, permissões do PostgreSQL e pipeline de publicação. Não constitui auditoria ou certificação.

## Resultado

Não foram identificadas vulnerabilidades conhecidas nas dependências de produção pelo `npm audit --omit=dev`. Os testes verificam os limites de acesso com os papéis reais `anon` e `authenticated` em PostgreSQL embarcado. A integração hospedada também foi testada com dados sintéticos em base vazia antes da publicação.

## Reforços aplicados

1. **REV-01 — leitura pública, reforço concluído (baixo).** A view original projetava somente colunas públicas, mas usava os privilégios de seu proprietário. A migration `20261023021117_protecao_projecao_publica.sql:2` ativa `security_invoker`; a leitura passa por RLS e grants de coluna. `respostas` continua sem grant público. Os testes negam SELECT completo, SELECT de respostas, INSERT, UPDATE, DELETE e chamadas administrativas públicas.
2. **REV-02 — função administrativa, reforço concluído (baixo).** `supabase/config.toml:11` mantém a verificação JWT da plataforma. A chave pública anon JWT enviada em `src/services/supabase.ts` é independente de `ADMIN_API_TOKEN`, verificado em `supabase/functions/_shared/handlers.ts`. O token administrativo não é colocado no corpo, no armazenamento do navegador, no bundle ou no Git. A tentativa de publicar a administração sem a verificação JWT foi bloqueada pela revisão automática e substituída por essa configuração.
3. **REV-03 — cadeia de publicação, concluído.** Ações fixadas por SHA, lockfile versionado, permissões mínimas por job e publicação apenas de `dist/`. A revisão de segredos confirma que `.env.local` e `.env.functions.local` são ignorados. O build recusa chave privilegiada no campo público e configura uma CSP para scripts da própria origem e conexão à API do projeto.

A CSP permite estilos inline porque o Recharts usa atributos de estilo; scripts inline e eval permanecem bloqueados. Não há scripts de CDN, HTML arbitrário, eval ou armazenamento de chaves em localStorage/sessionStorage.

## Avisos informativos e limites conhecidos

- O Advisor indica RLS sem políticas em `privado.envios` e `privado.limites`. É intencional: schemas/tabelas privados não são acessíveis aos usuários públicos; somente `service_role`, com privilégios explícitos e BYPASSRLS do servidor, opera os controles. Não se deve adicionar política pública para eliminar esse aviso. [Explicação do Advisor](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Índices novos podem aparecer como ainda não utilizados enquanto a base está vazia. Foram mantidos para consultas por data/nota, idempotência e chave estrangeira. [Explicação do Advisor](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).
- A origem/IP não autentica participantes. Há limites por HMAC da origem e um limite global, mas a aplicação pública permanece sujeita a abuso e às cotas gratuitas.
- O GitHub Pages não oferece configuração de cabeçalhos HTTP por aplicação neste repositório. A CSP é entregue por meta tag, que não implementa proteções como `frame-ancestors`; não se afirma proteção contra enquadramento onde ela não foi configurada na infraestrutura.
- O backup contém respostas individuais e exige a chave administrativa. A proteção desse arquivo após o download é responsabilidade de quem o exportou.

## Evidências

- Suíte de testes em `tests/`: pontuação, validação de JSON, importação atômica, negação de acessos, controle de abuso, idempotência, confirmação de limpeza, carregamento, polling e preservação do formulário.
- `scripts/verificar-build.mjs`: configuração pública e caminho dos artefatos.
- `scripts/verificar-producao.mjs`: checagem somente de leitura da publicação e privacidade da API.
- Teste remoto inicial: nota 100 para vinte respostas sim, retorno público sem respostas, retry sem duplicação, backup completo, limpeza recusada sem confirmação, restauração e importação sem duplicação. Base vazia ao terminar.
