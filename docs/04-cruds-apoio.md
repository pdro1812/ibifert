# Etapa 4 — CRUDs de Apoio (Fazendas, Talhões e Análises)

Escopo lido: `backend/src/routes/fazendasRoutes.ts`,
`backend/src/database/fazendas.ts`, `backend/src/routes/analisesRoutes.ts`,
`backend/src/database/analises.ts` (calagem) e `backend/src/database/
adubacao.ts` (já lidos nas Etapas 1–3), `frontend/src/pages/FazendasPage.tsx`,
`frontend/src/pages/NovaAnalisePage.tsx`,
`frontend/src/pages/HistoricoAnalisesPage.tsx`,
`frontend/src/pages/TalhaoDetalhesPage.tsx`,
`frontend/src/pages/ValidacaoAgronomicaPage.tsx`.

> Fase de leitura — nenhum código alterado. Os achados de IDOR já haviam
> sido sinalizados na Etapa 1 a partir da leitura das rotas; aqui eu
> confirmo o caminho completo (dado → tela) e adiciono um achado novo e
> relevante encontrado no frontend.

---

## 1. Modelo de dados e relação entre entidades

```
users (1) ── (N) fazendas ── (N) talhoes ── (N) analises (calagem)
                                        └── (N) analises_adubacao
```

Nenhuma dessas relações é uma FK real no banco (já registrado na Etapa 1)
— são só campos `uuid` soltos. Isso significa: apagar um usuário não
apaga (nem impede apagar) suas fazendas; apagar uma fazenda **apaga em
cascata os talhões dela via código** (`deleteFazenda` em
`database/fazendas.ts:33-40` deleta manualmente os talhões antes da
fazenda), mas **não** apaga as análises vinculadas a esses talhões — elas
ficam no banco com um `talhao_id` órfão (apontando para um talhão que não
existe mais). Não é uma falha de segurança, é uma característica da
modelagem sem integridade referencial que vale considerar se o histórico
de análises deveria ser preservado com um "talhão removido" explícito em
vez de simplesmente ficar solto.

## 2. Fluxo de CRUD — Fazendas e Talhões

**Criar fazenda**: `FazendasPage` (form) → `postFazenda()` (`api.ts`) →
`POST /api/fazendas` → `createFazenda()` grava `usuario_id = req.userId`
(do token) — o dono é sempre quem está logado, correto, o usuário não
escolhe o `usuario_id`.

**Listar fazendas**: `GET /api/fazendas` → `getFazendasByUsuario(usuarioId)`
— filtra corretamente pelo dono. Cada fazenda retorna já com seus talhões
aninhados (e cada talhão com a última análise de calagem, via
`getTalhoesByFazenda`).

**Criar talhão**: `POST /api/fazendas/:fazendaId/talhoes` — recebe
`fazendaId` da URL e grava `createTalhao({ fazenda_id: fazendaId, ... })`
**sem checar se essa fazenda pertence ao usuário logado**. Validação de
corpo também é manual (`if (!nome || !cultura) return 400`), não usa zod.

**Deletar fazenda**: `DELETE /api/fazendas/:id` — `deleteFazenda(id)` só
usa o `id` da URL, sem cruzar com `usuario_id`.

**Deletar talhão**: `DELETE /api/fazendas/talhoes/:id` — mesma coisa.

**Ver talhão / análises de um talhão**: `GET /api/fazendas/talhoes/:id` e
`GET /api/fazendas/talhoes/:id/analises` — mesma coisa, sem checagem de
dono.

## 3. IDOR confirmado — detalhamento com caminho completo

Já sinalizado na Etapa 1 a partir da leitura das rotas; aqui está o
caminho ponta a ponta confirmado lendo também o `database/fazendas.ts`
(a camada de acesso a dados repete o mesmo padrão — nenhuma das funções
abaixo recebe ou usa `usuario_id` como filtro):

| Ação | Endpoint | Função de banco | Filtra por dono? |
|---|---|---|---|
| Listar fazendas | `GET /` | `getFazendasByUsuario` | ✅ Sim |
| Criar fazenda | `POST /` | `createFazenda` | ✅ Sim (usuario_id vem do token) |
| **Deletar fazenda** | `DELETE /:id` | `deleteFazenda` | ❌ Não |
| **Criar talhão** | `POST /:fazendaId/talhoes` | `createTalhao` | ❌ Não (não valida dono da fazenda) |
| **Deletar talhão** | `DELETE /talhoes/:id` | `deleteTalhao` | ❌ Não |
| **Ver talhão** | `GET /talhoes/:id` | `getTalhaoById` | ❌ Não |
| **Ver análises do talhão** | `GET /talhoes/:id/analises` | `getAnalisesByTalhao` | ❌ Não |
| Ver análise de adubação | `GET /api/adubacao/:id` | `buscarAnaliseAdubacaoPorId` | ❌ Não (Etapa 1) |

