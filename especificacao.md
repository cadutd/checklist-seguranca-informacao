
# Especificacao Tecnica
# Diagnostico de Seguranca Digital para Arquivos Comunitarios

Versao: 1.0
Status: Especificacao para implementacao
Idioma da interface: Portugues do Brasil

## 1. Objetivo

Desenvolver uma aplicacao web para avaliar, de forma didatica, a adocao de controles basicos de seguranca da informacao em instituicoes arquivisticas.

A aplicacao sera utilizada em cursos e oficinas voltados a arquivistas de arquivos comunitarios.

Cada participante informara o nome de uma instituicao, respondera a um checklist de seguranca e enviara seu diagnostico.

Os resultados serao armazenados e apresentados em um painel coletivo, permitindo comparar as instituicoes participantes.

A pontuacao sera exclusivamente didatica. Nao representara certificacao, auditoria ou comprovacao de conformidade com normas de seguranca.

## 2. Principios do projeto

- Interface simples e intuitiva.
- Apenas duas paginas.
- Sem cadastro de usuarios.
- Sem login.
- Sem gerenciamento de turmas.
- Sem backend tradicional.
- Tecnologias livres e de baixo custo.
- Interface responsiva.
- Codigo organizado e documentado.
- Armazenamento persistente.
- Resultados atualizados automaticamente.
- Dados publicos limitados ao necessario.
- Nenhuma chave administrativa exposta no navegador.

Nao implementar funcionalidades adicionais sem necessidade.

## 3. Tecnologias

Frontend:
- React
- Vite
- TypeScript
- Tailwind CSS
- Recharts
- React Router

Persistencia:
- Supabase
- PostgreSQL

Hospedagem:
- GitHub Pages
- GitHub Actions

Testes:
- Vitest
- React Testing Library

Nao utilizar:
- FastAPI
- Docker
- Keycloak
- Redis
- Servidor Node.js permanente

## 4. Arquitetura

A aplicacao tera duas rotas:

/                 - Painel de resultados
/checklist        - Formulario de diagnostico

O GitHub Pages hospedara os arquivos estaticos.

O Supabase armazenara os diagnosticos.

A comunicacao sera realizada por HTTPS.

A leitura dos resultados sera publica, mas limitada a uma visao de dados agregados e resultados didaticos.

A gravacao sera feita por uma Supabase Edge Function, com validacao no servidor e protecao contra envios abusivos.

A Edge Function nao devera disponibilizar credenciais administrativas ao navegador.

## 5. Pagina inicial

### 5.1 Objetivo

Apresentar os resultados das instituicoes avaliadas.

### 5.2 Elementos

Cabecalho:
- Titulo: Diagnostico de Seguranca Digital
- Subtitulo: Avaliacao de seguranca da informacao para arquivos comunitarios
- Botao: Responder checklist

Indicadores:
- Quantidade de diagnosticos realizados.
- Media geral das notas.
- Maior nota registrada.
- Menor nota registrada.

Graficos:
- Grafico de barras com as notas por instituicao.
- Grafico com as medias das cinco dimensoes.
- Grafico de distribuicao das classificacoes.

Tabela:
- Nome da instituicao.
- Nota final.
- Classificacao.
- Data do diagnostico.

A tabela devera permitir ordenacao por nome e nota.

### 5.3 Detalhamento individual

Ao selecionar uma instituicao na tabela ou no grafico, apresentar um painel na propria pagina inicial.

Nao criar uma terceira pagina.

O painel apresentara:
- Nome da instituicao.
- Nota final.
- Classificacao.
- Grafico das cinco dimensoes.
- Pontos fortes.
- Dimensoes que precisam de melhoria.
- Quantidade de respostas "Nao sei".

Nao publicar respostas individuais detalhadas ou informacoes tecnicas sensiveis.

### 5.4 Atualizacao

Atualizar os dados:
- Ao carregar a pagina.
- Ao retornar do formulario.
- Automaticamente a cada 15 segundos.

Evitar requisicoes simultaneas duplicadas.

Apresentar mensagens de carregamento e erro.

Quando nao existirem diagnosticos, apresentar uma mensagem convidando o usuario a responder ao checklist.

## 6. Pagina do checklist

### 6.1 Campos

Nome da instituicao:
- Obrigatorio.
- Minimo de 3 caracteres.
- Maximo de 120 caracteres.
- Remover espacos excedentes.
- Permitir nomes ficticios.

Apresentar um aviso recomendando nao informar vulnerabilidades reais de instituicoes identificaveis sem autorizacao.

### 6.2 Respostas

