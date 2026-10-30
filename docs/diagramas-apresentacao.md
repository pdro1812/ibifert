# Diagramas da apresentação — IbIFerti

Três diagramas em Mermaid, gerados a partir do código (`backend/src/routes`, `services`, `middlewares`, `database` e o gerador de PDF do frontend). Cada um tem no máximo 12 caixas e rótulos sem nomes de arquivo ou função.

---

## 1. Arquitetura da aplicação

```mermaid
%%{init: {"theme": "base", "flowchart": {"nodeSpacing": 30, "rankSpacing": 45, "padding": 14, "wrappingWidth": 420}, "themeVariables": {"fontSize": "20px", "edgeLabelBackground": "#ffffff", "lineColor": "#374151"}}}%%
flowchart LR
  U["Usuário"]
  API["API do sistema"]
  MOT["Motores de cálculo<br/>calagem e adubação"]

  subgraph NAV["No navegador"]
    direction TB
    W["Interface web<br/>formulários e resultados"]
    PDF["Relatório PDF"]
    W -->|"gera"| PDF
  end

  subgraph SEG["Área logada — exige login"]
    direction TB
    AUTH{{"Login válido?"}}
    ROLE{{"Perfil permitido?"}}
    DB[("Banco de dados")]
    DENY["Acesso negado"]
    AUTH -->|"sim"| ROLE
    ROLE <-->|"Produtor: só os seus<br/>Admin: todos"| DB
    AUTH -->|"não"| DENY
  end

  U -->|"preenche o laudo"| NAV
  NAV <-->|"dados e resultado"| API
  API <-->|"cálculo livre,<br/>sem login"| MOT
  API ==>|"salvar e consultar"| SEG

  classDef pessoa fill:#dbeafe,stroke:#1d4ed8,color:#1f2937,stroke-width:2px
  classDef sistema fill:#dcfce7,stroke:#15803d,color:#1f2937,stroke-width:2px
  classDef seguranca fill:#fef3c7,stroke:#b45309,color:#1f2937,stroke-width:2px
  classDef dados fill:#e0e7ff,stroke:#4338ca,color:#1f2937,stroke-width:2px
  classDef negado fill:#fee2e2,stroke:#b91c1c,color:#1f2937,stroke-width:2px
  class U,W,PDF pessoa
  class API,MOT sistema
  class AUTH,ROLE seguranca
  class DB dados
  class DENY negado
  style NAV fill:#f9fafb,stroke:#9ca3af,stroke-width:2px,stroke-dasharray:6 4,color:#374151
  style SEG fill:#f9fafb,stroke:#b45309,stroke-width:2px,stroke-dasharray:6 4,color:#374151
  linkStyle 7 stroke:#b45309,stroke-width:4px
```

---

## 2. Fluxo do motor de calagem

```mermaid
%%{init: {"theme": "base", "flowchart": {"nodeSpacing": 22, "rankSpacing": 28, "padding": 12, "wrappingWidth": 105}, "themeVariables": {"fontSize": "20px", "edgeLabelBackground": "#ffffff", "lineColor": "#374151"}}}%%
flowchart LR
  A["Laudo de solo pH, SMP, PRNT, manejo"]
  B{{"pH ≥ 5,5 ou solo tamponado?"}}
  N["Não aplicar calcário"]
  C["Dose pelo SMP (valor em evidência)"]
  D["Complementos Polinomial · Sat. Bases"]
  W["Alerta de divergência se diferir mais de 20%"]
  G{{"Sistema de manejo?"}}
  H1["Convencional e PD implantação: incorporado, 20 cm"]
  H2["PD consolidado: superficial, ¼ da dose (máx. 5 t/ha)"]
  I["Ajuste pelo PRNT"]
  J(["Dose final (t/ha) e alertas"])

  A --> B
  B -->|"sim"| N
  B -->|"não"| C
  B -->|"não"| D
  C --> W
  D --> W
  W --> G
  G --> H1
  G --> H2
  H1 --> I
  H2 --> I
  I --> J

  classDef entrada fill:#dbeafe,stroke:#1d4ed8,color:#1f2937,stroke-width:2px
  classDef decisao fill:#fef3c7,stroke:#b45309,color:#1f2937,stroke-width:2px
  classDef calculo fill:#dcfce7,stroke:#15803d,color:#1f2937,stroke-width:2px
  classDef alerta fill:#fee2e2,stroke:#b91c1c,color:#1f2937,stroke-width:2px
  classDef saida fill:#bbf7d0,stroke:#166534,color:#1f2937,stroke-width:3px
  class A entrada
  class B,G decisao
  class C,D,H1,H2,I calculo
  class N,W alerta
  class J saida
```