Ou seja: 6 dos 8 endpoints de escrita/leitura por ID nessa camada não
verificam posse. Qualquer conta autenticada — mesmo a mais nova, recém
cadastrada — pode, sabendo ou adivinhando um UUID:
- Apagar a fazenda e todos os talhões de qualquer outro produtor.
- Ler nome/cultura/histórico de análises de qualquer talhão.
- Criar um talhão "pendurado" na fazenda de outra pessoa.

**Mitigação de risco hoje**: UUIDs v4 não são adivinháveis por força
bruta em tempo viável — o risco real depende de UUIDs vazarem por outro
canal (ex.: um usuário compartilhando print de URL, ou um admin
inadvertidamente expondo IDs). Ainda assim, é uma falha de controle de
acesso clássica (OWASP A01 — Broken Access Control) e deve ser corrigida
adicionando `AND usuario_id = req.userId` (ou um `INNER JOIN` equivalente
por fazenda, no caso de talhão) em cada uma dessas 6 queries.

## 4. Fluxo de inserção — `NovaAnalisePage` (lote / bulk)

Essa é a tela principal de entrada de dados de solo — permite cadastrar
várias amostras de uma vez, para calagem ou adubação, vinculadas a
talhões de uma fazenda:

1. Usuário escolhe o modo (`CALAGEM`, `ADUBACAO` ou `AMBOS` — padrão, desde 2026-10-05), preenche
   "configurações globais" (aplicadas a todas as linhas: sistema de
   manejo, PRNT, cultura, rendimento etc.) e uma planilha de linhas
   (cada linha = 1 amostra, com seu próprio `talhao_id`).
2. `isCellEnabled()` replica no frontend a mesma lógica condicional de
   campos que existe no backend (`determinarCamposNecessarios` da
   Etapa 2) — decide quais colunas ficam habilitadas por linha, com base
   no SMP/pH digitado e no manejo global. É uma **segunda implementação**
   dessa regra (não importa a lógica do backend, reescreve em JS no
   componente) — é mais um lugar para desalinhar se a regra do backend
   mudar (mesmo padrão de risco já visto no `motorStandalone` da Etapa 3,
   em escala menor aqui).
   > **Atualização 2026-08-23**: o risco descrito acima se confirmou —
   > `isCellEnabled` lia `configGlobais.primeira_calagem` (propriedade
   > inexistente; o estado usa `primeiraCalagem`), fazendo o toggle
   > "1ª Calagem/Reaplicação" não ter nenhum efeito real na tela, e
   > travando o preenchimento de `v_atual` em PD Consolidado + reaplicação
   > + pH baixo + SMP alto (exigido pelo `CalagemSchema` no envio, sem
   > forma de corrigir pela UI). Corrigido; detalhe completo e cobertura
   > de teste em `docs/ref-calagem.md §9.2`.
3. Ao salvar, cada linha é validada **no cliente** com o `CalagemSchema`
   ou `AdubacaoSchema` **locais do frontend**
   (`frontend/src/schemas/*.ts` — não o pacote `shared-schemas`,
   confirma de novo o achado da Etapa 3 de que esse pacote está morto).
4. Amostras válidas são agrupadas por `talhao_id` e enviadas em paralelo
   via `postAnalisesBulk` / `postAdubacaoBulk` → `POST /api/analises/bulk`
   ou `POST /api/adubacao/bulk` (ambas exigem `verificarToken`, corretas).
   No modo `AMBOS`, a linha só é enviada se passar nos dois schemas, e os
   dois bulks rodam juntos; falha parcial → resumo por módulo + reenvio só
   do que falhou (o bulk de adubação responde 200 com `sucesso:false` por
   amostra, e agora o frontend lê isso).
5. O backend **revalida tudo de novo** com o zod do lado do servidor
   (`validarEntrada` / `AdubacaoSchema.parse`) antes de calcular e salvar
   — a validação client-side é só UX, não é a fonte de verdade, o que é o
   padrão correto (nunca confiar só no client).

