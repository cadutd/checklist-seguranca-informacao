export const alternativas = [
  { valor: 'sim', rotulo: 'Sim' },
  { valor: 'parcialmente', rotulo: 'Parcialmente' },
  { valor: 'nao', rotulo: 'Não' },
  { valor: 'nao_sei', rotulo: 'Não sei' },
] as const
export type Resposta = typeof alternativas[number]['valor']
export const dimensoes = [
  { id: 'COMP', nome: 'Proteção dos computadores', peso: 25, perguntas: [
    ['COMP01', 'Os computadores utilizam sistemas operacionais com suporte e atualizados?'],
    ['COMP02', 'Todos os computadores possuem antivírus ativo e atualizado?'],
    ['COMP03', 'O firewall está habilitado nos computadores?'],
    ['COMP04', 'Os navegadores estão atualizados e possuem proteção contra sites maliciosos?'],
    ['COMP05', 'A instalação de programas é restrita a pessoas autorizadas?'],
  ] },
  { id: 'ACES', nome: 'Senhas e controle de acesso', peso: 25, perguntas: [
    ['ACES01', 'Cada colaborador utiliza uma conta individual para acessar os sistemas?'],
    ['ACES02', 'São utilizadas senhas fortes e diferentes para cada serviço?'],
    ['ACES03', 'A autenticação multifator está habilitada nas contas institucionais importantes?'],
    ['ACES04', 'O acesso a documentos e pastas é limitado conforme as responsabilidades dos colaboradores?'],
    ['ACES05', 'Os acessos de colaboradores desligados são removidos ou desativados?'],
  ] },
  { id: 'DADO', nome: 'Proteção de dados e mídias', peso: 20, perguntas: [
    ['DADO01', 'Existe um procedimento para verificar pendrives e HDs externos antes de utilizá-los?'],
    ['DADO02', 'A execução automática de programas em mídias externas está desativada?'],
    ['DADO03', 'Os documentos com informações pessoais ou restritas possuem proteção de acesso?'],
    ['DADO04', 'A instituição adota cuidados para proteger arquivos e equipamentos transportados ou compartilhados externamente?'],
  ] },
  { id: 'BACK', nome: 'Backup e recuperação', peso: 15, perguntas: [
    ['BACK01', 'A instituição realiza cópias de segurança periódicas dos documentos digitais?'],
    ['BACK02', 'Existe pelo menos uma cópia de segurança armazenada separadamente do equipamento principal?'],
    ['BACK03', 'A instituição realiza testes periódicos de recuperação das cópias de segurança?'],
  ] },
  { id: 'GEST', nome: 'Gestão e conscientização', peso: 15, perguntas: [
    ['GEST01', 'Existe uma pessoa responsável por acompanhar a segurança dos computadores e das informações?'],
    ['GEST02', 'Os colaboradores recebem orientações sobre phishing, links suspeitos e boas práticas de segurança?'],
    ['GEST03', 'A instituição possui orientações básicas sobre como agir diante de incidentes de segurança?'],
  ] },
] as const
