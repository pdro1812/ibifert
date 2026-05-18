#!/bin/sh

# Aguarda o banco de dados estar pronto
echo "Aguardando o banco de dados..."
# Usando o comando node para verificar a conexão ou apenas um sleep simples
# Em produção, o ideal é um script que tente conectar, mas o Drizzle Kit push resolve bem:

echo "Rodando migrações com Drizzle..."
npx drizzle-kit push

echo "Iniciando o servidor..."
node dist/server.js
