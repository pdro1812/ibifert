import { z } from 'zod';

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// Data em que a análise de solo foi feita (AAAA-MM-DD). Opcional: vazio ou
// ausente vira null ("não informada"), nunca a data de inserção.
export const DataAnaliseSchema = z
  .union([z.literal(''), z.null(), z.undefined(), z.string()])
  .transform((valor) => (valor ? valor : null))
  .refine((valor) => valor === null || (/^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(Date.parse(valor))), {
    message: 'Data da análise inválida.',
  })
  .refine((valor) => valor === null || valor <= hojeISO(), {
    message: 'A data da análise não pode ser no futuro.',
  });

export const ArquivarAnaliseSchema = z.object({
  arquivada: z.boolean({ message: 'Informe se a análise fica arquivada (true) ou ativa (false).' }),
});

// ?arquivadas=true → só arquivadas; qualquer outro valor → só ativas.
export function filtroArquivadas(valor: unknown): boolean {
  return valor === 'true' || valor === '1';
}