Cada pergunta tera quatro alternativas:

- Sim
- Parcialmente
- Nao
- Nao sei

Todas as perguntas sao obrigatorias.

As respostas devem ser apresentadas em grupos, organizados pelas cinco dimensoes.

### 6.3 Envio

O botao "Enviar diagnostico" devera:

1. Validar o nome da instituicao.
2. Verificar se todas as perguntas foram respondidas.
3. Enviar as respostas ao endpoint seguro.
4. Aguardar confirmacao de gravacao.
5. Exibir mensagem de sucesso.
6. Redirecionar para a pagina inicial.

Em caso de erro, preservar as respostas preenchidas.

Desabilitar o botao durante o envio para evitar duplicidade.

Cada envio confirmado criara um novo diagnostico.

Nomes repetidos serao permitidos.

## 7. Checklist

O questionario tera 20 perguntas divididas em cinco dimensoes.

### Dimensao 1 - Protecao dos computadores

Peso: 25%

COMP01:
Os computadores utilizam sistemas operacionais com suporte e atualizados?

COMP02:
Todos os computadores possuem antivirus ativo e atualizado?

COMP03:
O firewall esta habilitado nos computadores?

COMP04:
Os navegadores estao atualizados e possuem protecao contra sites maliciosos?

COMP05:
A instalacao de programas e restrita a pessoas autorizadas?

### Dimensao 2 - Senhas e controle de acesso

Peso: 25%

ACES01:
Cada colaborador utiliza uma conta individual para acessar os sistemas?

ACES02:
Sao utilizadas senhas fortes e diferentes para cada servico?

ACES03:
A autenticacao multifator esta habilitada nas contas institucionais importantes?

ACES04:
O acesso a documentos e pastas e limitado conforme as responsabilidades dos colaboradores?

ACES05:
Os acessos de colaboradores desligados sao removidos ou desativados?

### Dimensao 3 - Protecao de dados e midias

Peso: 20%

DADO01:
Existe um procedimento para verificar pendrives e HDs externos antes de utiliza-los?

DADO02:
A execucao automatica de programas em midias externas esta desativada?

DADO03:
Os documentos com informacoes pessoais ou restritas possuem protecao de acesso?

DADO04:
A instituicao adota cuidados para proteger arquivos e equipamentos transportados ou compartilhados externamente?

### Dimensao 4 - Backup e recuperacao

Peso: 15%

BACK01:
A instituicao realiza copias de seguranca periodicas dos documentos digitais?

BACK02:
Existe pelo menos uma copia de seguranca armazenada separadamente do equipamento principal?

BACK03:
A instituicao realiza testes periodicos de recuperacao das copias de seguranca?

### Dimensao 5 - Gestao e conscientizacao

Peso: 15%

GEST01:
Existe uma pessoa responsavel por acompanhar a seguranca dos computadores e das informacoes?

GEST02:
Os colaboradores recebem orientacoes sobre phishing, links suspeitos e boas praticas de seguranca?

GEST03:
A instituicao possui orientacoes basicas sobre como agir diante de incidentes de seguranca?

## 8. Pontuacao

### 8.1 Valores

Sim = 1.0
Parcialmente = 0.5
Nao = 0.0
Nao sei = 0.0

A resposta "Nao sei" devera ser contabilizada separadamente.

### 8.2 Pesos

COMP = 25
ACES = 25
DADO = 20
BACK = 15
GEST = 15

### 8.3 Calculo

Para cada dimensao:

nota_dimensao = soma_dos_valores / quantidade_de_perguntas * 100

Nota final:

nota_final =
    nota_COMP * 0.25 +
    nota_ACES * 0.25 +
    nota_DADO * 0.20 +
    nota_BACK * 0.15 +
    nota_GEST * 0.15

Arredondar a nota final para duas casas decimais.

O calculo devera ser realizado no servidor, utilizando as respostas recebidas.

Nao confiar em notas calculadas ou enviadas pelo navegador.

### 8.4 Classificacao didatica

0 a 20 pontos:
Inicial

Acima de 20 ate 40:
Basico

Acima de 40 ate 60:
Em desenvolvimento

Acima de 60 ate 80:
Estruturado

Acima de 80 ate 100:
Avancado

Essas classificacoes sao criterios didaticos do aplicativo e nao devem ser apresentadas como certificacoes de seguranca.

## 9. Banco de dados

Utilizar uma tabela principal chamada:

diagnosticos

Campos:

