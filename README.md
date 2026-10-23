# Diagnóstico de Segurança Digital

Aplicação didática para arquivos comunitários. React, TypeScript, Vite, Tailwind CSS, Recharts e React Router no frontend; PostgreSQL e Edge Functions no Supabase; publicação estática no GitHub Pages por GitHub Actions.

- Aplicação: https://cadutd.github.io/checklist-seguranca-informacao/
- Código: https://github.com/cadutd/checklist-seguranca-informacao
- Projeto Supabase: `mjjaomrciobpbsozxqcy`, região São Paulo (`sa-east-1`), organização `Amand's Org`, plano Free.

As quatro fases estão implementadas. Somente duas páginas: painel (`/#/`) e checklist (`/#/checklist`). A avaliação é didática e não constitui certificação, auditoria ou conformidade.

## Execução local

Use Node.js 24 e npm.

```powershell
npm ci
npm run dev
```

Com `.env.local` configurado, a execução local usa a base real. Para experimentar sem gravar dados reais, use `VITE_MODO_DEMONSTRACAO=true` nesse arquivo e reinicie o Vite. A demonstração fica somente em memória e é descartada ao recarregar.

## Testes e build

```powershell
npm test
npm run build
npm run verificar:build
npm run preview
```

Os testes são isolados: usam exemplos em memória e PostgreSQL embarcado PGlite. Não acessam nem limpam a base remota. A migration e seus grants/políticas são executados nos testes, incluindo a proibição de leitura das respostas, escrita, alteração e exclusão públicas.

O build gera `dist/`, com a base `/checklist-seguranca-informacao/` definida em `.env.local` e no workflow. `HashRouter` permite atualizar a página interna sem erro 404. O build aplica uma política de conteúdo, mantém scripts na própria origem e permite conexão apenas à API configurada. Não publica source maps nem segredos.

Para conferir a publicação sem criar ou excluir diagnósticos:

```powershell
npm run verificar:producao
```

Esse comando lê `.env.local` ou as variáveis do processo e verifica página, assets, consulta pública e bloqueio das respostas privadas. URL alternativa pode ser passada como argumento.

## Configuração pública do frontend

Copie `.env.example` para `.env.local` e configure:

```dotenv
VITE_SUPABASE_URL=https://mjjaomrciobpbsozxqcy.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA_ANON_JWT
VITE_MODO_DEMONSTRACAO=false
VITE_BASE_PATH=/checklist-seguranca-informacao/
```

Esta publicação usa a chave pública `anon` no formato JWT porque a função administrativa mantém a verificação JWT da plataforma ativa. O navegador envia esse JWT público no cabeçalho Authorization e a chave administrativa do aplicativo em um cabeçalho separado. A chave `anon` não concede leitura das respostas nem escrita direta: RLS, grants e os endpoints continuam impondo as restrições.

Chaves `sb_publishable_...` são compatíveis com as consultas públicas e o envio, mas a administração desta configuração exige a chave pública `anon` JWT. Nunca coloque `service_role`, `sb_secret_...`, `ADMIN_API_TOKEN` ou `RATE_LIMIT_SALT` em variáveis `VITE_*`. O Vite recusa chaves privilegiadas no campo público antes de gerar o build.

Sem URL e chave configuradas, a aplicação exibe explicitamente a demonstração. Uma configuração parcial mostra erro; falhas de rede não provocam troca automática de uma base real por exemplos.

## Administração: exportar, importar e limpar

Os três botões ficam em **Dados do sistema**. Participantes não precisam de cadastro ou login. Exportar e importar exigem a chave do aplicativo `ADMIN_API_TOKEN`. A limpeza exige somente digitar exatamente `EXCLUIR TUDO` e confirmar; qualquer visitante pode executá-la. O JWT público da plataforma continua sendo enviado automaticamente.

- **Exportar JSON**: baixa IDs, nomes, respostas, versão do questionário e datas. O backup não contém credenciais nem controles de requisições.
- **Importar JSON**: valida o arquivo inteiro e recalcula todas as notas no servidor. Preserva IDs e datas; ignora IDs existentes sem sobrescrevê-los. A gravação ocorre em uma única transação. Um registro inválido impede a importação completa.
- **Limpar base de dados**: exige digitar exatamente `EXCLUIR TUDO` e confirmar. Cancelar/Escape não exclui nada. Remove diagnósticos e controles de envio, preservando a estrutura do banco. Não existe desfazer automático; exporte antes se precisar de backup.

Limite da interface: 5 MB e 5.000 diagnósticos. Se a base ultrapassar esse limite, a exportação é recusada integralmente, sem truncamento; utilize as ferramentas administrativas do Supabase.

A chave de administração gerada nesta máquina está na variável `ADMIN_API_TOKEN` do arquivo local `.env.functions.local`. Abra esse arquivo localmente para consultá-la. Não compartilhe o arquivo nem o envie ao GitHub. Ela não é a `service_role`; é digitada somente no diálogo e descartada ao fechá-lo. Os arquivos privados estão no `.gitignore`.

Os backups contêm respostas individuais: guarde-os em local autorizado. O painel público mostra somente resumos.

### Formato do JSON

```json
{
  "formato": "checklist-seguranca-informacao",
  "versao": 1,
  "exportadoEm": "2026-10-22T12:00:00.000Z",
  "diagnosticos": []
}
```

