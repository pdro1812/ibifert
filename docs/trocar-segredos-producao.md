# Trocar os segredos no servidor de produção

> Criado em 30/10/2026. A senha antiga do banco e o `JWT_SECRET` antigo
> ficaram públicos no GitHub — **trocar no servidor é o que efetivamente
> fecha a falha** (limpar o histórico do git só tira a exposição dali).

Os valores novos estão em `.env.producao`, na raiz do repositório local
(arquivo fora do git, permissão 600). Não colar esses valores em chat,
issue, commit ou print.

## Ordem importa

O Postgres só lê `POSTGRES_PASSWORD` na **primeira** criação do volume.
Com o volume já existente, trocar o `.env` não muda a senha do banco — é
preciso rodar `ALTER USER` antes, senão o backend não conecta.

E a imagem nova do backend **recusa subir em produção** com `JWT_SECRET`
de menos de 32 caracteres (o antigo tinha 21). Por isso o `.env` precisa
estar no servidor antes de baixar a imagem nova.

## Passo a passo (no servidor, na pasta do `docker-compose.prod.yml`)

1. Copiar o arquivo do seu computador para o servidor, já com o nome `.env`:

   ```bash
   scp .env.producao USUARIO@ibifert.duckdns.org:CAMINHO_DO_PROJETO/.env
   ```

   No servidor: `chmod 600 .env`.

2. Atualizar o `docker-compose.prod.yml` do servidor com a versão nova do
   repositório (ele passa a ler tudo do `.env` e não expõe mais a porta
   3000 para a internet).

3. Trocar a senha dentro do banco que já está rodando (lê a senha nova do
   `.env`, sem digitar o valor no terminal):

   ```bash
   set -a; . ./.env; set +a
   printf "ALTER USER %s WITH PASSWORD '%s';\n" "$POSTGRES_USER" "$POSTGRES_PASSWORD" \
     | docker exec -i ibiferti-db-prod psql -q -U "$POSTGRES_USER" -d "$POSTGRES_DB"
   ```

4. Baixar as imagens novas e recriar os containers:

   ```bash
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```

5. Conferir:

   ```bash
   docker logs --tail 20 ibiferti-api        # deve mostrar "Backend rodando na porta 3000"
   curl -s -o /dev/null -w "%{http_code}\n" https://ibifert.duckdns.org/api/auth/me   # esperado 401
   ```

   Todos os usuários vão precisar entrar de novo (o `JWT_SECRET` mudou e a
   sessão agora é por cookie).

## Se algo der errado

- Backend reiniciando com "JWT_SECRET fraco": o `.env` não foi lido —
  confira se está na mesma pasta do compose e se tem `JWT_SECRET=`.
- Backend com erro de senha no Postgres (`28P01`): o passo 3 não foi
  aplicado; rode-o de novo.

## Outros acessos para revisar

- Senha/token do Docker Hub usado no GitHub Actions (`DOCKER_PASSWORD`):
  se for a senha da conta, troque por um *access token* do Docker Hub.
- A chave `ssh-key-2026-04-25.key` na raiz do repositório local nunca foi
  para o git (`*.key` está no `.gitignore`), mas mantenha-a fora da pasta
  do projeto se possível.
