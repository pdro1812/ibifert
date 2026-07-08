import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { FieldError, FieldPath, UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle, ArrowRight, CheckCircle2, Leaf, ShieldCheck, Sprout, FileDown, Beaker
} from 'lucide-react';

import { AdubacaoSchema, type EntradaAdubacao } from '../schemas/adubacaoSchema';
import { calcularAdubacao } from '../services/api';
import { gerarPDFRelatorioAdubacao } from '../services/pdfGeneratorAdubacao';

const CampoNumerico = ({
  label, name, register, error, dica, min, max, step = '0.1', placeholder
}: {
  label: string; name: FieldPath<EntradaAdubacao>; register: UseFormRegister<EntradaAdubacao>;
  error?: FieldError; dica?: string; min?: number; max?: number; step?: string; placeholder?: string;
}) => (
  <div className="space-y-1">
    <label className="flex items-center gap-1 text-xs font-semibold text-stone-600">
      {label}
    </label>
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      placeholder={placeholder}
      className={`w-full rounded-xl border bg-stone-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10 ${
        error ? 'border-red-400 bg-red-50/50 focus:border-red-500 focus:ring-red-500/10' : 'border-stone-200'
      }`}
      {...register(name, { valueAsNumber: true })}
    />
    {error && <span className="text-xs font-medium text-red-500">{error.message}</span>}
    {dica && !error && <span className="text-xs text-stone-400">{dica}</span>}
  </div>
);

const SelectPadrao = ({
  label, name, register, options, error, placeholder
}: {
  label: string; name: FieldPath<EntradaAdubacao>; register: UseFormRegister<EntradaAdubacao>;
  options: { value: string; label: string }[]; error?: FieldError; placeholder?: string;
}) => (
  <div className="space-y-1">
    <label className="text-xs font-semibold text-stone-600">{label}</label>
    <select
      className={`w-full rounded-xl border bg-stone-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10 ${
        error ? 'border-red-400 bg-red-50/50 focus:border-red-500 focus:ring-red-500/10' : 'border-stone-200'
      }`}
      {...register(name)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <span className="text-xs font-medium text-red-500">{error.message}</span>}
  </div>
);