Cada diagnóstico contém exatamente `id` (UUID), `instituicao`, `respostas` (as vinte alternativas), `versaoQuestionario` (1) e `criadoEm` (ISO UTC com milissegundos). Exporte pela interface para obter um exemplo completo. Notas fornecidas pelo cliente são rejeitadas.

## Banco de dados e funções

Migrations versionadas e aplicadas no projeto remoto:

1. `supabase/migrations/20261023021014_diagnosticos.sql`: tabela, índices, projeção pública, limites e RPCs.
2. `supabase/migrations/20261023021117_protecao_projecao_publica.sql`: view com `security_invoker`, permissões por coluna, política de leitura dos resumos e funções administrativas executadas com os privilégios explícitos do servidor.

A tabela completa e a coluna `respostas` são inacessíveis aos papéis públicos. Somente as sete colunas autorizadas podem ser lidas. Não existem grants públicos de INSERT, UPDATE ou DELETE. As tabelas de controle ficam em um schema privado com RLS; somente o papel do servidor consegue operá-las.

O frontend envia nome, vinte respostas, versão e UUID da tentativa. A Edge Function valida o corpo, rejeita campos extras e recalcula a pontuação antes de gravar. A confirmação antecede o sucesso e a navegação. Falhas preservam as respostas, e o retry reutiliza o UUID para evitar duplicação.

O painel consulta ao abrir, ao retornar do formulário e a cada 15 segundos, sem sobrepor consultas pendentes. Respostas antigas não sobrescrevem mutações recentes. Há estados de carregamento, erro e base vazia.

### Atualizar o banco e as funções

A pasta está vinculada ao projeto. Não execute reset na base real.

```powershell
npx supabase migration new nome_da_alteracao
# Edite e teste a nova migration antes de aplicar.
npx supabase db push
```

Para atualizar as funções sem Docker:

```powershell
npx supabase functions deploy enviar-diagnostico --project-ref mjjaomrciobpbsozxqcy --use-api --no-verify-jwt
npx supabase functions deploy administrar-diagnosticos --project-ref mjjaomrciobpbsozxqcy --use-api
```

Somente o envio é público (`verify_jwt=false`), pois não há login de participantes. A administração fica com `verify_jwt=true` em `supabase/config.toml` e valida também sua própria chave no servidor.

### Segredos do servidor

`ADMIN_API_TOKEN`, `RATE_LIMIT_SALT` e `ALLOWED_ORIGINS` foram cadastrados no Supabase a partir de `.env.functions.local`. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidos pelo ambiente hospedado e ficam exclusivamente no servidor.

As origens autorizadas incluem `https://cadutd.github.io` e os endereços locais de desenvolvimento/preview. Origem é protocolo, host e porta; o caminho do repositório não faz parte dela.

Para rotacionar os segredos, altere somente o arquivo privado local e execute:

```powershell
npx supabase secrets set --project-ref mjjaomrciobpbsozxqcy --env-file .env.functions.local
```

Use segredos aleatórios independentes com pelo menos 32 caracteres. Nunca versionar esse arquivo.

## Publicação automática

O workflow `.github/workflows/deploy.yml` executa testes, build e verificação de artefatos. Em pushes para `main`, publica no Pages e verifica a página e a API. Pull requests são testados sem publicar.

Variáveis do repositório GitHub: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. São configurações públicas; nenhum segredo administrativo é fornecido ao Actions. A base path e o modo real estão definidos no workflow. As ações oficiais são fixadas por SHA; o job de deploy recebe somente `pages:write` e `id-token:write`, com leitura do código nos jobs que precisam dela.

Depois de alterar a aplicação, teste e envie o commit para `main`. Acompanhe a execução na aba Actions. O Pages está configurado para publicar por GitHub Actions e usa HTTPS.

## Pontuação e limites

A implementação compartilhada está em `supabase/functions/_shared/`. Valores: sim 1, parcialmente 0,5, não 0, não sei 0. Dimensões normalizadas para 0–100; pesos COMP 25%, ACES 25%, DADO 20%, BACK 15%, GEST 15%. O total usa precisão integral antes do arredondamento final a duas casas. Respostas desconhecidas têm contador próprio.

Classificações: 0–20 Inicial; acima de 20 até 40 Básico; acima de 40 até 60 Em desenvolvimento; acima de 60 até 80 Estruturado; acima de 80 até 100 Avançado. Dimensões com pelo menos 80 pontos são pontos fortes; as demais são oportunidades de melhoria.

Limites persistentes: até 60 requisições por origem de rede em 10 minutos e 120 globais por minuto para envio; 5 por origem e 30 globais por minuto para administração. Repetições idênticas são bloqueadas por 30 segundos. Retries com o mesmo UUID e conteúdo retornam o registro confirmado. Controles expiram após um dia e usam HMAC da origem, sem IP em claro.

Uma aplicação pública sem autenticação de participantes não resiste a todos os abusos. O plano Free permanece sujeito às cotas e políticas do fornecedor; nenhum recurso pago foi contratado.

## Verificação de segurança

Veja [docs/seguranca.md](docs/seguranca.md). Os testes locais executam migrations e handlers com PostgreSQL embarcado; os testes remotos iniciais verificaram a integração real em uma base vazia, usando somente registros sintéticos removidos ao final.
