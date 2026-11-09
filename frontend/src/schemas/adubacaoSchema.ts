import { z } from 'zod';
import { LIMITES_ADUBACAO, RENDIMENTO_MAXIMO_T_HA, formatarLimite } from './limitesAgronomicos';

const L = LIMITES_ADUBACAO;
const MENSAGEM_PH = `pH inválido: deve estar entre ${formatarLimite(L.pH_agua.min)} e ${formatarLimite(L.pH_agua.max)}.`;
const MENSAGEM_DENSIDADE = `Densidade de plantas deve estar entre ${formatarLimite(L.densidade_plantas.min)} e ${formatarLimite(L.densidade_plantas.max)} plantas/ha`;


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
  identificacao: z.string().optional(),
  // Grupo A - Solo (faixas em limitesAgronomicos.ts, AUD-05)
  argila: z.number({ error: "Argila é obrigatória" }).min(L.argila.min, "Argila deve ser >= 0%").max(L.argila.max, `Argila deve ser <= ${L.argila.max}%`),
  MO: z.number({ error: "Matéria Orgânica é obrigatória" }).positive("MO deve ser maior que 0").max(L.MO.max, `MO deve ser <= ${L.MO.max}%`),
  CTC_pH7: z.number({ error: "CTC é obrigatória" }).positive("CTC deve ser maior que 0").max(L.CTC_pH7.max, `CTC deve ser <= ${L.CTC_pH7.max} cmolc/dm³`),
  P: z.number({ error: "Fósforo é obrigatório" }).positive("Fósforo deve ser maior que 0").max(L.P.max, `Fósforo deve ser <= ${L.P.max} mg/dm³`),
  metodo_P: MetodoExtratorSchema,
  K: z.number({ error: "Potássio é obrigatório" }).positive("Potássio deve ser maior que 0").max(L.K.max, `Potássio deve ser <= ${formatarLimite(L.K.max)} mg/dm³`),
  metodo_K: MetodoExtratorSchema,
  Ca: z.number({ error: "Cálcio é obrigatório" }).positive("Cálcio deve ser maior que 0").max(L.Ca.max, `Cálcio deve ser <= ${L.Ca.max} cmolc/dm³`),
  Mg: z.number({ error: "Magnésio é obrigatório" }).positive("Magnésio deve ser maior que 0").max(L.Mg.max, `Magnésio deve ser <= ${L.Mg.max} cmolc/dm³`),
  S: z.number().positive().optional(),
  Cu: z.number().min(0).optional(),
  Zn: z.number().min(0).optional(),
  B: z.number().min(0).optional(),
  Mn: z.number().min(0).optional(),
  pH_agua: z.number().min(L.pH_agua.min, MENSAGEM_PH).max(L.pH_agua.max, MENSAGEM_PH).optional(),

  // Grupo B - Cultura e Manejo
  cultura: CulturaSchema,
  num_cultivo: NumCultivoSchema,
  // O teto depende da cultura (refine abaixo).
  rendimento_esperado: z.number({ error: "Rendimento esperado é obrigatório" }).positive("Rendimento esperado deve ser maior que 0"),
  cultura_antecedente: CulturaAntecedenteSchema.optional(),
  sistema_cultivo: SistemaCultivoSchema,
  tipo_correcao: TipoCorrecaoSchema.default('Gradual'),
  densidade_plantas: z.number().min(L.densidade_plantas.min, MENSAGEM_DENSIDADE).max(L.densidade_plantas.max, MENSAGEM_DENSIDADE).optional(),
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
}).superRefine((data, ctx) => {
  // Acima do limite as doses de N, P e K (lineares no rendimento) perdem o
  // sentido. Entre o razoável e o limite o motor só alerta.
  const { limite } = RENDIMENTO_MAXIMO_T_HA[data.cultura];
  if (data.rendimento_esperado > limite) {
    ctx.addIssue({
      code: 'custom',
      path: ['rendimento_esperado'],
      message: `Rendimento esperado deve ser <= ${formatarLimite(limite)} t/ha para esta cultura.`,
    });
  }
});

export type EntradaAdubacao = z.infer<typeof AdubacaoSchema>;
export type EntradaAdubacaoForm = z.input<typeof AdubacaoSchema>;
