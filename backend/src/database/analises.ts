import { db } from './db';
import { analises } from './schema';
import type { EntradaCalagem, ResultadoCalagem } from '../schemas/calagemSchema';

interface SalvarAnaliseParams {
  entrada:              EntradaCalagem;
  resultado:            ResultadoCalagem;
  uf:                   string;
  cidade:               string;
  modo_al_sat?:         'direto' | 'calculado';
  monitoramento_ativo?: boolean;
  usuario_id?:          string | null;
}

export async function salvarAnalise(params: SalvarAnaliseParams) {
  const { entrada, resultado, uf, cidade, modo_al_sat, monitoramento_ativo, usuario_id } = params;

  // sistema_manejo que vai pro banco nunca pode ser PD_COM_RESTRICAO
  // (é um estado interno do motor, não um valor de entrada do usuário)
  const sistemaParaBanco = (
    entrada.sistema_manejo === 'PD_COM_RESTRICAO' ? 'PD_CONSOLIDADO' : entrada.sistema_manejo
  ) as 'CONVENCIONAL' | 'PD_IMPLANTACAO' | 'PD_CONSOLIDADO';

  const [registro] = await db.insert(analises).values({
    usuario_id: usuario_id ?? null,

    uf,
    cidade,
    identificacao: (entrada as any).identificacao ?? null,

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
  }).returning();

  return registro;
}

export async function listarAnalises() {
  return db
    .select({
      id:                  analises.id,
      criado_em:           analises.criado_em,
      uf:                  analises.uf,
      cidade:              analises.cidade,
      identificacao:       analises.identificacao,
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
    .orderBy(analises.criado_em)
    .limit(100);
}
