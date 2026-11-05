# Migrações do banco

Desde o AUD-07 (ver `docs/auditoria-2026-10-31.md`), o container do backend não roda mais `drizzle-kit push`. No start, o `entrypoint.sh` chama `node dist/database/migrar.js`. Esse script aplica os arquivos `backend/drizzle/*.sql` na ordem de `drizzle/meta/_journal.json`, usando o migrator do `drizzle-orm`, e registra cada um em `drizzle.__drizzle_migrations`. Se a migração falhar, o servidor não sobe (`set -e`).

## Mudança de schema (dia a dia)

1. Altere `backend/src/database/schema.ts`.
2. Rode `cd backend && npm run db:generate` e revise o SQL gerado em `backend/drizzle/` no PR.
3. No próximo deploy, o start do container aplica o SQL.

Nunca rode `db:push` nem `db:migrate` (drizzle-kit) contra banco real.

No banco local de desenvolvimento (Docker), use `npm run db:migrar:verificar` para ver o que seria feito e `npm run db:migrar` para aplicar. Os dois leem a `DATABASE_URL` do ambiente.

## Banco criado por `push` (primeira vez)

O banco de produção, e o local, foram criados por `drizzle-kit push` e não têm a tabela `drizzle.__drizzle_migrations`. Na primeira execução, o `migrar.js` compara o schema do banco com os snapshots de `drizzle/meta`. O que acontece depende do resultado:

| Situação | O que o `migrar.js` faz |
|---|---|
| Igual a um snapshot | Marca as migrações até ele como aplicadas (baseline) e roda as seguintes |
| Tem tudo do snapshot mais novo, mas sobraram colunas que a 0003 e a 0005 removem (`analises.sistema_efetivo`, `users.cpf`) | **Recusa** sem `--aplicar-remocoes`, porque essas migrações apagam dados. Com a opção, roda as duas e o baseline numa transação só, e desfaz tudo se o schema final não bater |
| Qualquer outra diferença | Recusa, lista a diferença e não grava nada |

O banco local do Docker está no segundo caso: o `push` nunca executou os `DROP` da 0003 e da 0005. Com `users.cpf` ainda `NOT NULL`, **nenhum cadastro novo funciona** nesse banco (`null value in column "cpf"`). Se a produção estiver igual, o cadastro está quebrado lá desde a remoção do CPF (05/10/2026). Isso só pode ser confirmado no passo 3 abaixo.

### Roteiro do primeiro deploy em produção

Rode no servidor, na pasta do `docker-compose.prod.yml`, **antes** de recriar o container do backend:

```bash
# 1. Backup (formato custom do pg_dump)
docker exec ibiferti-db-prod sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backup-antes-migrar-$(date +%F-%H%M).dump
ls -lh backup-antes-migrar-*.dump   # conferir que não está vazio

# 2. Baixar a imagem nova
docker compose -f docker-compose.prod.yml pull backend

# 3. Ver o que será feito (só leitura, não altera o banco)
docker compose -f docker-compose.prod.yml run --rm --no-deps --entrypoint node backend dist/database/migrar.js --verificar
```

O passo 4 depende do que o passo 3 mostrar:

- **"Pendentes" ou "Baseline", sem "Remoções a reaplicar":** pule para o passo 5. O start faz o resto.
- **"Remoções a reaplicar":** confira a lista do que será apagado (`users.cpf` e `analises.sistema_efetivo`). Depois rode uma vez:
  ```bash
  docker compose -f docker-compose.prod.yml run --rm --no-deps --entrypoint node backend dist/database/migrar.js --aplicar-remocoes
  ```
- **"Falhou: ... não bate com nenhum snapshot":** pare aqui e não suba a imagem nova. Mande a lista de diferenças para revisão.

```bash
# 5. Subir o backend novo
docker compose -f docker-compose.prod.yml up -d backend
docker logs --tail 20 ibiferti-api   # deve mostrar "[migrar] ..." e "Backend rodando"
```

Se algo der errado, o backup do passo 1 restaura o banco:

```bash
docker exec -i ibiferti-db-prod sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < backup-antes-migrar-AAAA-MM-DD-HHMM.dump
```

Depois do primeiro deploy, o banco já tem histórico e os próximos starts só aplicam o que for novo.
