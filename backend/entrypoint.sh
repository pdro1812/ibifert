#!/bin/sh
# Start do container de produção (AUD-07).
# set -e: se a migração falhar, o servidor não sobe com schema velho.
set -e

echo "Aplicando migrações (drizzle/*.sql)..."
node dist/database/migrar.js

echo "Iniciando o servidor..."
# exec: o node vira o PID 1 e recebe o SIGTERM do docker stop (tratado em server.ts).
exec node dist/server.js