export function AdubacaoPage() {
  const [resultado, setResultado] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EntradaAdubacao>({
    resolver: zodResolver(AdubacaoSchema),
    defaultValues: {
      metodo_P: 'Mehlich-1',
      metodo_K: 'Mehlich-1',
      tipo_correcao: 'Gradual',
      sistema_cultivo: 'Plantio Direto',
      num_cultivo: '1'
    },
  });

  const aplicarCenario = (dados: Partial<EntradaAdubacao>) => {
    reset({
      metodo_P: 'Mehlich-1',
      metodo_K: 'Mehlich-1',
      tipo_correcao: 'Gradual',
      sistema_cultivo: 'Plantio Direto',
      num_cultivo: '1',
      ...dados
    });
    setResultado(null);
  };

  const cenarios = [
    {
      nome: 'Soja (Manutenção, Solo Alto)',
      dados: {
        argila: 45, MO: 3.0, CTC_pH7: 12.0, P: 25, K: 120,
        Ca: 5, Mg: 2, S: 15, Cu: 1.5, Zn: 2.0, B: 0.5, Mn: 10, pH_agua: 6.0,
        cultura: 'soja' as const, num_cultivo: '1' as const, rendimento_esperado: 4.5,
      }
    },
    {
      nome: 'Milho (Correção Total, MB)',
      dados: {
        argila: 30, MO: 1.5, CTC_pH7: 8.0, P: 2.0, K: 15.0,
        Ca: 1.0, Mg: 0.2, S: 4.0, Cu: 0.8, Zn: 1.0, B: 0.2, Mn: 5.0, pH_agua: 5.2,
        cultura: 'milho' as const, num_cultivo: '1' as const, rendimento_esperado: 8.0,
        cultura_antecedente: 'Gramínea' as const, tipo_correcao: 'Total' as const, densidade_plantas: 70000
      }
    },
    {
      nome: 'Cevada Cervejeira (Solo Baixo)',
      dados: {
        argila: 35, MO: 2.0, CTC_pH7: 10.0, P: 8.0, K: 40.0,
        Ca: 3.0, Mg: 1.0, S: 5.0, Cu: 1.2, Zn: 1.5, B: 0.4, Mn: 8.0, pH_agua: 5.8,
        cultura: 'cevada' as const, num_cultivo: '1' as const, rendimento_esperado: 4.0,
        cultura_antecedente: 'Gramínea' as const, finalidade_cevada: 'cervejeira_malte_unico' as const
      }
    }
  ];

  const watchCultura = useWatch({ control, name: 'cultura' });
  const watchTipoCorrecao = useWatch({ control, name: 'tipo_correcao' });
  const watchArgila = useWatch({ control, name: 'argila' });
  const watchCtc = useWatch({ control, name: 'CTC_pH7' });

  const culturasComS = ['soja', 'ervilha', 'ervilhaca', 'canola', 'nabo_forrageiro'];
  const exigeS = watchCultura ? culturasComS.includes(watchCultura) : false;

  const culturasComAnt = ['aveia_branca', 'aveia_preta', 'centeio', 'cevada', 'trigo', 'triticale', 'milho'];
  const exigeCultAnt = watchCultura ? culturasComAnt.includes(watchCultura) : false;

  const disableCorrecaoTotal = (watchArgila !== undefined && watchArgila < 20) || (watchCtc !== undefined && watchCtc < 7.5);

  const onSubmit = async (data: EntradaAdubacao) => {
    try {
      setLoading(true);
      setApiError(null);
      setResultado(null);
      const res = await calcularAdubacao(data);
      setResultado({
        ...res.resultado,
        dadosEntrada: data // Salva a entrada para o PDF
      });
    } catch (err: any) {
      setApiError(err?.response?.data?.error || err.message || 'Erro ao calcular adubação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-stone-800">
          <Sprout className="text-green-500" size={36} />
          Calculadora de Adubação
        </h1>
        <p className="mt-2 text-lg text-stone-500">
          Recomendação de NPK para culturas de grãos baseada no Manual de Adubação e Calagem RS/SC (2016).
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-stone-400 mr-2">
            <Beaker size={16} /> Auto-preencher:
          </div>
          {cenarios.map((c, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => aplicarCenario(c.dados)}
              className="rounded-full bg-stone-100 px-4 py-1.5 text-xs font-semibold text-stone-600 transition-all hover:bg-green-100 hover:text-green-700 active:scale-95"
            >
              {c.nome}
            </button>
          ))}
          <button
            type="button"
            onClick={() => reset({})}
            className="rounded-full bg-stone-100 px-4 py-1.5 text-xs font-semibold text-stone-600 transition-all hover:bg-stone-200 hover:text-stone-800 active:scale-95"
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            
            {/* GRUPO A: SOLO */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
                  <Leaf size={18} />
                </div>
                <h2 className="text-lg font-bold text-stone-700">Grupo A: Análise de Solo</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <CampoNumerico label="Argila (%)" name="argila" register={register} error={errors.argila} placeholder="Ex: 35" min={0} max={99} />
                <CampoNumerico label="Matéria Orgânica (%)" name="MO" register={register} error={errors.MO} placeholder="Ex: 2.5" min={0.1} />
                <CampoNumerico label="CTC a pH 7" name="CTC_pH7" register={register} error={errors.CTC_pH7} placeholder="Ex: 12" min={0.1} />
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <CampoNumerico label="Fósforo (P)" name="P" register={register} error={errors.P} placeholder="mg/dm³" />
                <SelectPadrao label="Método P" name="metodo_P" register={register} error={errors.metodo_P} options={[{ value: 'Mehlich-1', label: 'Mehlich-1' }, { value: 'Mehlich-3', label: 'Mehlich-3' }]} />
                <CampoNumerico label="Potássio (K)" name="K" register={register} error={errors.K} placeholder="mg/dm³" />
                <SelectPadrao label="Método K" name="metodo_K" register={register} error={errors.metodo_K} options={[{ value: 'Mehlich-1', label: 'Mehlich-1' }, { value: 'Mehlich-3', label: 'Mehlich-3' }]} />
              </div>

              <div className="grid gap-4 sm:grid-cols-5">
                <CampoNumerico label="Cálcio (Ca)" name="Ca" register={register} error={errors.Ca} placeholder="cmolc/dm³" />
                <CampoNumerico label="Magnésio (Mg)" name="Mg" register={register} error={errors.Mg} placeholder="cmolc/dm³" />
                <CampoNumerico label={`Enxofre (S) ${exigeS ? '*' : ''}`} name="S" register={register} error={errors.S} placeholder="mg/dm³" />
                <CampoNumerico label="pH (Água)" name="pH_agua" register={register} error={errors.pH_agua} placeholder="Ex: 5.5" />
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <CampoNumerico label="Cobre (Cu)" name="Cu" register={register} error={errors.Cu} placeholder="mg/dm³" />
                <CampoNumerico label="Zinco (Zn)" name="Zn" register={register} error={errors.Zn} placeholder="mg/dm³" />
                <CampoNumerico label="Boro (B)" name="B" register={register} error={errors.B} placeholder="mg/dm³" />
                <CampoNumerico label="Manganês (Mn)" name="Mn" register={register} error={errors.Mn} placeholder="mg/dm³" />
              </div>
            </div>

            {/* GRUPO B: MANEJO */}
            <div className="space-y-4 pt-6">
              <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600">
                  <Sprout size={18} />
                </div>
                <h2 className="text-lg font-bold text-stone-700">Grupo B: Cultura e Manejo</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <SelectPadrao label="Cultura" name="cultura" register={register} error={errors.cultura} placeholder="Selecione..." options={[
                  { value: 'soja', label: 'Soja' },
                  { value: 'milho', label: 'Milho' },
                  { value: 'aveia_branca', label: 'Aveia Branca' },
                  { value: 'aveia_preta', label: 'Aveia Preta' },
                  { value: 'cevada', label: 'Cevada' },
                  { value: 'trigo', label: 'Trigo' },
                  { value: 'feijao', label: 'Feijão' },
                ]} />
                <CampoNumerico label="Rendimento (t/ha)" name="rendimento_esperado" register={register} error={errors.rendimento_esperado} placeholder="Ex: 4.5" />
                <SelectPadrao label="Número do Cultivo" name="num_cultivo" register={register} error={errors.num_cultivo} options={[
                  { value: '1', label: '1º Cultivo' },
                  { value: '2', label: '2º Cultivo ou +"' }
                ]} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <SelectPadrao label="Sistema de Cultivo" name="sistema_cultivo" register={register} error={errors.sistema_cultivo} options={[
                  { value: 'Plantio Direto', label: 'Plantio Direto' },
                  { value: 'Convencional', label: 'Convencional' }
                ]} />
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-600">Tipo de Correção (P e K)</label>
                  <select
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-2.5 text-sm"
                    {...register('tipo_correcao')}
                  >
                    <option value="Gradual">Gradual (Manutenção + Fração)</option>
                    <option value="Total" disabled={disableCorrecaoTotal}>
                      Total {disableCorrecaoTotal ? '(Argila <20 ou CTC <7.5)' : ''}
                    </option>
                  </select>
                </div>
              </div>

              {exigeCultAnt && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectPadrao label="Cultura Antecedente *" name="cultura_antecedente" register={register} error={errors.cultura_antecedente} placeholder="Selecione..." options={[
                    { value: 'Leguminosa', label: 'Leguminosa (Ex: Soja)' },
                    { value: 'Gramínea', label: 'Gramínea (Ex: Milho, Trigo)' },
                    { value: 'Consorciação ou Pousio', label: 'Consorciação ou Pousio' }
                  ]} />
                </div>
              )}

              {watchCultura === 'cevada' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectPadrao label="Finalidade Cevada *" name="finalidade_cevada" register={register} error={errors.finalidade_cevada} placeholder="Selecione..." options={[
                    { value: 'cervejeira_malte_unico', label: 'Cervejeira (Malte Único)' },
                    { value: 'malte_especial', label: 'Cervejeira (Malte Especial)' },
                    { value: 'outra', label: 'Outra finalidade' }
                  ]} />
                </div>
              )}
            </div>

            {apiError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 flex items-center gap-2">
                <AlertCircle size={16} />
                {apiError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-4 font-bold text-white shadow-lg transition-all hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Calculando...' : 'Gerar Recomendação'}
              <ArrowRight size={20} />
            </button>
          </form>
        </div>

        <div className="lg:col-span-5">
          {resultado ? (
            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sticky top-24">
              <div className="flex items-center gap-2 text-green-600 mb-6">
                <CheckCircle2 size={24} />
                <h3 className="text-xl font-bold">Recomendação</h3>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl bg-stone-50 p-4 border border-stone-100">
                  <div className="text-sm font-bold text-stone-500 mb-1">Nitrogênio (N)</div>
                  <div className="text-2xl font-black text-stone-800">{resultado.recomendacao.n.dose_total_kg_ha} <span className="text-sm font-semibold text-stone-500">kg/ha</span></div>
                  <div className="text-xs text-stone-500 mt-1">{resultado.recomendacao.n.tipo}</div>
                </div>

                <div className="rounded-xl bg-stone-50 p-4 border border-stone-100">
                  <div className="text-sm font-bold text-stone-500 mb-1">Fósforo (P₂O₅)</div>
                  <div className="text-2xl font-black text-stone-800">{resultado.recomendacao.p2o5.dose_total_kg_ha} <span className="text-sm font-semibold text-stone-500">kg/ha</span></div>
                  <div className="text-xs text-stone-500 mt-1">{resultado.recomendacao.p2o5.tipo_adubacao}</div>
                  <div className="text-xs text-stone-400 mt-1">Classe no Solo: {resultado.classificacao_solo.p_classe}</div>
                </div>

                <div className="rounded-xl bg-stone-50 p-4 border border-stone-100">
                  <div className="text-sm font-bold text-stone-500 mb-1">Potássio (K₂O)</div>
                  <div className="text-2xl font-black text-stone-800">{resultado.recomendacao.k2o.dose_total_kg_ha} <span className="text-sm font-semibold text-stone-500">kg/ha</span></div>
                  <div className="text-xs text-stone-500 mt-1">{resultado.recomendacao.k2o.tipo_adubacao}</div>
                  <div className="text-xs text-stone-500 mt-1">
                    Linha: {resultado.recomendacao.k2o.k2o_semeadura_kg_ha} kg/ha | Lanço: {resultado.recomendacao.k2o.k2o_complementar_kg_ha} kg/ha
                  </div>
                </div>
              </div>

              {resultado.alertas && resultado.alertas.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="font-bold text-stone-700">Avisos Agronômicos</h4>
                  {resultado.alertas.map((alerta: any, idx: number) => (
                    <div key={idx} className={`p-3 rounded-lg text-sm border flex items-start gap-2 ${alerta.nivel === 'AVISO' ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                      <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                      <span>{alerta.mensagem}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  gerarPDFRelatorioAdubacao({
                    dadosEntrada: resultado.dadosEntrada,
                    resultado: resultado
                  });
                }}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-6 py-3 font-bold text-stone-600 shadow-sm transition-all hover:bg-stone-50 hover:text-green-600"
              >
                <FileDown size={20} />
                Baixar Relatório (PDF)
              </button>
            </div>
          ) : (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-stone-500">
              <Sprout size={48} className="mb-4 opacity-20" />
              <p className="font-medium">Preencha os dados e clique em "Gerar Recomendação" para ver os resultados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
