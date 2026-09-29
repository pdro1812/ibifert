CREATE TABLE "feedbacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"telefone" text NOT NULL,
	"uf" text NOT NULL,
	"cidade" text NOT NULL,
	"email" text,
	"descricao" text NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
