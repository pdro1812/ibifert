import { and, desc, eq, gt, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from './db';
import { analises } from './schema';
import type { EntradaCalagem, ResultadoCalagem } from '../schemas/calagemSchema';

interface SalvarAnaliseParams {
  entrada:              EntradaCalagem;
  resultado:            ResultadoCalagem;
  uf:                   string;
  cidade:               string;
  talhao_id?:           string | null;
  modo_al_sat?:         'direto' | 'calculado';
  monitoramento_ativo?: boolean;
  usuario_id?:          string | null;
  data_analise?:        string | null;
}

// Entrada + resultado do motor → colunas da tabela. Única tradução usada
// para inserir (individual e em lote) e para atualizar uma análise editada.
function colunasAnalise(params: SalvarAnaliseParams) {
  const { entrada, resultado, uf, cidade, modo_al_sat, monitoramento_ativo } = params;

  // sistema_manejo que vai pro banco nunca pode ser PD_COM_RESTRICAO
  // (é um estado interno do motor, não um valor de entrada do usuário)
  const sistemaParaBanco = (
    entrada.sistema_manejo === 'PD_COM_RESTRICAO' ? 'PD_CONSOLIDADO' : entrada.sistema_manejo
  ) as 'CONVENCIONAL' | 'PD_IMPLANTACAO' | 'PD_CONSOLIDADO';

  return {
    uf,
    cidade,
    identificacao: (entrada as any).identificacao ?? null,
    data_analise:  params.data_analise ?? null,

    sistema_manejo:                  sistemaParaBanco,
    primeira_calagem:                entrada.primeira_calagem,
    PRNT:                            entrada.PRNT,
    opcao_superficial_campo_natural: entrada.opcao_superficial_campo_natural ?? false,

    pH_agua:     entrada.pH_agua,
    SMP:         entrada.SMP,
    MO:          entrada.MO          ?? null,
    Al_trocavel: entrada.Al_trocavel ?? null,
    V_atual:     entrada.V_atual     ?? null,
    CTC_pH7:     entrada.CTC_pH7     ?? null,
    Al_sat:      entrada.Al_sat      ?? null,
    modo_al_sat: modo_al_sat         ?? null,

    monitoramento_ativo:                      monitoramento_ativo ?? false,
    monitoramento_pH_agua_10_20:              entrada.monitoramento?.pH_agua_10_20                          ?? null,
    monitoramento_Al_sat_10_20:               entrada.monitoramento?.Al_sat_10_20                           ?? null,
    monitoramento_disponibilidade_P_abaixo:   entrada.monitoramento?.disponibilidade_P_10_20_abaixo_critico ?? null,
    monitoramento_compactacao_restringindo:   entrada.monitoramento?.compactacao_restringindo_raiz           ?? null,
    monitoramento_produtividade_abaixo_media: entrada.monitoramento?.produtividade_abaixo_media              ?? null,
    SMP_10_20:   entrada.SMP_10_20 ?? null,

    aplicar_calcario:    resultado.aplicar_calcario                    ?? null,
    NC_base:             resultado.NC_base                             ?? null,
    NC_final:            resultado.NC_final                            ?? null,
    NC_ajustada:         resultado.NC_ajustada                         ?? null,
    NC_vb:               resultado.NC_vb                               ?? null,
    metodo_calc_roteado: resultado.metodo_calc_roteado                 ?? null,
    modo_aplicacao:      resultado.modo_aplicacao                      ?? null,
    profundidade_cm:     resultado.profundidade_cm                     ?? null,
    nota_tecnica:        resultado.nota_tecnica                        ?? null,
    acao_requerida:      resultado.acao_requerida                      ?? null,
    alertas:             resultado.alertas                             ?? [],
  };
}

export async function salvarAnalise(params: SalvarAnaliseParams) {
  const [registro] = await db.insert(analises).values({
    usuario_id: params.usuario_id ?? null,
    talhao_id:  params.talhao_id ?? null,
    ...colunasAnalise(params),
  }).returning();

  return registro;
}

export async function salvarLoteAnalises(paramsArray: Array<SalvarAnaliseParams & { talhao_id?: string }>) {
  if (paramsArray.length === 0) return [];

  const values = paramsArray.map((params) => ({
    usuario_id: params.usuario_id ?? null,
    talhao_id:  params.talhao_id ?? null,
    ...colunasAnalise(params),
  }));

  return db.insert(analises).values(values).returning();
}

const doUsuario = (id: string, usuario_id: string) =>
  and(eq(analises.id, id), eq(analises.usuario_id, usuario_id));

export async function buscarAnalisePorId(id: string, usuario_id: string) {
  const [registro] = await db.select().from(analises).where(doUsuario(id, usuario_id)).limit(1);
  return registro;
}

// Edição: recalculada pelo motor e gravada no mesmo registro. id, criado_em,
// usuario_id, talhao_id e arquivada_em não mudam.
export async function atualizarAnalise(id: string, usuario_id: string, params: Omit<SalvarAnaliseParams, 'usuario_id' | 'talhao_id'>) {
  const [registro] = await db
    .update(analises)
    .set(colunasAnalise(params))
    .where(doUsuario(id, usuario_id))
    .returning();
  return registro;
}

// Prazo para salvar um cálculo depois de feito (cobre o caminho
// calcular → login → salvar). Depois disso o registro fica só anônimo.
// Comparado no relógio do banco, o mesmo que preenche criado_em.
const PRAZO_PARA_SALVAR = sql`now() - interval '24 hours'`;

// "Salvar" da calculadora: o cálculo já foi gravado sem dono; aqui ele
// passa a ser do usuário (só se ainda não tiver dono e for recente).
export async function vincularAnaliseAoUsuario(
  id: string,
  usuario_id: string,
  dados: { data_analise: string | null; talhao_id: string | null }
) {
  const [registro] = await db
    .update(analises)
    .set({ usuario_id, data_analise: dados.data_analise, talhao_id: dados.talhao_id })
    .where(and(
      eq(analises.id, id),
      isNull(analises.usuario_id),
      gt(analises.criado_em, PRAZO_PARA_SALVAR),
    ))
    .returning({ id: analises.id });
  return registro;
}

export async function excluirAnalise(id: string, usuario_id: string) {
  const [registro] = await db.delete(analises).where(doUsuario(id, usuario_id)).returning({ id: analises.id });
  return registro;
}

export async function arquivarAnalise(id: string, usuario_id: string, arquivada: boolean) {
  const [registro] = await db
    .update(analises)
    .set({ arquivada_em: arquivada ? sql`now()` : null })
    .where(doUsuario(id, usuario_id))
    .returning({ id: analises.id, arquivada_em: analises.arquivada_em });
  return registro;
}

export async function listarAnalises(usuario_id?: string, arquivadas = false) {
  const filtroArquivo = arquivadas ? isNotNull(analises.arquivada_em) : isNull(analises.arquivada_em);

  return db
    .select({
      id:                  analises.id,
      criado_em:           analises.criado_em,
      data_analise:        analises.data_analise,
      arquivada_em:        analises.arquivada_em,
      uf:                  analises.uf,
      cidade:              analises.cidade,
      identificacao:       analises.identificacao,
      talhao_id:           analises.talhao_id,
      sistema_manejo:      analises.sistema_manejo,
      primeira_calagem:    analises.primeira_calagem,
      pH_agua:             analises.pH_agua,
      SMP:                 analises.SMP,
      PRNT:                analises.PRNT,
      aplicar_calcario:    analises.aplicar_calcario,
      NC_ajustada:         analises.NC_ajustada,
      metodo_calc_roteado: analises.metodo_calc_roteado,
      modo_aplicacao:      analises.modo_aplicacao,
      profundidade_cm:     analises.profundidade_cm,
    })
    .from(analises)
    .where(usuario_id ? and(eq(analises.usuario_id, usuario_id), filtroArquivo) : filtroArquivo)
    .orderBy(desc(analises.criado_em))
    .limit(100);
}
