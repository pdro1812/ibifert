// Converte o valor cru de um input numérico em number | undefined.
// Campo vazio vira undefined (não NaN), e vírgula decimal é aceita.
export function normalizarNumero(valor: unknown): number | undefined {
  if (valor === '' || valor === null || valor === undefined) return undefined;
  if (typeof valor === 'number') return Number.isNaN(valor) ? undefined : valor;
  if (typeof valor === 'string') {
    const n = Number(valor.replace(',', '.').trim());
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}