- id: UUID, chave primaria.
- instituicao: VARCHAR(120), obrigatorio.
- respostas: JSONB, obrigatorio.
- nota_total: NUMERIC(5,2), obrigatorio.
- notas_dimensoes: JSONB, obrigatorio.
- quantidade_nao_sei: INTEGER, obrigatorio.
- versao_questionario: INTEGER, obrigatorio.
- criado_em: TIMESTAMPTZ, obrigatorio.

O campo respostas armazenara os IDs das perguntas e suas alternativas.

Exemplo:

{
  "COMP01": "sim",
  "COMP02": "parcialmente",
  "COMP03": "nao",
  "COMP04": "sim",
  "COMP05": "nao_sei"
}

O campo notas_dimensoes armazenara valores de 0 a 100.

Exemplo:

{
  "COMP": 70,
  "ACES": 80,
  "DADO": 50,
  "BACK": 66.67,
  "GEST": 33.33
}

Criar indices adequados para consultas por data e nota.

### 9.1 Consultas publicas

Criar uma visao ou endpoint publico que exponha somente:

- ID do diagnostico.
- Nome da instituicao.
- Nota total.
- Notas das dimensoes.
- Quantidade de respostas desconhecidas.
- Data.
- Versao do questionario.

Nao disponibilizar publicamente o JSON completo das respostas.

## 10. Seguranca da aplicacao

Apesar de ser uma aplicacao didatica, implementar protecoes basicas.

### 10.1 Supabase

- Habilitar Row Level Security.
- Negar acesso direto de escrita para usuarios anonimos.
- Nao expor a service_role key no frontend.
- Nao permitir UPDATE ou DELETE publicos.
- Nao permitir SELECT anonimo direto na tabela completa.
- Permitir leitura apenas dos dados destinados ao painel.
- Validar todas as respostas no servidor.

### 10.2 Envio publico

Implementar uma Supabase Edge Function para receber os diagnosticos.

A funcao devera:
- Validar o formato do corpo da requisicao.
- Validar o nome da instituicao.
- Validar os 20 IDs de perguntas.
- Rejeitar perguntas desconhecidas.
- Rejeitar respostas invalidas.
- Recalcular todas as notas.
- Inserir o diagnostico.
- Retornar apenas os dados necessarios.

Implementar protecao contra abuso, com limite de requisicoes e controle de envios repetidos.

Como nao existe autenticacao, nao considerar a aplicacao resistente a todos os tipos de abuso.

Nao confiar exclusivamente em validacoes no frontend ou em CORS.

### 10.3 Privacidade

- Nao solicitar CPF, e-mail ou telefone.
- Nao solicitar nomes de colaboradores.
- Nao coletar detalhes de vulnerabilidades tecnicas.
- Recomendar nomes ficticios.
- Informar que os resultados sao publicos.
- Evitar armazenamento desnecessario de dados pessoais.

## 11. Interface

### 11.1 Identidade visual

Criar uma interface profissional, clara e acessivel.

Sugestao:
- Azul-escuro como cor principal.
- Verde para controles atendidos.
- Amarelo para atencao.
- Vermelho para fragilidades.
- Fundo claro.
- Cartoes com bordas discretas.

Utilizar cores acompanhadas de textos, nunca como unico indicador.

### 11.2 Responsividade

A aplicacao devera funcionar em:
- Computadores.
- Tablets.
- Smartphones.

Em telas pequenas:
- Organizar indicadores verticalmente.
- Adaptar os graficos.
- Permitir rolagem horizontal da tabela quando necessario.
- Manter botoes e alternativas facilmente selecionaveis.

### 11.3 Acessibilidade

- Utilizar HTML semantico.
- Associar labels aos campos.
- Garantir navegacao por teclado.
- Manter contraste adequado.
- Identificar erros de validacao.
- Nao depender apenas de cores.

## 12. Estrutura sugerida

src/
  components/
    Cabecalho.tsx
    Indicadores.tsx
    GraficoInstituicoes.tsx
    GraficoDimensoes.tsx
    TabelaDiagnosticos.tsx
    DetalheInstituicao.tsx
    PerguntaChecklist.tsx

  pages/
    Painel.tsx
    Checklist.tsx

  data/
    perguntas.ts

  services/
    supabase.ts
    diagnosticos.ts

  utils/
    pontuacao.ts
    classificacao.ts

  types/
    diagnostico.ts

  App.tsx
  main.tsx

supabase/
  functions/
    enviar-diagnostico/

  migrations/

tests/

.github/
  workflows/
    deploy.yml

README.md
.env.example
package.json

A logica de pontuacao devera possuir uma implementacao centralizada e testavel.

O servidor sera a autoridade para a pontuacao persistida.

