# Ibiferti - Motor Agronômico

## Como rodar localmente
Execute na raiz do projeto:
```bash
docker-compose up --build
```

- Backend: http://localhost:3000
- Frontend: http://localhost:5173

---

## 🚀 Modos de Cálculo: Rápido vs. Técnico

O Ibiferti oferece dois modos de operação para equilibrar a agilidade de uso com a precisão agronômica exigida pelo **Manual de Calagem e Adubação RS/SC (2016)**.

### 1. Cálculo Rápido (Simplificado)
**Objetivo:** Obter uma recomendação imediata para estimativas de custo e planejamento inicial.

*   **Campos Solicitados:** Apenas os essenciais (`Sistema de Manejo`, `pH em Água`, `Índice SMP` e `PRNT`).
*   **Premissas Automáticas:**
    *   **Primeira Calagem:** Assume que a área nunca foi corrigida (não aplica cálculos de reaplicação).
    *   **Perfil de Solo:** Assume que não há restrições químicas na camada de 10-20 cm.
    *   **Método:** Utiliza exclusivamente a **Tabela SMP** para elevar o pH a 6,0.
*   **Limitação:** Se o solo tiver baixo tamponamento (`SMP > 6,3`), o sistema emite um alerta informando que o valor é uma estimativa, pois o manual exigiria dados de Matéria Orgânica e Alumínio para maior precisão.

### 2. Cálculo Técnico (Completo)
**Objetivo:** Recomendação final para execução em campo, com fidelidade total às regras agronômicas.

*   **Campos Dinâmicos (Just-in-Time):** Os campos aparecem apenas se forem tecnicamente necessários.
    *   **Equação Polinomial:** Se `SMP > 6,3`, o sistema exige `MO` e `Alumínio`.
    *   **Trava do PD Consolidado:** Se `pH < 5,5`, exige `Saturação por Alumínio (m%)` para verificar se a calagem é realmente necessária.
    *   **Segunda Opinião:** Em reaplicações, solicita `V%` e `CTC` para calcular a necessidade via *Saturação por Bases* como referência informativa.
    *   **Monitoramento Profundo:** Permite informar dados da camada 10-20 cm para detectar se o sistema de plantio direto precisa ser reiniciado (incorporação total).

### Resumo para Decisão
| Característica | Cálculo Rápido | Cálculo Técnico |
| :--- | :--- | :--- |
| **Público** | Produtor / Planejamento | Técnico / Agrônomo |
| **Precisão** | Estimativa Segura | Alta Precisão |
| **Conformidade** | Parcial (SMP) | Total (Manual 2016) |
| **Uso Ideal** | Orçamentos Rápidos | Recomendação de Campo |

