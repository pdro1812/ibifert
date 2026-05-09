import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import type {
  FieldError,
  FieldPath,
  SubmitHandler,
  UseFormRegister,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  FileDown,
  Info,
  Leaf,
  Lightbulb,
  Save,
  ShieldCheck,
  Sprout,
} from 'lucide-react';

import {
  CalagemSchema,
  detectarRestricaoMonitoramento,
  resolverSistemaEfetivo,
  rotearMetodoCalagem,
  type CalagemResultado,
  type EntradaCalagem,
} from '../schemas/calagemSchema';
import { gerarPDFRelatorio } from '../services/pdfGenerator';
import { calcularCalagem } from '../services/api';
import { ibgeService } from '../services/ibge';
import type { Estado, Municipio } from '../services/ibge';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';

// ─── Constants ───────────────────────────────────────────────────────────────

const MSG_MONITORAMENTO_RESTRICAO =
  'Recomenda-se avaliação por engenheiro agrônomo antes de reiniciar o sistema plantio direto';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizarNumero(valor: unknown): number | undefined {
  if (valor === '' || valor === null || valor === undefined) return undefined;
  if (typeof valor === 'number') return Number.isNaN(valor) ? undefined : valor;
  if (typeof valor === 'string') {
    const n = Number(valor.replace(',', '.').trim());
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

function extrairMensagemErro(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response: unknown }).response === 'object' &&
    (error as { response: unknown }).response !== null
  ) {
    const resp = (error as { response: { data?: { mensagem?: string } } }).response;
    if (typeof resp.data?.mensagem === 'string') return resp.data.mensagem;
  }
  return 'Falha na comunicação com o servidor.';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type FormValores = EntradaCalagem;

