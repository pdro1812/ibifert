-- backend/drizzle/0001_fazendas_talhoes.sql

CREATE TABLE IF NOT EXISTS "fazendas" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "usuario_id" uuid,
  "nome"       text NOT NULL,
  "municipio"  text NOT NULL,
  "uf"         text NOT NULL,
  "criado_em"  timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "talhoes" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "fazenda_id" uuid,
  "nome"       text NOT NULL,
  "cultura"    text NOT NULL,
  "criado_em"  timestamp DEFAULT now() NOT NULL
);