CREATE TYPE "public"."metodo_calc_roteado" AS ENUM('SMP', 'POLINOMIAL');--> statement-breakpoint
CREATE TYPE "public"."modo_al_sat" AS ENUM('direto', 'calculado');--> statement-breakpoint
CREATE TYPE "public"."modo_aplicacao" AS ENUM('INCORPORADO', 'SUPERFICIAL');--> statement-breakpoint
CREATE TYPE "public"."sistema_efetivo" AS ENUM('CONVENCIONAL', 'PD_IMPLANTACAO', 'PD_CONSOLIDADO', 'PD_COM_RESTRICAO');--> statement-breakpoint
CREATE TYPE "public"."sistema_manejo" AS ENUM('CONVENCIONAL', 'PD_IMPLANTACAO', 'PD_CONSOLIDADO');--> statement-breakpoint
CREATE TABLE "analises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"uf" text NOT NULL,
	"cidade" text NOT NULL,
	"identificacao" text,
	"sistema_manejo" "sistema_manejo" NOT NULL,
	"primeira_calagem" boolean NOT NULL,
	"PRNT" real NOT NULL,
	"opcao_superficial_campo_natural" boolean DEFAULT false NOT NULL,
	"pH_agua" real NOT NULL,
	"SMP" real NOT NULL,
	"MO" real,
	"Al_trocavel" real,
	"V_atual" real,
	"CTC_pH7" real,
	"modo_al_sat" "modo_al_sat",
	"Al_sat" real,
	"monitoramento_ativo" boolean DEFAULT false NOT NULL,
	"monitoramento_pH_agua_10_20" real,
	"monitoramento_Al_sat_10_20" real,
	"monitoramento_disponibilidade_P_abaixo" boolean,
	"monitoramento_compactacao_restringindo" boolean,
	"monitoramento_produtividade_abaixo_media" boolean,
	"SMP_10_20" real,
	"aplicar_calcario" boolean,
	"NC_base" real,
	"NC_final" real,
	"NC_ajustada" real,
	"NC_vb" real,
	"metodo_calc_roteado" "metodo_calc_roteado",
	"modo_aplicacao" "modo_aplicacao",
	"profundidade_cm" integer,
	"sistema_efetivo" "sistema_efetivo",
	"nota_tecnica" text,
	"acao_requerida" text,
	"alertas" text[]
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"cpf" text NOT NULL,
	"email" text NOT NULL,
	"senha" text NOT NULL,
	"cidade" text NOT NULL,
	"estado" text NOT NULL,
	"telefone" text,
	"role" text DEFAULT 'PRODUTOR' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_cpf_unique" UNIQUE("cpf"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
