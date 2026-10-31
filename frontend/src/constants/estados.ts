// O manual de calagem e adubação usado pelos motores cobre só RS e SC,
// então todo seletor de estado da aplicação oferece apenas esses dois.
export const ESTADOS_ATENDIDOS = [
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'SC', nome: 'Santa Catarina' },
] as const;

export type UfAtendida = (typeof ESTADOS_ATENDIDOS)[number]['sigla'];