## 13. Publicacao no GitHub Pages

Configurar:
- Build de producao do Vite.
- Base path compativel com o nome do repositorio.
- GitHub Actions para publicacao automatica.
- Variaveis de ambiente para URL e chave publica do Supabase.

Utilizar roteamento compativel com hospedagem estatica.

Preferir HashRouter para evitar problemas de atualizacao de paginas internas no GitHub Pages.

Nunca adicionar credenciais administrativas ao repositorio.

Documentar no README:
- Instalacao.
- Configuracao do Supabase.
- Execucao local.
- Testes.
- Build.
- Publicacao.
- Variaveis de ambiente.

## 14. Testes

Criar testes para:

Pontuacao:
- Todas as respostas "sim" resultam em 100.
- Todas as respostas "nao" resultam em 0.
- Todas as respostas "nao_sei" resultam em 0.
- Respostas parciais recebem metade da pontuacao.
- Pesos totalizam 100%.
- Classificacoes respeitam os limites definidos.

Formulario:
- Nome obrigatorio.
- Vinte respostas obrigatorias.
- Respostas invalidas rejeitadas.
- Envio duplicado bloqueado durante processamento.
- Erro de rede preserva o formulario.

Painel:
- Estado vazio.
- Carregamento.
- Erro de consulta.
- Atualizacao de resultados.
- Selecao de instituicao.
- Graficos com dados consistentes.

Seguranca:
- Escrita anonima direta negada.
- Atualizacao anonima negada.
- Exclusao anonima negada.
- Endpoint rejeita payload invalido.
- Endpoint nao aceita notas fornecidas pelo cliente.

## 15. Fases de implementacao

### Fase 1 - Interface

Implementar:
- Projeto React.
- Configuracao do Tailwind.
- Duas paginas.
- Questionario completo.
- Validacoes.
- Dados simulados.
- Graficos demonstrativos.

Nao integrar banco de dados nesta fase.

### Fase 2 - Pontuacao

Implementar:
- Calculo por dimensao.
- Calculo da nota final.
- Classificacao.
- Testes unitarios.
- Detalhamento individual.

### Fase 3 - Supabase

Implementar:
- Migration SQL.
- Tabela diagnosticos.
- Politicas RLS.
- Endpoint de envio.
- Validacao no servidor.
- Consultas publicas.
- Persistencia real.
- Atualizacao do painel.

### Fase 4 - Publicacao

Implementar:
- GitHub Actions.
- GitHub Pages.
- Variaveis de ambiente.
- Testes de producao.
- README.
- Revisao de seguranca.

## 16. Criterios de aceite

A implementacao sera considerada concluida quando:

1. O aplicativo possuir apenas duas paginas.
2. A pagina inicial apresentar os diagnosticos existentes.
3. O formulario possuir exatamente 20 perguntas.
4. Todas as respostas forem obrigatorias.
5. O nome da instituicao for obrigatorio.
6. O calculo das notas respeitar os pesos definidos.
7. O envio gravar um novo diagnostico no banco.
8. O usuario retornar ao painel apos o envio.
9. O painel apresentar o novo resultado.
10. Os graficos compararem as instituicoes.
11. O detalhamento individual aparecer na pagina inicial.
12. A aplicacao funcionar em celulares.
13. Nao existir necessidade de login.
14. O banco impedir alteracoes publicas indevidas.
15. Nenhuma chave administrativa estiver exposta.
16. Os testes automatizados forem executados com sucesso.
17. A aplicacao estiver publicada no GitHub Pages.
18. O README documentar a instalacao e a publicacao.

## 17. Orientacoes ao Codex

Implementar de forma incremental, seguindo as quatro fases.

Antes de cada fase:
- Verificar os arquivos existentes.
- Reutilizar componentes e convencoes do projeto.
- Evitar dependencias desnecessarias.

Durante a implementacao:
- Manter componentes pequenos.
- Utilizar TypeScript.
- Separar dados, interface e regras de negocio.
- Tratar erros de rede.
- Garantir acessibilidade.
- Escrever testes para as regras criticas.

Ao concluir cada fase:
- Executar os testes.
- Executar o build.
- Corrigir os problemas encontrados.
- Atualizar o README.
- Apresentar um resumo das alteracoes.

Nao adicionar funcionalidades fora do escopo.

Nao criar arquivos ZIP.

Todo o codigo, comentarios e documentacao devem utilizar portugues tecnico, preferencialmente com identificadores ASCII.

A interface exibida ao usuario deve utilizar portugues brasileiro com acentuacao correta.