**Observação sobre `talhao_id`**: o backend do bulk (`analisesRoutes.ts`
e `adubacaoRoutes.ts`) recebe `talhao_id` do corpo da requisição e grava
direto, sem checar se aquele talhão pertence ao usuário logado — mesma
categoria de IDOR do item 3 (aqui na forma de "gravar análise associada a
talhão de outro usuário", em vez de ler/apagar).

## 5. Leitura de histórico — `HistoricoAnalisesPage` e `TalhaoDetalhesPage`

Ambas consomem `GET /api/analises/historico`, que (Etapa 1) **filtra
corretamente por `req.userId`**, exceto para admin. `TalhaoDetalhesPage`
busca o histórico completo do usuário e filtra no cliente por
`talhao_id === id` da URL — funciona, mas reforça por que o achado do
item 3 importa: mesmo que essa tela específica não vaze dado de outro
usuário (porque o endpoint que ela usa já é seguro), a API
`GET /api/fazendas/talhoes/:id/analises` (não usada por essa tela, mas
existente e chamável direto) **vaza o mesmo tipo de dado sem essa
proteção**.

## 6. Achado novo — página de auto-validação já expõe a divergência da Etapa 3

`ValidacaoAgronomicaPage.tsx` é uma tela already existente no produto,
cujo propósito é literalmente **comparar lado a lado o "Motor Original"
(`motorCalagem`) contra o "Motor SQL" (`motorStandalone`)** para os
mesmos 6 cenários de teste, mostrando "Batimento OK" ou "Divergência".
Isso confirma duas coisas importantes:

1. **O time já sabia que os dois motores podem divergir** — essa tela
   existe justamente para checar isso manualmente. Os achados críticos
   da Etapa 3 (§4.1/4.2) não são uma surpresa de arquitetura, são
   exatamente o tipo de problema que essa tela foi construída para pegar.
2. **Risco de falso-positivo na própria ferramenta de validação**: o
   "Exemplo 4" dessa página (`pH_agua: 5.2, V_atual: 66, Al_sat: 8`,
   PD_CONSOLIDADO) testa exatamente o cenário do bug crítico da Etapa 2
   (§6.0 — trava que nunca dispara). Testei: como o `motorStandalone`
   (`obtemDoseDiretoConsolidadoSemRestricao`) também exige `pH >= 5.5`
   como parte da sua condição de "não precisa calagem" (mesma
   inconsistência, coincidentemente na mesma direção), os **dois motores
   erram do mesmo jeito nesse cenário específico** — o que faria a tela
   mostrar **"Batimento OK"** mesmo com os dois errados. Ou seja, hoje
   essa ferramenta de validação pode dar falsa confiança justamente no
   caso mais crítico já identificado. Vale confirmar meu cálculo rodando
   a tela manualmente (Etapa 6, quando eu cobrir o frontend com mais
   profundidade), mas registro agora porque é diretamente relevante ao
   bug já reportado.

## 7. Outros achados

### 7.1 BAIXO — `require()` dinâmico dentro de handlers de rota

`fazendasRoutes.ts:112` e `:126` usam
`const { getTalhaoById } = require('../database/fazendas');` dentro da
própria função da rota, em vez de importar no topo do arquivo (como o
resto do arquivo já faz, linhas 6-13). Funciona (é o mesmo módulo, o
`require` só reexecuta o cache do Node), mas é inconsistente com o padrão
ESM/import usado em todo o resto do projeto e não tem motivo aparente —
provavelmente sobrou de uma edição feita direto nessas duas rotas depois
que o resto do arquivo já existia. Limpeza trivial, sem risco.

### 7.2 BAIXO — sem validação de schema em `fazendasRoutes.ts`

`POST /` e `POST /:fazendaId/talhoes` validam só com `if (!campo)`, sem
zod — diferente de calagem/adubação, que usam schema completo com
mensagens específicas. Não é uma falha de segurança por si (não abre
injeção, o Drizzle parametriza), mas é inconsistente com o resto do
projeto e permite, por exemplo, salvar `uf` com qualquer string (não
valida sigla de 2 letras como o `RegistroSchema` de usuário faz).

### 7.3 INFORMATIVO — `talhao.cultura` não é o mesmo vocabulário de `cultura` da adubação

`FazendasPage` grava `cultura` do talhão como um texto livre a partir de
uma lista fixa em português (`'Soja', 'Milho', 'Trigo'...`), sem
validação de enum no banco (`talhoes.cultura` é `text()` puro no
schema). Já o formulário de adubação usa um enum próprio, em
`snake_case` (`'soja', 'milho', ...`, ver `CulturaSchema` da Etapa 3).
Não há nenhuma sincronização entre os dois — ao lançar uma adubação para
um talhão cadastrado como "Milho", o usuário tem que escolher de novo a
cultura no formulário de adubação (default é sempre `'soja'`), sem
aproveitar o que já foi cadastrado no talhão. Não é bug, é uma
oportunidade de produto (preencher a cultura da adubação a partir do
talhão selecionado) que fica registrada para quando vocês quiserem.

## 8. Resumo de prioridade (adiciona à lista acumulada)

1. IDOR nos 6 endpoints da tabela da seção 3 — mesma prioridade dos
   achados críticos de segurança da Etapa 1 (é a mesma classe de
   problema, agora com o caminho completo confirmado).
2. Confirmar em Etapa 6 se `ValidacaoAgronomicaPage` realmente mostra
   "Batimento OK" no Exemplo 4 hoje (falso-positivo da ferramenta de
   validação) — relevante para não deixar a própria equipe confiar numa
   checagem que pode estar mascarando o bug da Etapa 2.
3. Itens 7.1/7.2/7.3 — baixa prioridade, limpeza/consistência.

## Próximo passo

Seguir para a **Etapa 5 — Painel Admin e Monitoramento**.
