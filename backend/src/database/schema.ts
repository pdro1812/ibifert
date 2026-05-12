import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// ── Users ─────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id:        uuid('id').defaultRandom().primaryKey(),
  nome:      text('nome').notNull(),
  cpf:       text('cpf').notNull().unique(),
  email:     text('email').notNull().unique(),
  senha:     text('senha').notNull(),
  cidade:    text('cidade').notNull(),
  estado:    text('estado').notNull(),
  telefone:  text('telefone'),
  role:      text('role').notNull().default('PRODUTOR'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Enums — Analises ──────────────────────────────────────────────────────────

export const sistemasManejoEnum = pgEnum('sistema_manejo', [
  'CONVENCIONAL',
  'PD_IMPLANTACAO',
  'PD_CONSOLIDADO',
]);

export const metodosCalcEnum = pgEnum('metodo_calc_roteado', [
  'SMP',
  'POLINOMIAL',
]);

export const modosAplicacaoEnum = pgEnum('modo_aplicacao', [
  'INCORPORADO',
  'SUPERFICIAL',
]);

export const modosAlSatEnum = pgEnum('modo_al_sat', [
  'direto',
  'calculado',
]);

export const sistemasEfetivosEnum = pgEnum('sistema_efetivo', [
  'CONVENCIONAL',
  'PD_IMPLANTACAO',
  'PD_CONSOLIDADO',
  'PD_COM_RESTRICAO',
]);

// ── Analises ──────────────────────────────────────────────────────────────────

export const analises = pgTable('analises', {
  id:         uuid('id').primaryKey().defaultRandom(),
  usuario_id: uuid('usuario_id'),
  criado_em:  timestamp('criado_em').notNull().defaultNow(),

  uf:            text('uf').notNull(),
  cidade:        text('cidade').notNull(),
  identificacao: text('identificacao'),

  sistema_manejo:                  sistemasManejoEnum('sistema_manejo').notNull(),
  primeira_calagem:                boolean('primeira_calagem').notNull(),
  PRNT:                            real('PRNT').notNull(),
  opcao_superficial_campo_natural: boolean('opcao_superficial_campo_natural').notNull().default(false),

  pH_agua:     real('pH_agua').notNull(),
  SMP:         real('SMP').notNull(),
  MO:          real('MO'),
  Al_trocavel: real('Al_trocavel'),
  V_atual:     real('V_atual'),
  CTC_pH7:     real('CTC_pH7'),
  modo_al_sat: modosAlSatEnum('modo_al_sat'),
  Al_sat:      real('Al_sat'),

  monitoramento_ativo:                      boolean('monitoramento_ativo').notNull().default(false),
  monitoramento_pH_agua_10_20:              real('monitoramento_pH_agua_10_20'),
  monitoramento_Al_sat_10_20:               real('monitoramento_Al_sat_10_20'),
  monitoramento_disponibilidade_P_abaixo:   boolean('monitoramento_disponibilidade_P_abaixo'),
  monitoramento_compactacao_restringindo:   boolean('monitoramento_compactacao_restringindo'),
  monitoramento_produtividade_abaixo_media: boolean('monitoramento_produtividade_abaixo_media'),
  SMP_10_20:   real('SMP_10_20'),

  aplicar_calcario:    boolean('aplicar_calcario'),
  NC_base:             real('NC_base'),
  NC_final:            real('NC_final'),
  NC_ajustada:         real('NC_ajustada'),
  NC_vb:               real('NC_vb'),
  metodo_calc_roteado: metodosCalcEnum('metodo_calc_roteado'),
  modo_aplicacao:      modosAplicacaoEnum('modo_aplicacao'),
  profundidade_cm:     integer('profundidade_cm'),
  sistema_efetivo:     sistemasEfetivosEnum('sistema_efetivo'),
  nota_tecnica:        text('nota_tecnica'),
  acao_requerida:      text('acao_requerida'),
  alertas:             text('alertas').array(),
});

// ── Fazendas ──────────────────────────────────────────────────────────────────

export const fazendas = pgTable('fazendas', {
  id:         uuid('id').primaryKey().defaultRandom(),
  usuario_id: uuid('usuario_id'),                      // opcional — FK lógica para users.id
  nome:       text('nome').notNull(),
  municipio:  text('municipio').notNull(),
  uf:         text('uf').notNull(),
  criado_em:  timestamp('criado_em').notNull().defaultNow(),
});

// ── Talhoes ───────────────────────────────────────────────────────────────────

export const talhoes = pgTable('talhoes', {
  id:         uuid('id').primaryKey().defaultRandom(),
  fazenda_id: uuid('fazenda_id'),                      // opcional — FK lógica para fazendas.id
  nome:       text('nome').notNull(),
  cultura:    text('cultura').notNull(),
  criado_em:  timestamp('criado_em').notNull().defaultNow(),
});