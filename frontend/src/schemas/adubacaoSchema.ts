import { z } from 'zod';

export const CulturaSchema = z.enum([
  'aveia_branca', 'aveia_preta', 'canola', 'centeio', 'cevada',
  'ervilha', 'ervilhaca', 'feijao', 'girassol', 'milho',
  'milho_pipoca', 'nabo_forrageiro', 'soja', 'sorgo', 'trigo', 'triticale'
]);

export const MetodoExtratorSchema = z.enum(['Mehlich-1', 'Mehlich-3']);
export const SistemaCultivoSchema = z.enum(['Convencional', 'Plantio Direto']);
export const TipoCorrecaoSchema = z.enum(['Gradual', 'Total']);
export const CulturaAntecedenteSchema = z.enum(['Leguminosa', 'Gramínea', 'Consorciação ou Pousio']);
export const NumCultivoSchema = z.enum(['1', '2']);
export const FinalidadeCevadaSchema = z.enum(['cervejeira_malte_unico', 'malte_especial', 'outra']);

export const AdubacaoSchema = z.object({
  // Grupo A - Solo
  argila: z.number({ required_error: "Argila é obrigatória" }).min(0).max(99, "Argila deve ser <= 99%"),
  MO: z.number({ required_error: "Matéria Orgânica é obrigatória" }).positive().max(20, "MO deve ser <= 20%"),
  CTC_pH7: z.number({ required_error: "CTC é obrigatória" }).positive(),
  P: z.number({ required_error: "Fósforo é obrigatório" }).positive(),
  metodo_P: MetodoExtratorSchema,
  K: z.number({ required_error: "Potássio é obrigatório" }).positive(),
  metodo_K: MetodoExtratorSchema,
  Ca: z.number({ required_error: "Cálcio é obrigatório" }).positive(),
  Mg: z.number({ required_error: "Magnésio é obrigatório" }).positive(),
  S: z.number().positive().optional(),
  Cu: z.number().min(0).optional(),
  Zn: z.number().min(0).optional(),
  B: z.number().min(0).optional(),
  Mn: z.number().min(0).optional(),
  pH_agua: z.number().positive().optional(),

  // Grupo B - Cultura e Manejo
  cultura: CulturaSchema,
  num_cultivo: NumCultivoSchema,
  rendimento_esperado: z.number({ required_error: "Rendimento esperado é obrigatório" }).positive(),
  cultura_antecedente: CulturaAntecedenteSchema.optional(),
  sistema_cultivo: SistemaCultivoSchema,
  tipo_correcao: TipoCorrecaoSchema.default('Gradual'),
  densidade_plantas: z.number().positive().optional(),
  finalidade_cevada: FinalidadeCevadaSchema.optional(),
}).refine(data => {
  // Enxofre é obrigatório para soja, ervilha, ervilhaca, canola, nabo_forrageiro
  const culturasS = ['soja', 'ervilha', 'ervilhaca', 'canola', 'nabo_forrageiro'];
  if (culturasS.includes(data.cultura) && data.S === undefined) {
    return false;
  }
  return true;
}, {
  message: "Enxofre (S) é obrigatório para esta cultura.",
  path: ['S']
}).refine(data => {
  // Cultura antecedente é obrigatória para aveias, centeio, cevada, trigo, triticale, milho
  const culturasAnt = ['aveia_branca', 'aveia_preta', 'centeio', 'cevada', 'trigo', 'triticale', 'milho'];
  if (culturasAnt.includes(data.cultura) && !data.cultura_antecedente) {
    return false;
  }
  return true;
}, {
  message: "Cultura antecedente é obrigatória para esta cultura.",
  path: ['cultura_antecedente']
}).refine(data => {
  // Tipo de correção Total exige Argila >= 20 e CTC >= 7.5
  if (data.tipo_correcao === 'Total') {
    if (data.argila < 20 || data.CTC_pH7 < 7.5) {
      return false;
    }
  }
  return true;
}, {
  message: "Correção Total requer Argila >= 20% e CTC >= 7,5 cmolc/dm³.",
  path: ['tipo_correcao']
}).refine(data => {
  // Finalidade cevada é obrigatória para cevada
  if (data.cultura === 'cevada' && !data.finalidade_cevada) {
    return false;
  }
  return true;
}, {
  message: "Finalidade é obrigatória para a cevada.",
  path: ['finalidade_cevada']
});

export type EntradaAdubacao = z.infer<typeof AdubacaoSchema>;