---

## 3. Fluxo do motor de adubação

```mermaid
%%{init: {"theme": "base", "flowchart": {"nodeSpacing": 22, "rankSpacing": 28, "padding": 12, "wrappingWidth": 105}, "themeVariables": {"fontSize": "20px", "edgeLabelBackground": "#ffffff", "lineColor": "#374151"}}}%%
flowchart LR
  A["Laudo de solo, cultura e rendimento"]
  B["Classes dos teores<br/>argila, MO, CTC, P e K"]
  T["Tabelas do Manual<br/>por cultura e classe"]
  N["Nitrogênio<br/>classe de MO, antecedente e rendimento"]
  P["Fósforo (P₂O₅)<br/>classe de P (argila) e rendimento"]
  K["Potássio (K₂O)<br/>classe de K (CTC) e rendimento"]
  F{{"K₂O acima de 80 kg/ha?"}}
  S["80 na semeadura + resto em cobertura"]
  O(["Doses de N, P₂O₅ e K₂O + alertas"])

  A --> B
  B --> T
  T --> N
  T --> P
  T --> K
  N --> O
  P --> O
  K --> F
  F -->|"sim"| S
  F -->|"não"| O
  S --> O

  classDef entrada fill:#dbeafe,stroke:#1d4ed8,color:#1f2937,stroke-width:2px
  classDef classe fill:#e0e7ff,stroke:#4338ca,color:#1f2937,stroke-width:2px
  classDef calculo fill:#dcfce7,stroke:#15803d,color:#1f2937,stroke-width:2px
  classDef decisao fill:#fef3c7,stroke:#b45309,color:#1f2937,stroke-width:2px
  classDef saida fill:#bbf7d0,stroke:#166534,color:#1f2937,stroke-width:3px
  class A entrada
  class B,T classe
  class N,P,K,S calculo
  class F decisao
  class O saida
```

---

## Notas de fidelidade (não entram no slide)

Para responder perguntas, o que cada diagrama simplifica em relação ao código:

**Diagrama 1**
- O PDF é montado no navegador a partir do resultado que a API devolveu. A API não gera PDF.
- A calculadora de calagem grava a análise automaticamente, como convidado se não houver login. A de adubação só calcula; salvar exige login.
- O login (e-mail e senha) devolve um token válido por 7 dias. A rota de login tem limite de tentativas. A área admin exige perfil Admin.

**Diagrama 2**
- A decisão "pH ≥ 5,5 ou solo tamponado" junta duas regras. O pH ≥ 5,5 vale para todos os sistemas. O solo tamponado (V ≥ 65% e Al < 10%) vale só no PD consolidado, com pH abaixo de 5,5.
- Os complementos aparecem em condições diferentes. O Polinomial é calculado se o técnico marcar ou se SMP > 6,3. A Saturação por Bases é calculada só com SMP ≤ 6,3.
- A divergência é o desvio do complemento em relação ao SMP: mais de 20% e pelo menos 0,5 t/ha, antes do PRNT. Sem divergência, nenhum alerta é emitido e o fluxo segue igual.
- O PD implantação em campo natural fica superficial com ½ da dose. O diagrama o omite.
- O PD com restrição também fica fora do diagrama.

**Diagrama 3**
- A conversão de Mehlich-3 para Mehlich-1 acontece antes da classificação e não aparece como caixa.
- O ajuste pelo rendimento esperado é aplicado a N, P e K. A densidade de plantas também ajusta o N do milho.
- As culturas fixadoras de N (como a soja) recebem N = 0 e um alerta de inoculação.
- A opção "correção Total" usa uma tabela própria de correção, somada à manutenção.
- A classe "muito alto" de P e K não consulta a tabela e fica sem dose. Essa regra diverge dos cenários da coordenadora e está pendente de resposta.
- Os alertas de diagnose secundária (S, Mo, micronutrientes, Ca e Mg) entram na caixa final.
