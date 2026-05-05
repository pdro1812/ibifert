import assert from "node:assert/strict";
import test from "node:test";

import {
  ajustarDosePorPRNT,
  calcularAlSat,
  determinarCamposNecessarios,
} from "../services/calculadoraCalagem";
import {
  avaliarMonitoramento10_20,
  executarMotorCalagem,
} from "../services/motorCalagem";
import { tabelaSmpLookup } from "../services/tabelaSmp";
import {
  AcaoRequerida,
  MetodoCalcRoteado,
  ModoAplicacao,
  SistemaManejo,
} from "../schemas/calagemSchema";

function assertClose(actual: number, expected: number, tolerance = 1e-9): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Esperado ${expected}, obtido ${actual}`
  );
}

test("CT-01: Lookup SMP — valor exato de tabela", () => {
  assertClose(tabelaSmpLookup(5.5, 6.0), 6.1);
});

test("CT-02: Lookup SMP — limite inferior da tabela", () => {
  assertClose(tabelaSmpLookup(4.4, 6.0), 21.0);
  assertClose(tabelaSmpLookup(4.0, 6.0), 21.0);
});

test("CT-03: Lookup SMP — sem necessidade", () => {
  assertClose(tabelaSmpLookup(7.1, 6.0), 0.0);
});

test("CT-04: Fator 1/4 — PD Consolidado", () => {
  const resultado = executarMotorCalagem({
    sistema_manejo: SistemaManejo.PD_CONSOLIDADO,
    primeira_calagem: true,
    pH_agua: 5.0,
    SMP: 5.5,
    PRNT: 100,
    Al_sat: 15.0,
  });

  assertClose(resultado.NC_final, 1.525);
});

test("CT-05: Trava máxima superficial — PD Consolidado", () => {
  const resultado = executarMotorCalagem({
    sistema_manejo: SistemaManejo.PD_CONSOLIDADO,
    primeira_calagem: true,
    pH_agua: 5.0,
    SMP: 4.4,
    PRNT: 100,
    Al_sat: 15.0,
  });

  assertClose(resultado.NC_final, 5.0);
  assert.equal(resultado.alertas.length > 0, true);
});

test("CT-06: Trava de não-aplicação — V% e Al_sat no PD Consolidado", () => {
  const resultado = executarMotorCalagem({
    sistema_manejo: SistemaManejo.PD_CONSOLIDADO,
    primeira_calagem: false,
    pH_agua: 5.2,
    SMP: 5.5,
    PRNT: 100,
    V_atual: 66.0,
    CTC_pH7: 10.0,
    Al_sat: 8.0,
  });

  assert.equal(resultado.aplicar_calcario, false);
});

test("CT-07: Encerramento precoce — pH >= 5.5 no PD Consolidado", () => {
  const resultado = executarMotorCalagem({
    sistema_manejo: SistemaManejo.PD_CONSOLIDADO,
    primeira_calagem: true,
    pH_agua: 5.6,
    SMP: 5.5,
    PRNT: 100,
  });

  const campos = determinarCamposNecessarios({
    sistema_manejo: SistemaManejo.PD_CONSOLIDADO,
    primeira_calagem: true,
    pH_agua: 5.6,
    SMP: 5.5,
    PRNT: 100,
  });

  assert.equal(resultado.aplicar_calcario, false);
  assert.equal(campos.includes("Al_sat"), false);
});

test("CT-08: Saturação por bases — NC_vb (reaplicação)", () => {
  const resultado = executarMotorCalagem({
    sistema_manejo: SistemaManejo.CONVENCIONAL,
    primeira_calagem: false,
    pH_agua: 5.0,
    SMP: 5.5,
    PRNT: 100,
    V_atual: 55.0,
    CTC_pH7: 10.0,
  });

  assertClose(resultado.NC_vb!, 2.0);
});

test("CT-09: Saturação por bases — ajuste por CTC baixa", () => {
  const resultado = executarMotorCalagem({
    sistema_manejo: SistemaManejo.CONVENCIONAL,
    primeira_calagem: false,
    pH_agua: 5.0,
    SMP: 5.5,
    PRNT: 100,
    V_atual: 55.0,
    CTC_pH7: 6.0,
  });

  assertClose(resultado.NC_vb!, 0.9);
});

test("CT-10: Roteamento automático → Polinomial", () => {
  const resultado = executarMotorCalagem({
    sistema_manejo: SistemaManejo.CONVENCIONAL,
    primeira_calagem: true,
    pH_agua: 5.0,
    SMP: 6.5,
    PRNT: 100,
    MO: 2.0,
    Al_trocavel: 0.5,
  });

  const campos = determinarCamposNecessarios({
    sistema_manejo: SistemaManejo.CONVENCIONAL,
    primeira_calagem: true,
    pH_agua: 5.0,
    SMP: 6.5,
    PRNT: 100,
  });

  assert.equal(resultado.metodo_calc_roteado, MetodoCalcRoteado.POLINOMIAL);
  assertClose(resultado.NC_base, 2.3115);
  assert.equal(campos.includes("MO"), true);
  assert.equal(campos.includes("Al_trocavel"), true);
  assert.equal(campos.includes("V_atual"), false);
});

test("CT-11: Polinomial — trava de zero", () => {
  const resultado = executarMotorCalagem({
    sistema_manejo: SistemaManejo.CONVENCIONAL,
    primeira_calagem: true,
    pH_agua: 5.0,
    SMP: 6.9,
    PRNT: 100,
    MO: 0.3,
    Al_trocavel: 0.05,
  });

  assertClose(resultado.NC_base, 0.0);
});

test("CT-12: Ajuste PRNT", () => {
  assertClose(ajustarDosePorPRNT(3.0, 75), 4.0);
});

test("CT-13: PD com Restrição — SMP médio das camadas", () => {
  const resultado = executarMotorCalagem({
    sistema_manejo: SistemaManejo.PD_COM_RESTRICAO,
    primeira_calagem: true,
    pH_agua: 5.0,
    SMP: 5.2,
    SMP_0_10: 5.2,
    SMP_10_20: 4.8,
    Al_sat_10_20: 35.0,
    PRNT: 100,
  });

  assertClose(resultado.NC_final, 9.9);
  assert.equal(resultado.modo_aplicacao, ModoAplicacao.INCORPORADO);
  assert.equal(
    resultado.acao_requerida,
    AcaoRequerida.REINICIAR_PLANTIO_DIRETO
  );
});

test("CT-14: Roteamento — SMP exatamente em 6.3 → SMP", () => {
  const resultado = executarMotorCalagem({
    sistema_manejo: SistemaManejo.CONVENCIONAL,
    primeira_calagem: true,
    pH_agua: 5.0,
    SMP: 6.3,
    PRNT: 100,
  });

  assert.equal(resultado.metodo_calc_roteado, MetodoCalcRoteado.SMP);
});

test("CT-15: PD Implantação com opção superficial em campo natural", () => {
  const resultado = executarMotorCalagem({
    sistema_manejo: SistemaManejo.PD_IMPLANTACAO,
    primeira_calagem: true,
    pH_agua: 5.0,
    SMP: 5.8,
    PRNT: 100,
    opcao_superficial_campo_natural: true,
  });

  assertClose(resultado.NC_final, 2.1);
  assert.equal(resultado.modo_aplicacao, ModoAplicacao.SUPERFICIAL);
});

test("CT-16: Campos condicionais — polinomial não pede V_atual", () => {
  const campos = determinarCamposNecessarios({
    sistema_manejo: SistemaManejo.CONVENCIONAL,
    primeira_calagem: false,
    pH_agua: 5.0,
    SMP: 6.8,
    PRNT: 100,
  });

  assert.equal(campos.includes("MO"), true);
  assert.equal(campos.includes("Al_trocavel"), true);
  assert.equal(campos.includes("V_atual"), false);
  assert.equal(campos.includes("CTC_pH7"), false);
});

test("CT-17: Al_sat calculado internamente (Opção 2 do campo B2)", () => {
  assertClose(calcularAlSat(2.0, 10.0), 20.0);
});

test("CT-18: Reaplicação com dois métodos — apresentação correta", () => {
  const resultado = executarMotorCalagem({
    sistema_manejo: SistemaManejo.CONVENCIONAL,
    primeira_calagem: false,
    pH_agua: 5.0,
    SMP: 5.5,
    PRNT: 100,
    V_atual: 55.0,
    CTC_pH7: 10.0,
  });

  assertClose(resultado.NC_smp!, 6.1);
  assertClose(resultado.NC_vb!, 2.0);
  assert.equal(resultado.calcular_tambem_sat_bases, true);
  assert.match(resultado.nota_tecnica ?? "", /valor SMP/i);
});

test("Parte 10: validações de pH e PRNT", () => {
  assert.throws(() =>
    executarMotorCalagem({
      sistema_manejo: SistemaManejo.CONVENCIONAL,
      primeira_calagem: true,
      pH_agua: 3.0,
      SMP: 5.5,
      PRNT: 80,
    })
  );

  assert.throws(() =>
    executarMotorCalagem({
      sistema_manejo: SistemaManejo.CONVENCIONAL,
      primeira_calagem: true,
      pH_agua: 5.0,
      SMP: 5.5,
      PRNT: 0,
    })
  );

  assert.throws(() =>
    executarMotorCalagem({
      sistema_manejo: SistemaManejo.CONVENCIONAL,
      primeira_calagem: true,
      pH_agua: 5.0,
      SMP: 5.5,
      PRNT: 101,
    })
  );
});

test("RN-05: Monitoramento 10–20 cm", () => {
  const comRestricao = avaliarMonitoramento10_20({
    pH_agua_10_20: 4.8,
    Al_sat_10_20: 35.0,
    disponibilidade_P_10_20_abaixo_critico: false,
    compactacao_restringindo_raiz: false,
    produtividade_abaixo_media: true,
  });

  assert.equal(comRestricao.restricao_10_20, true);
  assert.equal(
    comRestricao.sistema_manejo_atualizado,
    SistemaManejo.PD_COM_RESTRICAO
  );
  assert.deepEqual(comRestricao.campos_adicionais_necessarios, ["SMP_10_20"]);

  const semRestricao = avaliarMonitoramento10_20({
    pH_agua_10_20: 4.8,
    Al_sat_10_20: 25.0,
    disponibilidade_P_10_20_abaixo_critico: true,
    compactacao_restringindo_raiz: true,
    produtividade_abaixo_media: true,
  });

  assert.equal(semRestricao.restricao_10_20, false);
  assert.equal(
    semRestricao.sistema_manejo_atualizado,
    SistemaManejo.PD_CONSOLIDADO
  );
});
