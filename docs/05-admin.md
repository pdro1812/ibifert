# Etapa 5 — Painel Admin, Monitoramento e Validação Agronômica

Escopo lido: `frontend/src/pages/AdminDashboardPage.tsx`,
`AdminUsersPage.tsx`, `AdminAnalisesPage.tsx`, `MonitoramentoPage.tsx`,
`frontend/src/App.tsx`, `frontend/src/components/Navbar.tsx` — cruzando de
volta com `backend/src/routes/adminRoutes.ts` e `analisesRoutes.ts`
(rota `/regional-stats`), já mapeados em detalhe na Etapa 1.

> Fase de leitura — nenhum código alterado.

---

## 1. Gating de acesso — front e back concordam (ponto positivo)

Mapa de rotas (`App.tsx`):

| Rota | Layout | Proteção |
|---|---|---|
| `/`, `/adubacao`, `/monitoramento`, `/validacao`, `/login`, `/RegisterPage` | Público | Nenhuma |
| `/dashboard`, `/dashboard/talhao/:id`, `/dashboard/nova-analise` | Protegido | Qualquer usuário logado |
| `/historico` | Protegido | Só `PRODUTOR` (comentário no código explica: admin usa a tela de Usuários em vez do histórico próprio) |
| `/admin`, `/admin/usuarios`, `/admin/analises` | Protegido | Só `ADMIN` |

Esse gating client-side (`ProtectedRoute roles={[...]}`) é só uma
conveniência de UX — a proteção real está no backend, e ali eu já
confirmei na Etapa 1 que **todas** as rotas `/api/admin/*` exigem
`verificarToken` + `verificarRole(['ADMIN'])` no nível do router
(`adminRoutes.use(...)`, aplicado a tudo de uma vez, não rota por rota —
reduz o risco de esquecer de proteger uma rota nova). Diferente da Etapa
4 (fazendas/talhões), aqui front e back estão alinhados e não achei IDOR
novo nesta camada.

## 2. `/validacao` é pública e está no menu principal

`ValidacaoAgronomicaPage` (o comparador "Motor Original vs Motor SQL" da
Etapa 4, §6) está registrada como rota **pública**, sem `ProtectedRoute`,
e tem link direto no `Navbar` ("Validação Profe") — visível para
qualquer visitante, logado ou não. Isso significa que o achado crítico da
Etapa 3 (§4.1/4.2 — divergência entre os dois motores de calagem) não é
uma informação só de uso interno da equipe: **qualquer pessoa que acesse
o site pode reproduzir a divergência** clicando nos exemplos prontos.
Reforça a prioridade de decidir o destino de `motorStandalone.ts` (Etapa
3, recomendação): enquanto ele existir divergente, essa tela pública está
efetivamente documentando um bug do próprio produto para qualquer
visitante.

## 3. `AdminDashboardPage` — visão geral

Consome `GET /api/admin/stats` (Etapa 1): cards de total de usuários,
amostras (calagem) totais, total de adubação, amostras logadas vs
convidado, gráfico de amostras por UF e por sistema de manejo, e lista
dos 5 últimos cadastros. Sem interação de escrita — é só leitura,
renderizado com `recharts`. Nada a apontar aqui além do que já foi
descrito na Etapa 1 (a rota devolve `email` de outros usuários).

## 4. `AdminUsersPage` — achado: adubação não entra nas métricas por usuário

Ao clicar num usuário, a tela busca
`GET /api/admin/users/:id/full-details`, que (Etapa 1,
`adminRoutes.ts:176-214`) retorna `fazendas`, `talhoes` e `analises`
(**só a tabela de calagem**) desse usuário — **nunca busca
`analisesAdubacao`**. Efeito na tela:
- Talhões do usuário aparecem, mas o histórico de adubação de cada
  talhão nunca aparece (só o de calagem).
- O contador "Total Análises" na listagem principal (`GET /admin/users`)
  também só conta `analises` (calagem) via
  `count(analises.id)` — quem só fez análises de adubação aparece com
  "0 análises" mesmo tendo usado o sistema.
- Não há bug de segurança aqui (nenhum dado vaza indevidamente), é uma
  lacuna de completude: o painel administrativo sub-representa o uso
  real do sistema para quem usa mais adubação do que calagem. Fácil de
  corrigir (fazer o mesmo `leftJoin`/count que `adminRoutes.get('/analises')`
  já faz para a visão global, replicando para a visão por usuário) — mas
  decido convosco antes de tocar em código de produção.

## 5. `AdminAnalisesPage` — consistente com Etapa 1

Consome `GET /api/admin/analises` (calagem + adubação unificados,
corretamente, já documentado na Etapa 1). Filtros client-side (busca,
logado/convidado, tipo) e paginação **também client-side** — a rota
`/api/admin/analises` não pagina no banco, traz tudo de uma vez
(`orderBy(desc(criado_em))` sem `limit`). Com poucos dados isso não é
problema (seu caso atual), mas é um ponto de atenção de performance para
quando o volume crescer — o filtro/paginação deveriam migrar para
`LIMIT`/`OFFSET` no backend. Registro como nota de escalabilidade, não
como bug.

## 6. `MonitoramentoPage` — pública, agregada, consistente

Consome `GET /api/analises/regional-stats` (pública, Etapa 1 — parece
intencional: é estatística agregada de calagem por UF/cidade, incluindo
uma região especial "Alto Jacuí" hardcoded no backend
`analisesRoutes.ts:119-128`). A própria tela declara: *"Nenhuma
informação individual ou de propriedade específica é exposta"* — conferi
e é verdade, a rota só devolve médias/contagens agregadas, nunca um
registro individual. Só cobre **calagem** — adubação não entra nessas
estatísticas regionais, o que é consistente com o resto do produto
(monitoramento regional sempre foi um recurso específico de calagem) e
não parece um descuido.

## 7. Achados desta etapa

### 7.1 MÉDIO — Painel admin por usuário ignora adubação

Descrito em detalhe no item 4. Prioridade média porque é dado que o
admin usa para tomar decisão sobre a base de usuários, e hoje está
incompleto/incorreto para quem usa principalmente o módulo de adubação.

### 7.2 BAIXO — paginação/filtragem client-side em `AdminAnalisesPage`

Sem `limit`/`offset` no backend — funciona hoje, não escala. Nota para o
futuro, não é urgente com o volume atual.

### 7.3 Reforço — `/validacao` pública amplia o alcance do achado da Etapa 3

Não é um achado novo de segurança, é uma correção de escopo: o problema
de `motorStandalone.ts` já era "crítico" por afetar uma rota pública sem
autenticação (Etapa 1/3); agora está confirmado que ele também é
**visível publicamente através de uma tela do próprio produto**, o que
aumenta a urgência de decidir seu destino.

## 8. Resumo de prioridade (adiciona à lista acumulada)

1. Itens críticos já acumulados nas Etapas 1–4 continuam no topo (JWT
   hardcoded, `.env` commitado, trava de calagem quebrada, divergência
   `motorStandalone`, IDOR em fazendas/talhões/adubação).
2. **7.1** — completar a visão de adubação no painel admin por usuário.
3. **7.2** — mover paginação de `/admin/analises` para o backend quando o
   volume de dados justificar.

## Próximo passo

Seguir para a **Etapa 6 — Frontend Restante (fluxos de cálculo do usuário
final)**: `CalculadoraPage`, `AdubacaoPage`, autenticação (login/registro),
geração de PDF, integração IBGE, e confirmar empiricamente o achado da
Etapa 4 sobre `ValidacaoAgronomicaPage` mostrar "Batimento OK" no cenário
do bug crítico.