const CampoNumerico = ({
  label,
  name,
  register,
  error,
  dica,
  min,
  max,
  step = '0.1',
  placeholder,
}: {
  label: string;
  name: FieldPath<FormValores>;
  register: UseFormRegister<FormValores>;
  error?: FieldError;
  dica?: string;
  min?: number;
  max?: number;
  step?: string;
  placeholder?: string;
}) => (
  <div className="space-y-1">
    <label className="flex items-center gap-1 text-xs font-semibold text-stone-600">
      {label}
      {dica ? (
        <span className="group relative cursor-help">
          <Info size={12} className="text-stone-400" />
          <span className="absolute bottom-full left-0 z-50 mb-1 hidden w-56 rounded-lg bg-stone-800 p-2 text-xs text-stone-200 group-hover:block">
            {dica}
          </span>
        </span>
      ) : null}
    </label>
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      placeholder={placeholder}
      {...register(name, { setValueAs: normalizarNumero })}
      className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all ${
        error
          ? 'border-red-400 bg-red-50 focus:border-red-500'
          : 'border-stone-200 bg-stone-50 focus:border-green-500 focus:bg-white'
      }`}
    />
    {error ? (
      <span className="flex items-center gap-1 text-xs text-red-500">
        <AlertCircle size={11} /> {error.message}
      </span>
    ) : null}
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CalculadoraPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  // ── Local state ──────────────────────────────────────────────────────────
  const [resultado, setResultado] = useState<CalagemResultado | null>(null);
  const [loading, setLoading] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [mensagemApi, setMensagemApi] = useState<string | null>(null);
  const [modalTermosOpen, setModalTermosOpen] = useState(false);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [ufSelecionada, setUfSelecionada] = useState('RS');
  const [cidadeSelecionada, setCidadeSelecionada] = useState('Ibirubá');
  const [termosAceitos, setTermosAceitos] = useState(false);
  const [erroCidade, setErroCidade] = useState(false);
  const [erroTermos, setErroTermos] = useState(false);
  const [modoAlSat, setModoAlSat] = useState<'direto' | 'calculado'>('direto');
  const [monitoramentoAtivo, setMonitoramentoAtivo] = useState(false);

  // ── IBGE ─────────────────────────────────────────────────────────────────
  useEffect(() => { ibgeService.getEstados().then(setEstados); }, []);
  useEffect(() => {
    if (ufSelecionada) ibgeService.getMunicipios(ufSelecionada).then(setMunicipios);
  }, [ufSelecionada]);

  // ── Form ─────────────────────────────────────────────────────────────────
  const {
    control,
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValores>({
    resolver: zodResolver(CalagemSchema),
    shouldUnregister: true,
    defaultValues: {
      sistema_manejo: 'CONVENCIONAL',
      primeira_calagem: true,
      opcao_superficial_campo_natural: false,
    },
  });

  const sistemaSelecionado = useWatch({ control, name: 'sistema_manejo' });
  const primeiraCalagem    = useWatch({ control, name: 'primeira_calagem' });
  const smpValor           = useWatch({ control, name: 'SMP' });
  const pHValor            = useWatch({ control, name: 'pH_agua' });
  const monitoramento      = useWatch({ control, name: 'monitoramento' });

  const temSmpInformado  = typeof smpValor === 'number';
  const temPhInformado   = typeof pHValor  === 'number';
  const metodoRoteado    = temSmpInformado ? rotearMetodoCalagem(smpValor) : null;
  const isPolinomial     = metodoRoteado === 'POLINOMIAL';
  const isReaplicacaoSMP = primeiraCalagem === false && metodoRoteado === 'SMP';
  const isPDConsolidado  = sistemaSelecionado === 'PD_CONSOLIDADO';
  const isPDImplantacao  = sistemaSelecionado === 'PD_IMPLANTACAO';
  const precisaAlSat     = isPDConsolidado && temPhInformado && pHValor < 5.5;
  const modoAlSatAtual   = precisaAlSat ? modoAlSat : 'direto';
  const restricao10_20   =
    isPDConsolidado &&
    monitoramentoAtivo &&
    detectarRestricaoMonitoramento(monitoramento);
  const sistemaEfetivo = resolverSistemaEfetivo({
    sistema_manejo: sistemaSelecionado,
    monitoramento,
  });

  // ── Submit ───────────────────────────────────────────────────────────────
  const onSubmitValidado: SubmitHandler<FormValores> = async (dados) => {
    let temErro = false;
    if (!cidadeSelecionada || !municipios.some((m) => m.nome === cidadeSelecionada)) {
      setErroCidade(true);
      temErro = true;
    }
    if (!termosAceitos) {
      setErroTermos(true);
      temErro = true;
    }
    if (temErro) return;

    setLoading(true);
    setMensagemApi(null);
    setResultado(null);
    setSalvo(false);

    try {
      const resposta = await calcularCalagem(dados);
      setResultado(resposta);
    } catch (error) {
      setMensagemApi(extrairMensagemErro(error));
    } finally {
      setLoading(false);
    }
  };

  const onErrorNoForm = () => {
    if (!cidadeSelecionada || !municipios.some((m) => m.nome === cidadeSelecionada)) {
      setErroCidade(true);
    }
    if (!termosAceitos) setErroTermos(true);
  };

  const handleTentarSalvar = () => {
    if (!isLoggedIn) {
      sessionStorage.setItem('analisePendente', JSON.stringify({ dados: getValues(), resultado }));
      navigate('/login');
      return;
    }
    setSalvo(true);
    setTimeout(() => setSalvo(false), 3000);
  };

  const tituloResultado =
    resultado?.aplicar_calcario === false ? 'Aplicação não recomendada' : 'Diagnóstico Concluído';

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl lg:flex-row">
      {/* ── Modal Termos ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={modalTermosOpen}
        onClose={() => setModalTermosOpen(false)}
        titulo="Termos de Uso do Ibiferti"
      >
        <div className="space-y-4 text-sm leading-relaxed text-stone-600">
          <p>
            O <strong>Ibiferti</strong> é uma ferramenta de apoio à tomada de decisão
            baseada nos manuais regionais oficiais.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>As recomendações são puramente matemáticas baseadas nos dados informados.</li>
            <li>Não substitui a avaliação de um Engenheiro Agrônomo qualificado.</li>
            <li>A precisão depende da qualidade da coleta de solo e da análise laboratorial.</li>
          </ul>
          <button
            onClick={() => setModalTermosOpen(false)}
            className="mt-4 w-full rounded-xl bg-stone-900 py-3 font-bold text-white transition-colors hover:bg-stone-800"
          >
            Entendido
          </button>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════
          COLUNA ESQUERDA — Formulário
      ════════════════════════════════════════════════════════════════════ */}
      <div className="w-full bg-white p-8 lg:w-3/5 lg:p-12">
        {/* Cabeçalho */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-green-600 shadow-lg">
            <Leaf className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-800">Ibiferti Calagem</h1>
            <p className="text-sm font-medium text-stone-500">Motor de Recomendação v2.0</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmitValidado, onErrorNoForm)} noValidate className="space-y-8">

          {/* ── Bloco: Localização ──────────────────────────────────────── */}
          <div className="space-y-5 rounded-2xl border border-stone-100 bg-stone-50 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">Localização</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Estado */}
              <div className="col-span-1 space-y-1">
                <label className="text-xs font-semibold text-stone-600">Estado *</label>
                <select
                  value={ufSelecionada}
                  onChange={(e) => {
                    setUfSelecionada(e.target.value);
                    setErroCidade(false);
                    if (!e.target.value) { setMunicipios([]); setCidadeSelecionada(''); }
                  }}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm outline-none focus:border-green-500"
                >
                  <option value="">UF</option>
                  {estados.map((estado) => (
                    <option key={estado.id} value={estado.sigla}>{estado.sigla}</option>
                  ))}
                </select>
              </div>

              {/* Cidade */}
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-stone-600">Cidade *</label>
                <input
                  list="lista-municipios-calc"
                  value={cidadeSelecionada}
                  onChange={(e) => { setCidadeSelecionada(e.target.value); setErroCidade(false); }}
                  disabled={municipios.length === 0}
                  placeholder={ufSelecionada ? 'Digite para buscar...' : 'Selecione o Estado'}
                  autoComplete="off"
                  className={`w-full rounded-xl border px-4 py-3 shadow-sm outline-none transition-all disabled:opacity-50 ${
                    erroCidade
                      ? 'border-red-400 bg-red-50'
                      : 'border-stone-200 bg-white focus:border-green-500'
                  }`}
                />
                <datalist id="lista-municipios-calc">
                  {municipios.map((m) => <option key={m.id} value={m.nome} />)}
                </datalist>
                {erroCidade ? (
                  <span className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle size={11} /> Selecione uma cidade válida
                  </span>
                ) : null}
              </div>
            </div>

            {/* Identificação */}
            <div className="space-y-1">
              <label className="flex justify-between text-xs font-semibold text-stone-600">
                Identificação <span className="font-normal text-stone-400">Opcional</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Talhão da Caixa d'água"
                {...register('identificacao')}
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm outline-none focus:border-green-500"
              />
            </div>
          </div>

          {/* ── Bloco: Configuração do Sistema ──────────────────────────── */}
          <div className="space-y-5 rounded-2xl border border-stone-100 bg-stone-50 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">
              Configuração do Sistema
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Sistema de Manejo */}
              <div className="space-y-1">
                <div className="group relative flex w-max items-center gap-2">
                  <label className="text-xs font-semibold text-stone-600">Sistema de Manejo *</label>
                  <div className="cursor-help text-yellow-500"><Lightbulb size={14} /></div>
                  <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden w-72 rounded-xl bg-stone-800 p-4 text-xs text-stone-200 shadow-xl group-hover:block">
                    <div className="space-y-2">
                      <div><strong className="block text-white">Convencional</strong>Revolvimento anual com aração e gradagem.</div>
                      <div className="h-px bg-stone-700" />
                      <div><strong className="block text-white">PD Implantação</strong>Fase inicial de transição para plantio direto.</div>
                      <div className="h-px bg-stone-700" />
                      <div><strong className="block text-white">PD Consolidado</strong>Sistema maduro, sem revolvimento e com boa palhada.</div>
                    </div>
                    <div className="absolute left-6 top-full -mt-1 border-4 border-transparent border-t-stone-800" />
                  </div>
                </div>
                <select
                  {...register('sistema_manejo', {
                    onChange: (e) => {
                      if (e.target.value !== 'PD_CONSOLIDADO') setMonitoramentoAtivo(false);
                    },
                  })}
                  className={`w-full rounded-xl border px-4 py-3 shadow-sm outline-none transition-all ${
                    errors.sistema_manejo
                      ? 'border-red-400 bg-red-50'
                      : 'border-stone-200 bg-white focus:border-green-500'
                  }`}
                >
                  <option value="CONVENCIONAL">Convencional</option>
                  <option value="PD_IMPLANTACAO">Plantio Direto — Implantação</option>
                  <option value="PD_CONSOLIDADO">Plantio Direto — Consolidado</option>
                </select>
              </div>

              {/* Tipo de Aplicação */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-600">Tipo de Aplicação *</label>
                <select
                  {...register('primeira_calagem', { setValueAs: (v) => v === 'true' })}
                  className={`w-full rounded-xl border px-4 py-3 shadow-sm outline-none transition-all ${
                    errors.primeira_calagem
                      ? 'border-red-400 bg-red-50'
                      : 'border-stone-200 bg-white focus:border-green-500'
                  }`}
                >
                  <option value="true">Primeira calagem</option>
                  <option value="false">Reaplicação</option>
                </select>
              </div>
            </div>

            {/* PRNT */}
            <div className="max-w-xs">
              <CampoNumerico
                label="PRNT (%) *"
                name="PRNT"
                min={0.1}
                max={100}
                placeholder="Ex: 90"
                register={register}
                error={errors.PRNT}
                dica="PRNT deve estar no intervalo (0, 100]."
              />
            </div>

            {/* Modo de aplicação — PD Implantação */}
            {isPDImplantacao ? (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-600">Modo de Aplicação *</label>
                <select
                  {...register('opcao_superficial_campo_natural', { setValueAs: (v) => v === 'true' })}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm outline-none focus:border-green-500"
                >
                  <option value="false">Incorporado (padrão)</option>
                  <option value="true">Superficial — Campo Natural (SMP &gt; 5,5)</option>
                </select>
              </div>
            ) : null}
          </div>

          {/* ── Bloco: Dados de Solo ─────────────────────────────────────── */}
          <div className="space-y-5 rounded-2xl border border-stone-100 bg-stone-50 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">Dados de Solo</h3>
              {isPDConsolidado ? (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  Camada principal: 0–10 cm
                </span>
              ) : (
                <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold text-stone-600">
                  Camada principal: 0–20 cm
                </span>
              )}
              {sistemaEfetivo === 'PD_COM_RESTRICAO' ? (
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                  Fluxo efetivo: PD com Restrição
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <CampoNumerico
                label="pH em água *"
                name="pH_agua"
                min={3.5}
                max={8}
                placeholder="Ex: 5,2"
                register={register}
                error={errors.pH_agua}
                dica={
                  isPDConsolidado
                    ? 'Para PD Consolidado, informe o pH da camada 0–10 cm.'
                    : 'Para Convencional e PD Implantação, informe o pH da camada 0–20 cm.'
                }
              />
              <CampoNumerico
                label="Índice SMP *"
                name="SMP"
                min={4.4}
                max={7.1}
                placeholder="Ex: 5,5"
                register={register}
                error={errors.SMP}
                dica="SMP deve estar entre 4.4 e 7.1."
              />
            </div>

            {/* Bloco B3 — Polinomial */}
            {isPolinomial ? (
              <div className="space-y-4 rounded-2xl border border-green-200 bg-white p-5">
                <div>
                  <h4 className="text-sm font-bold text-stone-800">Bloco B3 — Método Polinomial</h4>
                  <p className="text-xs text-stone-500">O formulário exibe estes campos porque SMP &gt; 6,3.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <CampoNumerico label="MO (%) *" name="MO" min={0} max={100} placeholder="Ex: 2,5" register={register} error={errors.MO} />
                  <CampoNumerico label="Al trocável (cmolc/dm³) *" name="Al_trocavel" min={0} placeholder="Ex: 0,5" register={register} error={errors.Al_trocavel} />
                </div>
              </div>
            ) : null}

            {/* Bloco B1 — Reaplicação SMP */}
            {isReaplicacaoSMP ? (
              <div className="space-y-4 rounded-2xl border border-blue-200 bg-white p-5">
                <div>
                  <h4 className="text-sm font-bold text-stone-800">Bloco B1 — Saturação por Bases (referência)</h4>
                  <p className="text-xs text-stone-500">Campos exibidos em reaplicação com método roteado para SMP.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <CampoNumerico label="V atual (%) *" name="V_atual" min={0} max={100} placeholder="Ex: 55" register={register} error={errors.V_atual} />
                  <CampoNumerico label="CTC pH7 (cmolc/dm³) *" name="CTC_pH7" min={0.1} placeholder="Ex: 10" register={register} error={errors.CTC_pH7} />
                </div>
              </div>
            ) : null}

            {/* Bloco B2 — Trava PD Consolidado */}
            {precisaAlSat ? (
              <div className="space-y-4 rounded-2xl border border-orange-200 bg-white p-5">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-stone-800">Bloco B2 — Verificação da trava do PD Consolidado</h4>
                  <p className="text-xs text-stone-500">
                    Sistema PD_CONSOLIDADO com pH_agua &lt; 5,5 — coleta de Al_sat liberada.
                  </p>
                </div>

                {!primeiraCalagem ? (
                  isReaplicacaoSMP ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                      V_atual já foi coletado no Bloco B1 e será reaproveitado aqui.
                    </div>
                  ) : (
                    <CampoNumerico
                      label="V atual (%) *"
                      name="V_atual"
                      min={0}
                      max={100}
                      placeholder="Ex: 66"
                      register={register}
                      error={errors.V_atual}
                      dica="Necessário para verificar a trava RN-04/TRAVA-03."
                    />
                  )
                ) : null}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setModoAlSat('direto')}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      modoAlSatAtual === 'direto'
                        ? 'border-green-500 bg-green-50'
                        : 'border-stone-200 bg-stone-50 hover:border-stone-300'
                    }`}
                  >
                    <div className="text-sm font-bold text-stone-800">Opção 1</div>
                    <div className="text-xs text-stone-500">Informar Al_sat diretamente</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoAlSat('calculado')}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      modoAlSatAtual === 'calculado'
                        ? 'border-green-500 bg-green-50'
                        : 'border-stone-200 bg-stone-50 hover:border-stone-300'
                    }`}
                  >
                    <div className="text-sm font-bold text-stone-800">Opção 2</div>
                    <div className="text-xs text-stone-500">Calcular Al_sat = (Al_trocavel / CTC_pH7) × 100</div>
                  </button>
                </div>

                {modoAlSatAtual === 'direto' ? (
                  <CampoNumerico
                    label="Al saturação (%) *"
                    name="Al_sat"
                    min={0}
                    max={100}
                    placeholder="Ex: 8"
                    register={register}
                    error={errors.Al_sat}
                  />
                ) : (
                  <div className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    {!isPolinomial ? (
                      <CampoNumerico
                        label="Al trocável (cmolc/dm³) *"
                        name="Al_trocavel"
                        min={0}
                        placeholder="Ex: 0,8"
                        register={register}
                        error={errors.Al_trocavel}
                      />
                    ) : (
                      <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-800">
                        Al_trocavel já está visível no Bloco B3 e será reaproveitado.
                      </div>
                    )}
                    {!isReaplicacaoSMP ? (
                      <CampoNumerico
                        label="CTC pH7 (cmolc/dm³) *"
                        name="CTC_pH7"
                        min={0.1}
                        placeholder="Ex: 10"
                        register={register}
                        error={errors.CTC_pH7}
                      />
                    ) : (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                        CTC_pH7 já foi coletada no Bloco B1 e será reutilizada.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* ── Bloco: Monitoramento de Profundidade (só PD Consolidado) ── */}
          {isPDConsolidado ? (
            <div className="space-y-5 rounded-2xl border border-stone-100 bg-stone-50 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">
                    Monitoramento de Profundidade
                  </h3>
                  <p className="text-xs text-stone-500">Módulo opcional para a camada 10–20 cm.</p>
                </div>
                <label className="flex cursor-pointer items-center gap-3 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700">
                  <input
                    type="checkbox"
                    checked={monitoramentoAtivo}
                    onChange={(e) => setMonitoramentoAtivo(e.target.checked)}
                    className="h-4 w-4 rounded accent-green-600"
                  />
                  Informar monitoramento
                </label>
              </div>

              {monitoramentoAtivo ? (
                <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <CampoNumerico
                      label="pH em água 10–20 cm *"
                      name="monitoramento.pH_agua_10_20"
                      min={3.5}
                      max={8}
                      placeholder="Ex: 4,8"
                      register={register}
                      error={errors.monitoramento?.pH_agua_10_20}
                    />
                    <CampoNumerico
                      label="Al_sat 10–20 cm (%) *"
                      name="monitoramento.Al_sat_10_20"
                      min={0}
                      max={100}
                      placeholder="Ex: 35"
                      register={register}
                      error={errors.monitoramento?.Al_sat_10_20}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {[
                      { name: 'monitoramento.disponibilidade_P_10_20_abaixo_critico' as const, label: 'Disponibilidade de P abaixo do crítico' },
                      { name: 'monitoramento.compactacao_restringindo_raiz' as const,           label: 'Compactação restringindo raiz' },
                      { name: 'monitoramento.produtividade_abaixo_media' as const,              label: 'Produtividade abaixo da média' },
                    ].map(({ name, label }) => (
                      <label key={name} className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                        <input type="checkbox" {...register(name)} className="mt-0.5 h-4 w-4 rounded accent-green-600" />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>

                  {restricao10_20 ? (
                    <div className="space-y-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-orange-900">Restrição detectada na camada 10–20 cm</h4>
                        <p className="text-xs text-orange-800">{MSG_MONITORAMENTO_RESTRICAO}</p>
                      </div>
                      <CampoNumerico
                        label="SMP camada 10–20 cm *"
                        name="SMP_10_20"
                        min={4.4}
                        max={7.1}
                        placeholder="Ex: 4,8"
                        register={register}
                        error={errors.SMP_10_20}
                        dica="Necessário para montar o SMP médio do fluxo PD com Restrição."
                      />
                    </div>
                  ) : monitoramento ? (
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">
                      Sem restrição 10–20 cm detectada. Nenhum campo adicional é solicitado.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* ── Termos de Uso ────────────────────────────────────────────── */}
          <div className={`rounded-2xl border p-5 transition-colors ${erroTermos ? 'border-red-200 bg-red-50' : 'border-stone-200 bg-stone-50'}`}>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={termosAceitos}
                onChange={(e) => { setTermosAceitos(e.target.checked); setErroTermos(false); }}
                className="mt-0.5 h-5 w-5 cursor-pointer rounded accent-green-600"
              />
              <div className="flex-1 text-sm leading-relaxed text-stone-700">
                Li e concordo com os{' '}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setModalTermosOpen(true); }}
                  className="font-bold text-green-600 hover:underline"
                >
                  Termos de Uso
                </button>.
                {erroTermos ? (
                  <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-500">
                    <ShieldCheck size={14} /> O aceite dos termos é obrigatório.
                  </span>
                ) : null}
              </div>
            </label>
          </div>

          {/* ── Botão Calcular ───────────────────────────────────────────── */}
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
          {mensagemApi ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-red-500 shadow-sm">
                  <AlertCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-stone-800">Não foi possível calcular</h2>
              </div>
              <div className="rounded-[1.5rem] border border-red-200 bg-white p-6 shadow-xl">
                <p className="text-sm font-bold uppercase tracking-wider text-red-600">Feedback da validação</p>
                <p className="mt-3 text-sm leading-relaxed text-stone-700">{mensagemApi}</p>
              </div>
            </div>
          ) : resultado ? (

            /* Estado: resultado calculado */
            <div className="space-y-6">
              <div className="mb-2 flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-green-500 shadow-sm">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-2xl font-bold text-stone-800">{tituloResultado}</h2>
              </div>

              {resultado.aplicar_calcario ? (
                <div className="rounded-[1.5rem] bg-white p-8 text-center shadow-xl">
                  <p className="mb-1 text-sm font-bold uppercase tracking-wider text-stone-400">Dose para Produto Real</p>
                  <div className="mb-1 flex items-baseline justify-center gap-2">
                    <span className="bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-6xl font-extrabold text-transparent">
                      {resultado.NC_ajustada?.toFixed(2) ?? '—'}
                    </span>
                    <span className="text-xl font-bold text-green-700">t/ha</span>
                  </div>
                  <p className="text-xs text-stone-400">PRNT corrigido</p>
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-stone-200 bg-white p-8 text-center shadow-xl">
                  <p className="mb-2 text-sm font-bold uppercase tracking-wider text-stone-400">Situação Atual</p>
                  <p className="text-2xl font-bold text-stone-800">Sem recomendação de aplicação</p>
                  <p className="mt-2 text-sm text-stone-500">O retorno do backend indica que não há calagem a recomendar.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'NC base',        value: resultado.NC_base?.toFixed(2),          unit: 't/ha' },
                  { label: 'NC final',       value: resultado.NC_final?.toFixed(2),         unit: 't/ha' },
                  { label: 'Método',         value: resultado.metodo_calc_roteado,           unit: null   },
                  { label: 'Modo aplicação', value: resultado.modo_aplicacao,                unit: null   },
                ].map(({ label, value, unit }) => (
                  <div key={label} className="rounded-xl bg-white/80 p-4 text-center shadow-sm">
                    <p className="mb-1 text-xs text-stone-400">{label}</p>
                    <p className="text-lg font-bold text-stone-700">
                      {value ?? '—'}{unit ? <span className="text-xs font-normal"> {unit}</span> : null}
                    </p>
                  </div>
                ))}
              </div>

              {resultado.profundidade_cm ? (
                <div className="rounded-xl border border-stone-200 bg-white/80 p-4 text-sm text-stone-700 shadow-sm">
                  <strong>Profundidade recomendada:</strong> {resultado.profundidade_cm} cm
                </div>
              ) : null}

              {resultado.NC_vb !== undefined ? (
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                  <strong>Referência — Saturação por Bases:</strong>{' '}
                  {resultado.NC_vb.toFixed(2)} t/ha
                </div>
              ) : null}

              {resultado.nota_tecnica ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                  {resultado.nota_tecnica}
                </div>
              ) : null}

              {resultado.acao_requerida ? (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
                  <strong>Ação requerida:</strong> {resultado.acao_requerida}
                </div>
              ) : null}

              {resultado.alertas?.length > 0 ? (
                <div className="space-y-2">
                  {resultado.alertas.map((alerta, i) => (
                    <div
                      key={`${alerta}-${i}`}
                      className="flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800"
                    >
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <span>{alerta}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Ações — PDF e Salvar */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!resultado) return;
                    gerarPDFRelatorio({
                      dadosEntrada: getValues(),
                      resultado,
                      localizacao: { uf: ufSelecionada, cidade: cidadeSelecionada },
                    });
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-white py-3 font-semibold text-green-700 shadow-sm hover:bg-green-50"
                >
                  <FileDown size={18} /> PDF
                </button>
                <button
                  type="button"
                  onClick={handleTentarSalvar}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 font-semibold shadow-sm transition-all ${
                    salvo
                      ? 'bg-green-500 text-white'
                      : 'border border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  {salvo ? <><Check size={18} /> Salvo!</> : <><Save size={18} /> Salvar</>}
                </button>
              </div>
            </div>

          ) : (
            /* Estado: aguardando input */
            <div className="flex h-full flex-col items-center justify-center space-y-4 text-center opacity-60">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-stone-200/50">
                <Sprout size={32} className="text-stone-400" />
              </div>
              <h3 className="text-xl font-semibold">Aguardando Dados</h3>
              <p className="max-w-xs text-sm text-stone-400">
                Preencha o formulário e clique em calcular para ver o diagnóstico.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}