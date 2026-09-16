# Etapa 6 — Frontend Restante (fluxos de cálculo do usuário final)

Escopo lido: `CalculadoraPage.tsx`, `AdubacaoPage.tsx`, `LoginPage.tsx`,
`RegisterPage.tsx`, `frontend/src/services/api.ts` (já visto em partes na
Etapa 4), `services/ibge.ts`, `services/pdfGenerator.ts`,
`services/pdfGeneratorAdubacao.ts`, `App.tsx`, `Navbar.tsx` (já cobertos
na Etapa 5 para o gating de admin).

> Fase de leitura, mas com uma verificação empírica: rodei um script para
> confirmar a hipótese da Etapa 4/5 sobre a tela `ValidacaoAgronomicaPage`
> mostrar falso "Batimento OK". Nenhum código do projeto foi alterado.

> **Atualização 2026-08-23**: numa sessão de correção posterior (fora do
> fluxo de etapas acima), foram encontrados e corrigidos bugs adicionais
> em `CalculadoraPage.tsx` e `AdubacaoPage.tsx` não relacionados aos
> achados abaixo — travas silenciosas em campos condicionais e em
> validação de formulário. Ver `docs/ref-calagem.md §9` e
> `docs/ref-adubacao.md §9` para o detalhe. Os achados 2.1/2.2/3.1 desta
> etapa (botão "Salvar" decorativo, perda de dado no fluxo de login)
> **continuam válidos e não corrigidos** — não fazem parte do escopo da
> correção citada.

---

## 1. Confirmado — `ValidacaoAgronomicaPage` mostra "Batimento OK" no cenário do bug crítico

Rodei o "Exemplo 4" (`pH_agua: 5.2, SMP: 5.8, V_atual: 66, Al_sat: 8,
CTC_pH7: 10`, PD Consolidado, reaplicação) chamando as duas funções
diretamente, do jeito que o frontend mapeia:

```
MOTOR ORIGINAL: { aplicar_calcario: true, NC_ajustada: 1.05 }
MOTOR SQL:      { dose_recomendada: 1.05, modo_aplicacao: 0, ... }
BATIMENTO OK?   true
```

Confirma a suspeita da Etapa 4: a própria tela de validação do produto
mostraria **"Batimento OK"** aqui, com os dois motores concordando em
"aplicar 1,05 t/ha" — quando o texto "Comportamento Esperado" da própria
tela diz que o correto seria **zerar a dose (0,0 t/ha)**. Os dois motores
erram na mesma direção (ambos exigem `pH >= 5.5` como parte da condição
de dispensa, quando deveriam aceitar `pH < 5.5` com `V_atual >= 65` e
`Al_sat < 10`), então a ferramenta de comparação não detecta o problema.

**Por que isso importa mais do que só "mais um bug"**: essa tela existe
para dar confiança de que o motor está correto. Hoje ela pode reportar
"Batimento OK" exatamente no caso mais sutil e mais fácil de um técnico
não perceber manualmente (dose plausível, só que desnecessária) — ou
seja, na ausência da correção do achado da Etapa 2 (§6.0), a ferramenta
de validação do próprio produto está mascarando o problema em vez de
expô-lo. Isso é evidência a mais a favor de tratar a correção do
`motorCalagem.ts` como prioridade máxima.

## 2. Fluxo `CalculadoraPage` (calagem pública)

Formulário extenso e bem estruturado — reimplementa em React (com
`react-hook-form` + `zodResolver(CalagemSchema)`) a mesma árvore de
campos condicionais do backend (Blocos B1/B2/B3, já vistos na Etapa 2 via
`determinarCamposNecessarios`), com tooltips explicando cada bloco pro
usuário. Fluxo:

1. Preenche localização (IBGE), sistema de manejo, dados de solo.
2. Aceita os Termos de Uso (checkbox obrigatório — bloqueia envio se não
   marcado, validado no cliente antes do submit).
3. Envia para `calcularCalagem()` → `POST /api/analises/calcular`
   — rota pública, mas que **já salva no banco automaticamente** do lado
   do servidor (Etapa 1: se tiver um token válido no header, associa ao
   usuário; senão salva como convidado, `usuario_id: null`).
