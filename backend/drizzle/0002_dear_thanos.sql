CREATE TYPE "public"."cultura_antecedente" AS ENUM('Leguminosa', 'Gramínea', 'Consorciação ou Pousio');--> statement-breakpoint
CREATE TYPE "public"."cultura" AS ENUM('aveia_branca', 'aveia_preta', 'canola', 'centeio', 'cevada', 'ervilha', 'ervilhaca', 'feijao', 'girassol', 'milho', 'milho_pipoca', 'nabo_forrageiro', 'soja', 'sorgo', 'trigo', 'triticale');--> statement-breakpoint
CREATE TYPE "public"."finalidade_cevada" AS ENUM('cervejeira_malte_unico', 'malte_especial', 'outra');--> statement-breakpoint
CREATE TYPE "public"."metodo_extrator" AS ENUM('Mehlich-1', 'Mehlich-3');--> statement-breakpoint
CREATE TYPE "public"."num_cultivo" AS ENUM('1', '2');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'PRODUTOR');--> statement-breakpoint
CREATE TYPE "public"."sistema_cultivo_adubacao" AS ENUM('Convencional', 'Plantio Direto');--> statement-breakpoint
CREATE TYPE "public"."tipo_correcao" AS ENUM('Gradual', 'Total');--> statement-breakpoint
CREATE TABLE "analises_adubacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid,
	"talhao_id" uuid,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"uf" text NOT NULL,
	"cidade" text NOT NULL,
	"identificacao" text,
	"argila" real NOT NULL,
	"MO" real NOT NULL,
	"CTC_pH7" real NOT NULL,
	"P" real NOT NULL,
	"metodo_P" "metodo_extrator" NOT NULL,
	"K" real NOT NULL,
	"metodo_K" "metodo_extrator" NOT NULL,
	"Ca" real NOT NULL,
	"Mg" real NOT NULL,
	"S" real,
	"Cu" real,
	"Zn" real,
	"B" real,
	"Mn" real,
	"pH_agua" real,
	"cultura" "cultura" NOT NULL,
	"num_cultivo" "num_cultivo" NOT NULL,
	"rendimento_esperado" real NOT NULL,
	"cultura_antecedente" "cultura_antecedente",
	"sistema_cultivo" "sistema_cultivo_adubacao" NOT NULL,
	"tipo_correcao" "tipo_correcao" NOT NULL,
	"densidade_plantas" integer,
	"finalidade_cevada" "finalidade_cevada",
	"recomendacao_json" jsonb
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'PRODUTOR'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";