import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { FieldError, FieldPath, UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle, ArrowRight, CheckCircle2, Leaf, ShieldCheck, Sprout, FileDown, Beaker, Save
} from 'lucide-react';

import { AdubacaoSchema, type EntradaAdubacao } from '../schemas/adubacaoSchema';
import { calcularAdubacao, salvarAdubacao } from '../services/api';
import { gerarPDFRelatorioAdubacao } from '../services/pdfGeneratorAdubacao';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
  const [salvo, setSalvo] = useState(false);

  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
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

  const handleTentarSalvar = async () => {
    if (!resultado) return;
    
    if (!isLoggedIn) {
      sessionStorage.setItem('adubacaoPendente', JSON.stringify({ dados: getValues(), resultado }));
      navigate('/login');
      return;
    }

    try {
      await salvarAdubacao({
        dadosForm: getValues(),
        resultado: resultado.recomendacao ? resultado : resultado.resultado // ajusta de acordo com o retorno
      });
      setSalvo(true);
      setTimeout(() => setSalvo(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar adubação:', error);
      alert('Erro ao salvar adubação. Tente novamente.');
    }
  };

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
    <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl lg:flex-row">
      {/* ═══════════════════════════════════════════════════════════════════
          COLUNA ESQUERDA — Formulário
      ════════════════════════════════════════════════════════════════════ */}
      <div className="w-full bg-white p-8 lg:w-3/5 lg:p-12">
        {/* Cabeçalho */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-green-600 shadow-lg">
            <Sprout className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-800">Ibiferti Adubação</h1>
            <p className="text-sm font-medium text-stone-500">Motor de Recomendação NPK</p>
          </div>
        </div>

        {/* Cenários Rápidos */}
        <div className="mb-8 space-y-3 rounded-2xl border border-stone-100 bg-stone-50 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
            <Beaker size={14} /> Auto-preencher Cenários
          </div>
          <div className="flex flex-wrap gap-2">
            {cenarios.map((c, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => aplicarCenario(c.dados)}
                className="rounded-lg bg-white border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 transition-all hover:border-green-500 hover:text-green-700 active:scale-95"
              >
                {c.nome}
              </button>
            ))}
            <button
              type="button"
              onClick={() => reset({})}
              className="rounded-lg bg-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 transition-all hover:bg-stone-300 hover:text-stone-800 active:scale-95 ml-auto"
            >
              Limpar Tudo
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          {/* ── Identificação ──────────────────────────────────────── */}
          <div className="space-y-5 rounded-2xl border border-stone-100 bg-stone-50 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">Identificação</h3>
            <div className="space-y-1">
              <label className="flex justify-between text-xs font-semibold text-stone-600">
                Identificação da Amostra/Gleba <span className="font-normal text-stone-400">Opcional</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Talhão 1 - Lado Sul"
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm outline-none focus:border-green-500"
                {...register('identificacao')}
              />
            </div>
          </div>

          {/* ── Grupo A: Análise de Solo ────────────────────────────── */}
          <div className="space-y-5 rounded-2xl border border-stone-100 bg-stone-50 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2">
              <Leaf size={16} /> Grupo A: Análise de Solo
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <CampoNumerico label="Argila (%)" name="argila" register={register} error={errors.argila} placeholder="Ex: 35" min={0} max={99} />
              <CampoNumerico label="Matéria Orgânica (%)" name="MO" register={register} error={errors.MO} placeholder="Ex: 2.5" min={0.1} />
              <CampoNumerico label="CTC a pH 7" name="CTC_pH7" register={register} error={errors.CTC_pH7} placeholder="Ex: 12" min={0.1} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <CampoNumerico label="Fósforo (P)" name="P" register={register} error={errors.P} placeholder="mg/dm³" />
              <SelectPadrao label="Método P" name="metodo_P" register={register} error={errors.metodo_P} options={[{ value: 'Mehlich-1', label: 'Mehlich-1' }, { value: 'Mehlich-3', label: 'Mehlich-3' }]} />
              <CampoNumerico label="Potássio (K)" name="K" register={register} error={errors.K} placeholder="mg/dm³" />
              <SelectPadrao label="Método K" name="metodo_K" register={register} error={errors.metodo_K} options={[{ value: 'Mehlich-1', label: 'Mehlich-1' }, { value: 'Mehlich-3', label: 'Mehlich-3' }]} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <CampoNumerico label="Cálcio (Ca)" name="Ca" register={register} error={errors.Ca} placeholder="cmolc/dm³" />
              <CampoNumerico label="Magnésio (Mg)" name="Mg" register={register} error={errors.Mg} placeholder="cmolc/dm³" />
              <CampoNumerico label={`Enxofre (S) ${exigeS ? '*' : ''}`} name="S" register={register} error={errors.S} placeholder="mg/dm³" />
              <CampoNumerico label="pH (Água)" name="pH_agua" register={register} error={errors.pH_agua} placeholder="Ex: 5.5" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <CampoNumerico label="Cobre (Cu)" name="Cu" register={register} error={errors.Cu} placeholder="mg/dm³" />
              <CampoNumerico label="Zinco (Zn)" name="Zn" register={register} error={errors.Zn} placeholder="mg/dm³" />
              <CampoNumerico label="Boro (B)" name="B" register={register} error={errors.B} placeholder="mg/dm³" />
              <CampoNumerico label="Manganês (Mn)" name="Mn" register={register} error={errors.Mn} placeholder="mg/dm³" />
            </div>
          </div>

          {/* ── Grupo B: Cultura e Manejo ─────────────────────────── */}
          <div className="space-y-5 rounded-2xl border border-stone-100 bg-stone-50 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2">
              <Sprout size={16} /> Grupo B: Cultura e Manejo
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SelectPadrao label="Sistema de Cultivo" name="sistema_cultivo" register={register} error={errors.sistema_cultivo} options={[
                { value: 'Plantio Direto', label: 'Plantio Direto' },
                { value: 'Convencional', label: 'Convencional' }
              ]} />
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-600">Tipo de Correção (P e K)</label>
                <select
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm outline-none focus:border-green-500"
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SelectPadrao label="Cultura Antecedente *" name="cultura_antecedente" register={register} error={errors.cultura_antecedente} placeholder="Selecione..." options={[
                  { value: 'Leguminosa', label: 'Leguminosa (Ex: Soja)' },
                  { value: 'Gramínea', label: 'Gramínea (Ex: Milho, Trigo)' },
                  ...(watchCultura === 'milho' ? [{ value: 'Consorciação ou Pousio', label: 'Consorciação ou Pousio' }] : [])
                ]} />
              </div>
            )}

            {watchCultura === 'cevada' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SelectPadrao label="Finalidade Cevada *" name="finalidade_cevada" register={register} error={errors.finalidade_cevada} placeholder="Selecione..." options={[
                  { value: 'cervejeira_malte_unico', label: 'Cervejeira (Malte Único)' },
                  { value: 'malte_especial', label: 'Cervejeira (Malte Especial)' },
                  { value: 'outra', label: 'Outra finalidade' }
                ]} />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-4 font-semibold text-white shadow-lg transition-all hover:bg-stone-800 disabled:bg-stone-300"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Processando...
              </>
            ) : (
              <>Calcular Recomendação <ArrowRight size={16} /></>
            )}
          </button>
        </form>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          COLUNA DIREITA — Resultado
      ════════════════════════════════════════════════════════════════════ */}
      <div className="flex w-full flex-col border-t border-white/60 bg-gradient-to-br from-[#E8F3E8] to-[#F4F6F0] p-8 lg:w-2/5 lg:border-l lg:border-t-0 lg:p-12">
        <div className="relative z-10 flex h-full w-full flex-col justify-center">

          {/* Estado: erro de API */}
          {apiError ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-red-500 shadow-sm">
                  <AlertCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-stone-800">Não foi possível calcular</h2>
              </div>
              <div className="rounded-[1.5rem] border border-red-200 bg-white p-6 shadow-xl">
                <p className="text-sm font-bold uppercase tracking-wider text-red-600">Feedback da validação</p>
                <p className="mt-3 text-sm leading-relaxed text-stone-700">{apiError}</p>
              </div>
            </div>
          ) : resultado ? (
            /* Estado: resultado calculado */
            <div className="space-y-6">
              <div className="mb-2 flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-green-500 shadow-sm">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-2xl font-bold text-stone-800">Recomendação NPK</h2>
              </div>

              <div className="space-y-4">
                {/* Nitrogênio */}
                <div className="rounded-[1.5rem] bg-white p-6 text-center shadow-xl">
                  <p className="mb-1 text-sm font-bold uppercase tracking-wider text-stone-400">Nitrogênio (N)</p>
                  <div className="mb-1 flex items-baseline justify-center gap-2">
                    <span className="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-5xl font-extrabold text-transparent">
                      {resultado.recomendacao.n.dose_total_kg_ha}
                    </span>
                    <span className="text-lg font-bold text-emerald-700">kg/ha</span>
                  </div>
                  <p className="text-xs text-stone-400 font-semibold">{resultado.recomendacao.n.tipo}</p>
                </div>

                {/* Fósforo */}
                <div className="rounded-[1.5rem] bg-white p-6 text-center shadow-xl">
                  <p className="mb-1 text-sm font-bold uppercase tracking-wider text-stone-400">Fósforo (P₂O₅)</p>
                  <div className="mb-1 flex items-baseline justify-center gap-2">
                    <span className="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-5xl font-extrabold text-transparent">
                      {resultado.recomendacao.p2o5.dose_total_kg_ha}
                    </span>
                    <span className="text-lg font-bold text-emerald-700">kg/ha</span>
                  </div>
                  <p className="text-xs text-stone-400 font-semibold">{resultado.recomendacao.p2o5.tipo_adubacao}</p>
                  <p className="text-[10px] text-stone-400 mt-1 uppercase">Classe no Solo: {resultado.classificacao_solo.p_classe}</p>
                </div>

                {/* Potássio */}
                <div className="rounded-[1.5rem] bg-white p-6 text-center shadow-xl">
                  <p className="mb-1 text-sm font-bold uppercase tracking-wider text-stone-400">Potássio (K₂O)</p>
                  <div className="mb-1 flex items-baseline justify-center gap-2">
                    <span className="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-5xl font-extrabold text-transparent">
                      {resultado.recomendacao.k2o.dose_total_kg_ha}
                    </span>
                    <span className="text-lg font-bold text-emerald-700">kg/ha</span>
                  </div>
                  <p className="text-xs text-stone-400 font-semibold">{resultado.recomendacao.k2o.tipo_adubacao}</p>
                  <div className="flex justify-center gap-4 mt-2 border-t border-stone-100 pt-2">
                    <span className="text-[10px] text-stone-500 uppercase font-bold">
                      Linha: <strong className="text-emerald-700">{resultado.recomendacao.k2o.k2o_semeadura_kg_ha}</strong> kg/ha
                    </span>
                    <span className="text-[10px] text-stone-500 uppercase font-bold">
                      Lanço: <strong className="text-emerald-700">{resultado.recomendacao.k2o.k2o_complementar_kg_ha}</strong> kg/ha
                    </span>
                  </div>
                </div>
              </div>

              {resultado.alertas && resultado.alertas.length > 0 && (
                <div className="space-y-3 mt-4">
                  {resultado.alertas.map((alerta: any, idx: number) => (
                    <div key={idx} className={`p-4 rounded-xl text-sm border flex flex-col gap-1 ${alerta.nivel === 'AVISO' ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                      <div className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest opacity-80">
                        <ShieldCheck size={14} /> {alerta.nivel}
                      </div>
                      <span className="leading-relaxed font-medium">{alerta.mensagem}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    gerarPDFRelatorioAdubacao({
                      dadosEntrada: resultado.dadosEntrada,
                      resultado: resultado
                    });
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-green-600 bg-transparent px-4 py-4 font-bold text-green-600 shadow-sm transition-all hover:bg-green-50 active:scale-95"
                >
                  <FileDown size={20} />
                  Baixar PDF
                </button>
                <button
                  type="button"
                  onClick={handleTentarSalvar}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 font-bold shadow-xl transition-all active:scale-95 ${
                    salvo
                      ? 'bg-green-500 text-white'
                      : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-green-900/20'
                  }`}
                >
                  {salvo ? <><CheckCircle2 size={20} /> Salvo!</> : <><Save size={20} /> Salvar Análise</>}
                </button>
              </div>
            </div>
          ) : (
            /* Estado: aguardando dados */
            <div className="flex flex-col items-center justify-center text-center opacity-60 transition-opacity hover:opacity-100 min-h-[400px]">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-stone-300 shadow-sm">
                <Sprout size={32} />
              </div>
              <h2 className="text-xl font-bold text-stone-500">Aguardando dados</h2>
              <p className="mt-2 text-sm text-stone-400">Preencha o formulário e calcule a recomendação de NPK.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