4. Mostra resultado, com botões de **PDF** e **Salvar**.

### 2.1 CONFIRMADO — botão "Salvar" é decorativo quando logado

`handleTentarSalvar` (`CalculadoraPage.tsx:249-263`): se `isLoggedIn`,
faz só `setSalvo(true)` — **nenhuma chamada de API**. Isso não é um bug
funcional grave porque, como visto no item 3 acima, o cálculo **já foi
salvo automaticamente** no momento do `POST /calcular` (o backend tenta
extrair o `userId` do token, se houver, e chama `salvarAnalise` de
qualquer forma). Então o resultado final é correto — a análise é salva —
mas o botão "Salvar" é enganoso: ele simula uma ação que, na real, já
tinha acontecido antes de o usuário clicar. Vale simplificar a UI (tirar
o botão, ou renomeá-lo para algo como "Salvo automaticamente") para não
sugerir uma ação que não existe.

### 2.2 CONFIRMADO — fluxo "login para salvar" descarta o resultado calculado

Quando o usuário **não está logado** e clica em "Salvar":
```js
sessionStorage.setItem('analisePendente', JSON.stringify({ dados: getValues(), resultado }));
navigate('/login');
```
A intenção é clara pelo nome da chave (`analisePendente`) e pelo padrão
comum de "faça login para continuar de onde parou". Mas conferi
`LoginPage.tsx:43-49` e `RegisterPage.tsx:61-67` — o único uso dessa
chave depois é:
```js
const pendente = sessionStorage.getItem('analisePendente');
if (pendente) {
  sessionStorage.removeItem('analisePendente');
  navigate('/dashboard/nova-analise', { replace: true });
  return;
}
```
Ou seja: **o conteúdo de `pendente` nunca é lido nem reenviado** — só
serve como uma flag booleana para decidir pra onde navegar depois do
login. O resultado que o usuário calculou (e o formulário preenchido) é
descartado, e ele é jogado numa tela de **inserção em lote vazia**
(`NovaAnalisePage`, Etapa 4), tendo que preencher tudo de novo do zero —
inclusive escolher fazenda/talhão, que nem existiam no fluxo original da
calculadora pública. Do ponto de vista do usuário, a experiência real é
"cliquei em salvar, fiz login, e perdi meu cálculo" — o oposto do que a
UI promete implicitamente. Fica registrado como achado funcional (não é
falha de segurança, é perda de dado/trabalho do usuário), prioridade
alta por impacto direto na experiência de quem já se deu ao trabalho de
preencher uma análise completa.

## 3. Fluxo `AdubacaoPage`

Estrutura parecida (Grupo A/B, `react-hook-form` + zod), com um recurso a
mais: botões de "auto-preencher cenário" (3 exemplos prontos: soja
manutenção, milho correção total, cevada cervejeira) — útil para
demonstração/teste, não afeta produção.

### 3.1 Mesmo padrão do achado 2.2, mas pior — chave nunca é lida em lugar nenhum

`handleTentarSalvar` (`AdubacaoPage.tsx:113-120`) grava
`sessionStorage.setItem('adubacaoPendente', ...)` e redireciona pro
login. Busquei **em todo o projeto** (`grep -r adubacaoPendente`) e essa
chave **não é lida em nenhum outro arquivo** — nem `LoginPage`, nem
`RegisterPage`, nem em lugar nenhum. É estritamente pior que o caso da
calagem: lá pelo menos a navegação pós-login muda (vai pra
`nova-analise`); aqui nem isso acontece — depois do login, o usuário cai
no destino padrão (`/dashboard` ou `/admin`), sem nenhum indício de que
havia uma adubação pendente, e o item fica órfão no `sessionStorage` (sem
consequência prática, já que `sessionStorage` expira sozinho ao fechar a
aba, mas ilustra que a feature nunca foi terminada).

**Nota**: diferente do fluxo de calagem, a adubação **não é salva
automaticamente** no `POST /adubacao/calcular` (Etapa 3 confirmou: essa
rota só calcula, não persiste — só `/adubacao/salvar`, que exige login,
persiste). Então aqui a perda é mais séria que na calagem: o usuário
realmente perde o resultado calculado e precisa recalcular do zero após
logar, porque não existe salvamento automático de reserva.

