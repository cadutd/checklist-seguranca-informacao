export const capacidadeDiagnosticos = 200
export const mensagemCapacidade = 'Limite de 200 diagnósticos atingido. A operação não foi gravada. Exclua diagnósticos antes de incluir novos.'
export class ErroCapacidade extends Error {
  constructor() { super(mensagemCapacidade) }
}
