# Trocar os segredos no servidor de produção

> Criado em 30/10/2026. A senha antiga do banco e o `JWT_SECRET` antigo
> ficaram públicos no GitHub — **trocar no servidor é o que efetivamente
> fecha a falha** (limpar o histórico do git só tira a exposição dali).

Os valores novos estão em `.env.producao`, na raiz do repositório local
(arquivo fora do git, permissão 600). Não colar esses valores em chat,
issue, commit ou print.

## Como o servidor está montado

- Pasta: `~/ibiferti-prod` (sem cópia do git — só arquivos de deploy).
- `docker-compose.yml` dessa pasta = `docker-compose.prod.yml` do
  repositório, renomeado.
- Containers: `ibiferti-web` (nginx + frontend), `ibiferti-api` (backend),
  `ibiferti-db-prod` (Postgres, volume `pgdata_prod`).
- O `nginx.conf` usado é o que vem **dentro da imagem** do frontend (não
  há volume montando o arquivo da pasta).
- Imagens vêm do Docker Hub (`pdros1812/ibiferti-*:latest`), publicadas
  pelo GitHub Actions a cada push na `main`.

## Ordem importa

- O Postgres só lê `POSTGRES_PASSWORD` na **primeira** criação do volume.
  Com o volume já existente, trocar o `.env` não muda a senha — é preciso
  rodar `ALTER USER`, senão o backend não conecta.
- A imagem nova do backend **recusa subir em produção** com `JWT_SECRET`
  de menos de 32 caracteres. Por isso o `.env` vai para o servidor antes
  de baixar a imagem nova.
- Os passos 1–4 funcionam com a imagem atual; o passo 5 só depois que o
  CI publicar as imagens novas.

## 1. Copiar os arquivos (no seu computador, na pasta do projeto)

Antes, no servidor, guarde o compose atual: `cp ~/ibiferti-prod/docker-compose.yml ~/ibiferti-prod/docker-compose.yml.bak`

```bash
scp -i ssh-key-2026-04-25.key .env.producao ubuntu@ibifert.duckdns.org:~/ibiferti-prod/.env
```

```bash
scp -i ssh-key-2026-04-25.key docker-compose.prod.yml ubuntu@ibifert.duckdns.org:~/ibiferti-prod/docker-compose.yml
```

(Se você entra no servidor de outro jeito, troque `-i …` e o endereço.)

## 2. Conferir (no servidor)

```bash
cd ~/ibiferti-prod && chmod 600 .env && docker compose config --quiet && echo "compose ok"
```

## 3. Trocar a senha dentro do banco (no servidor)

Lê a senha nova do `.env`, sem ela aparecer no terminal:

```bash
cd ~/ibiferti-prod && set -a && . ./.env && set +a && printf "ALTER USER %s WITH PASSWORD '%s';\n" "$POSTGRES_USER" "$POSTGRES_PASSWORD" | docker exec -i ibiferti-db-prod psql -q -U "$POSTGRES_USER" -d "$POSTGRES_DB" && echo "senha do banco trocada"
```

## 4. Recriar os containers com o compose novo (no servidor)

```bash
cd ~/ibiferti-prod && docker compose up -d && sleep 5 && docker logs --tail 5 ibiferti-api && docker ps --format '{{.Names}}\t{{.Ports}}'
```

Esperado: log "Backend rodando na porta 3000" e `ibiferti-api` com
`127.0.0.1:3000->3000/tcp` (não mais `0.0.0.0`). O volume do banco é
mantido. Todos os usuários vão precisar entrar de novo (o `JWT_SECRET`
mudou).

Conferir de fora (no seu computador) que a porta 3000 fechou — deve dar
erro/timeout:

```bash
curl -m 5 http://ibifert.duckdns.org:3000/
```

Se tudo certo, apagar o backup do compose (ele tem a senha antiga):
`rm ~/ibiferti-prod/docker-compose.yml.bak`

## 5. Depois do push no GitHub e do CI verde (no servidor)

```bash
cd ~/ibiferti-prod && docker compose pull && docker compose up -d && sleep 5 && docker logs --tail 5 ibiferti-api
```

Testar no site: cadastro com o checklist de senha, login, "Minha conta".

## Limpeza recomendada no servidor

- `frontend/` contém só um diretório vazio `nginx.conf` (sobra de um
  volume antigo, dono root). Conferir com `sudo find ~/ibiferti-prod/frontend`
  e apagar com `sudo rm -rf ~/ibiferti-prod/frontend`.
- `users_backup.sql` (dados de usuários) está legível por qualquer conta
  do servidor. Se não for mais necessário, apagar; senão
  `chmod 600 ~/ibiferti-prod/users_backup.sql`.

## Se algo der errado

- Backend reiniciando com "JWT_SECRET fraco": o `.env` não foi lido —
  confira se está em `~/ibiferti-prod/.env` e tem `JWT_SECRET=`.
- Backend com erro de senha no Postgres (`28P01`): o passo 3 não foi
  aplicado; rode-o de novo e depois `docker compose up -d`.
- Para voltar ao estado anterior: `mv docker-compose.yml.bak docker-compose.yml && docker compose up -d`
  (só funciona se o passo 3 ainda não tiver sido feito).

## Outros acessos para revisar

- Senha/token do Docker Hub usado no GitHub Actions (`DOCKER_PASSWORD`):
  se for a senha da conta, troque por um *access token* do Docker Hub.
- A chave `ssh-key-2026-04-25.key` na raiz do repositório local nunca foi
  para o git (`*.key` está no `.gitignore`), mas mantenha-a fora da pasta
  do projeto se possível.
