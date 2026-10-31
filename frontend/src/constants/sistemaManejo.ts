// Nome amigável de cada sistema de manejo (o enum do banco segue igual).
export const SISTEMA_MANEJO_LABEL: Record<string, string> = {
  CONVENCIONAL: 'Convencional',
  PD_CONSOLIDADO: 'P. D. Consolidado',
  PD_IMPLANTACAO: 'P. D. em Implantação',
};

export function rotuloSistemaManejo(sistema: string | null | undefined): string {
  if (!sistema) return '—';
  return SISTEMA_MANEJO_LABEL[sistema] ?? sistema;
}