## 4. `services/ibge.ts` — dado externo, uso correto

Consome a API pública do IBGE (`servicodados.ibge.gov.br`) direto do
browser, sem passar pelo backend, para popular listas de estado/município
nos formulários (filtra só RS/SC, coerente com o escopo regional do
produto). Não afeta o cálculo agronômico — é só para preencher `uf`/
`cidade` como metadado da análise. Sem achados de segurança (é uma API
pública, sem autenticação, sem dado sensível trafegando).

## 5. Geração de PDF — dado processado no client, mas sem vazamento

Verifiquei o payload que monta o PDF (`pdfGenerator.ts` para calagem,
estrutura análoga em `pdfGeneratorAdubacao.ts`): ele recebe só
`dadosEntrada` (o que o próprio usuário digitou no formulário) e
`resultado` (a resposta que a API já devolveu pra esse mesmo usuário).
**Não há nenhuma chamada de rede adicional nem acesso a dado de outro
registro/usuário durante a geração do PDF** — é só formatação do que já
estava na tela. Ao contrário da preocupação inicial registrada no plano
(Etapa 0), não encontrei exposição de dado de terceiros aqui: o risco
que existia era teórico (dado teria que já ter vindo de algum outro lugar
com escopo maior que o do usuário), e não se confirma nesses dois
arquivos.

## 6. `LoginPage` / `RegisterPage` — consistente com Etapa 1

Validação client-side com zod local (schemas próprios, não importam de
`shared-schemas` — mais uma confirmação do achado da Etapa 3). CPF no
`RegisterSchema` do frontend usa `.min(11)` (permite mais de 11 dígitos),
enquanto o backend usa `.length(11)` (exatamente 11) — divergência
pequena, mas sem risco: o backend é quem valida de verdade antes de
gravar, o pior caso é o usuário só descobrir o erro depois de enviar em
vez de na hora. Login/registro tratam erro de API de forma amigável,
sem vazar detalhes internos além da mensagem que o backend já formatou.

## 7. Resumo de achados desta etapa

| # | Achado | Severidade |
|---|---|---|
| 1 | `ValidacaoAgronomicaPage` mostra "Batimento OK" falso no cenário do bug crítico da Etapa 2 | Reforça criticidade já registrada — não é um achado novo isolado, é confirmação |
| 2.1 | Botão "Salvar" da calagem é decorativo quando logado (não erra, mas engana) | Baixo |
| 2.2 | Fluxo "login para salvar" descarta o resultado calculado (calagem) | Alto (perda de trabalho do usuário) |
| 3.1 | Mesmo problema na adubação, pior — chave nunca é lida, e adubação não tem salvamento automático de reserva | Alto (perda de trabalho do usuário, sem rede de segurança) |
| 6 | Pequena divergência de validação de CPF entre front e back | Baixo |

Nenhum achado novo de segurança propriamente dito nesta etapa — os
riscos de auth/IDOR já estavam mapeados; o que essa etapa trouxe de novo
foi principalmente **perda de dado do usuário por feature incompleta**
(itens 2.2 e 3.1), que embora não seja "segurança", é o tipo de bug que
mais gera reclamação direta de quem usa o produto no campo.

## 8. Resumo de prioridade (adiciona à lista acumulada)

1. Itens críticos das Etapas 1–5 continuam no topo.
2. **2.2 / 3.1** — implementar de verdade o fluxo "login para continuar":
   reidratar `dados`/`resultado` do `sessionStorage` depois do login e
   oferecer o "Salvar" real (para adubação, chamar `salvarAdubacao`
   automaticamente; para calagem, ver item 2.1 já que o auto-save já
   existe no backend — só falta a adubação ganhar o mesmo padrão, ou o
   fluxo do frontend ser corrigido para não prometer o que não entrega).
3. **2.1** — decisão de produto: manter o botão "Salvar" como está
   (redundante mas inofensivo) ou simplificar a UI.

## Próximo passo

Seguir para a **Etapa 7 — Consolidação Final**: documento-índice,
lista priorizada única de todos os achados de segurança e código morto
das Etapas 1–6, e checklist de backlog.
