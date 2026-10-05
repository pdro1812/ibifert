import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import type { Resolver, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  FileDown,
  Landmark,
  Layers,
  Leaf,
  Lightbulb,
  Save,
  ShieldCheck,
  Sprout,
} from 'lucide-react';

import {
  CalagemSchema,
  detectarRestricaoMonitoramento,
  precisaAlSatPDConsolidado,
  rotearMetodoCalagem,
  type CalagemResultado,
  type EntradaCalagem,
} from '../schemas/calagemSchema';
import {
  AdubacaoSchema,
  type EntradaAdubacaoForm,
} from '../schemas/adubacaoSchema';
import { calcularCalagem, calcularAdubacao, salvarAdubacao } from '../services/api';
import { gerarPDFRelatorio } from '../services/pdfGenerator';
import { gerarPDFRelatorioAdubacao } from '../services/pdfGeneratorAdubacao';
import { ibgeService } from '../services/ibge';
import type { Estado, Municipio } from '../services/ibge';
import { Modal } from '../components/Modal';
import { CampoNumerico, SelectPadrao } from '../components/FormFields';
import { useAuth } from '../contexts/AuthContext';

// ─── Tipos: formulário único cobrindo calagem + adubação ────────────────────
//
// Calagem e adubação compartilham 4 campos com o mesmo significado físico
// (identificacao, pH_agua, MO, CTC_pH7) — em vez de pedir cada um duas vezes,
// eles viram um único campo no formulário combinado, validado contra os dois
// schemas quando os dois módulos estão ativos.

type ModoCalculo = 'CALAGEM' | 'ADUBACAO' | 'AMBOS';

type FormCompleta = Omit<
  EntradaCalagem,
  'identificacao' | 'pH_agua' | 'MO' | 'CTC_pH7'
> &
  Omit<EntradaAdubacaoForm, 'identificacao' | 'pH_agua' | 'MO' | 'CTC_pH7'> & {
    identificacao?: string;
    pH_agua?: number;
    MO?: number;
    CTC_pH7?: number;
  };

// ─── Resolver dinâmico ────────────────────────────────────────────────────
//
// Os dois schemas (CalagemSchema/AdubacaoSchema) continuam sendo a fonte
// única de validação — nada aqui reimplementa regra de negócio. Este
// resolver só decide, a cada validação, QUAIS dos dois schemas rodar (de
// acordo com o modo escolhido) e funde os erros num único FieldErrors que o
// react-hook-form entende. Os `as any`/`unknown` são só a ponte de tipos
// entre "um formulário, dois schemas de mundos diferentes" — a validação em
// si é sempre feita pelo zodResolver original de cada schema.
const resolverCalagemBase = zodResolver(CalagemSchema) as unknown as (
  values: unknown,
  context: unknown,
  options: unknown
) => Promise<{ errors: Record<string, unknown>; values: unknown }>;

const resolverAdubacaoBase = zodResolver(AdubacaoSchema) as unknown as (
  values: unknown,
  context: unknown,
  options: unknown
) => Promise<{ errors: Record<string, unknown>; values: unknown }>;

function criarResolverCompleto(modo: ModoCalculo): Resolver<FormCompleta> {
  const calagemAtiva = modo !== 'ADUBACAO';
  const adubacaoAtiva = modo !== 'CALAGEM';

  return async (values, context, options) => {
    const [resultadoCalagem, resultadoAdubacao] = await Promise.all([
      calagemAtiva ? resolverCalagemBase(values, context, options) : null,
      adubacaoAtiva ? resolverAdubacaoBase(values, context, options) : null,
    ]);

    const errors = {
      ...(resultadoCalagem?.errors ?? {}),
      ...(resultadoAdubacao?.errors ?? {}),
    };

    if (Object.keys(errors).length > 0) {
      return { values: {}, errors: errors as never };
    }
    return { values: values as FormCompleta, errors: {} };
  };
}

// ─── Helpers de erro de API (mesmo formato de cada backend, sem inventar) ──

function extrairMensagemErroCalagem(error: unknown): string {
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

function extrairMensagemErroAdubacao(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const resp = (error as { response?: { data?: { error?: string } } }).response;
    if (typeof resp?.data?.error === 'string') return resp.data.error;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Erro ao calcular adubação.';
}

// ─── Seletor de módulo ──────────────────────────────────────────────────────

const OPCOES_MODO: Array<{
  valor: ModoCalculo;
  titulo: string;
  descricao: string;
  icone: typeof Leaf;
}> = [
  { valor: 'CALAGEM', titulo: 'Apenas Calagem', descricao: 'Correção de solo (calcário).', icone: Leaf },
  { valor: 'ADUBACAO', titulo: 'Apenas Adubação', descricao: 'Recomendação de NPK.', icone: Sprout },
  { valor: 'AMBOS', titulo: 'Calagem + Adubação', descricao: 'Os dois cálculos de uma vez.', icone: Layers },
];

const METODOS_EXTRACAO = [
  { value: 'Mehlich-1', label: 'Mehlich-1' },
  { value: 'Mehlich-3', label: 'Mehlich-3' },
];

const CULTURAS_COM_S = ['soja', 'ervilha', 'ervilhaca', 'canola', 'nabo_forrageiro'];
const CULTURAS_COM_ANTECEDENTE = [
  'aveia_branca', 'aveia_preta', 'centeio', 'cevada', 'trigo', 'triticale', 'milho',
];

// ─── Page ─────────────────────────────────────────────────────────────────

export function CalculadoraCompletaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useAuth();

  const [modo, setModo] = useState<ModoCalculo>('AMBOS');

  // Recuperação pós-login (ver services/pendencias.ts + LoginPage.tsx) —
  // mesmo padrão das páginas antigas: o resultado recuperado entra direto
  // como valor inicial do estado (nunca via setState dentro de um efeito).
  // "tipoRecuperado" existe só aqui, porque esta é a única tela em que os
  // dois tipos de resultado podem coexistir e precisam ser distinguidos.
  const resultadoRecuperadoState = location.state as
    | { resultadoRecuperado?: unknown; tipoRecuperado?: 'CALAGEM' | 'ADUBACAO' }
    | null;
  const calagemRecuperada =
    resultadoRecuperadoState?.tipoRecuperado !== 'ADUBACAO'
      ? (resultadoRecuperadoState?.resultadoRecuperado as CalagemResultado | undefined)
      : undefined;
  const adubacaoRecuperada =
    resultadoRecuperadoState?.tipoRecuperado === 'ADUBACAO'
      ? resultadoRecuperadoState.resultadoRecuperado
      : undefined;

  // ── Estado: calagem ───────────────────────────────────────────────────
  const [resultadoCalagem, setResultadoCalagem] = useState<CalagemResultado | null>(calagemRecuperada ?? null);
  const [erroCalagem, setErroCalagem] = useState<string | null>(null);
  const [loadingCalagem, setLoadingCalagem] = useState(false);
  const [salvoCalagem, setSalvoCalagem] = useState(false);

  // ── Estado: adubação ──────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [resultadoAdubacao, setResultadoAdubacao] = useState<any | null>(adubacaoRecuperada ?? null);
  const [erroAdubacao, setErroAdubacao] = useState<string | null>(null);
  const [loadingAdubacao, setLoadingAdubacao] = useState(false);
  const [salvoAdubacao, setSalvoAdubacao] = useState(false);

  // ── Estado: formulário/UX compartilhados ──────────────────────────────
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

  // Limpa o state de navegação após consumir o resultado recuperado (que já
  // foi lido acima, na inicialização do estado), para não reaplicá-lo se o
  // usuário navegar de volta para esta página depois.
  useEffect(() => {
    if (resultadoRecuperadoState?.resultadoRecuperado) {
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── IBGE ─────────────────────────────────────────────────────────────
  useEffect(() => { ibgeService.getEstados().then(setEstados); }, []);
  useEffect(() => {
    if (ufSelecionada) ibgeService.getMunicipios(ufSelecionada).then(setMunicipios);
  }, [ufSelecionada]);

  // ── Form ─────────────────────────────────────────────────────────────
  const {
    control,
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormCompleta>({
    resolver: criarResolverCompleto(modo),
    shouldUnregister: true,
    defaultValues: {
      sistema_manejo: 'PD_CONSOLIDADO',
      primeira_calagem: false,
      opcao_superficial_campo_natural: false,
      metodo_P: 'Mehlich-1',
      metodo_K: 'Mehlich-1',
      tipo_correcao: 'Gradual',
      sistema_cultivo: 'Plantio Direto',
      num_cultivo: '1',
    },
  });

  const handleTrocarModo = (novoModo: ModoCalculo) => {
    setModo(novoModo);
    setResultadoCalagem(null);
    setErroCalagem(null);
    setResultadoAdubacao(null);
    setErroAdubacao(null);
    setSalvoCalagem(false);
    setSalvoAdubacao(false);
  };

  const calagemAtiva = modo !== 'ADUBACAO';
  const adubacaoAtiva = modo !== 'CALAGEM';

  // ── Watches: calagem ─────────────────────────────────────────────────
  const sistemaSelecionado = useWatch({ control, name: 'sistema_manejo' });
  const smpValor = useWatch({ control, name: 'SMP' });
  const monitoramento = useWatch({ control, name: 'monitoramento' });

  const temSmpInformado = typeof smpValor === 'number';
  const metodoRoteado = temSmpInformado ? rotearMetodoCalagem(smpValor) : null;
  // SMP é sempre o método em evidência. Acima de SMP 6,3 o Polinomial é
  // calculado automaticamente; abaixo, só se o usuário marcar o checkbox.
  const polinomialAutomatico = metodoRoteado === 'POLINOMIAL';
  const polinomialSelecionado = useWatch({ control, name: 'calcular_polinomial' }) === true;
  const isPolinomial = polinomialAutomatico || polinomialSelecionado;
  const isReaplicacaoSMP = metodoRoteado === 'SMP';
  const isPDConsolidado = sistemaSelecionado === 'PD_CONSOLIDADO';
  const isPDImplantacao = sistemaSelecionado === 'PD_IMPLANTACAO';
  // pH_agua agora é compartilhado — o watch precisa existir independente do
  // modo para as duas regras (calagem e adubação) que dependem dele.
  const pHValor = useWatch({ control, name: 'pH_agua' });
  const precisaAlSat = precisaAlSatPDConsolidado(sistemaSelecionado, pHValor);
  const modoAlSatAtual = precisaAlSat ? modoAlSat : 'direto';
  const restricao10_20 =
    isPDConsolidado && monitoramentoAtivo && detectarRestricaoMonitoramento(monitoramento);

  // MO e CTC_pH7 já aparecem em algum lugar da tela sempre que a adubação
  // está ativa (no bloco compartilhado, em modo AMBOS, ou no Grupo A, em
  // modo ADUBACAO puro) — os blocos B1/B3 da calagem usam isso para não
  // pedir o mesmo campo duas vezes.
  const moJaExibidaFora = adubacaoAtiva;
  const ctcJaExibidaFora = adubacaoAtiva;
  const mostrarBlocoSoloCompartilhado = calagemAtiva && adubacaoAtiva;

  // ── Watches: adubação ────────────────────────────────────────────────
  const watchCultura = useWatch({ control, name: 'cultura' });
  const watchArgila = useWatch({ control, name: 'argila' });
  const watchCtc = useWatch({ control, name: 'CTC_pH7' });
  const watchTipoCorrecao = useWatch({ control, name: 'tipo_correcao' });

  const exigeS = watchCultura ? CULTURAS_COM_S.includes(watchCultura) : false;
  const exigeCultAnt = watchCultura ? CULTURAS_COM_ANTECEDENTE.includes(watchCultura) : false;
  const disableCorrecaoTotal =
    (watchArgila !== undefined && watchArgila < 20) || (watchCtc !== undefined && watchCtc < 7.5);

  // Com calagem + adubação, o Sistema de Cultivo é derivado do Sistema de
  // Manejo (mesma informação) e vai ao cálculo por um campo oculto registrado.
  const derivarCultivoDoManejo = calagemAtiva && adubacaoAtiva;
  useEffect(() => {
    if (derivarCultivoDoManejo) {
      setValue('sistema_cultivo', sistemaSelecionado === 'CONVENCIONAL' ? 'Convencional' : 'Plantio Direto');
    }
  }, [derivarCultivoDoManejo, sistemaSelecionado, setValue]);

  useEffect(() => {
    if (disableCorrecaoTotal && watchTipoCorrecao === 'Total') {
      setValue('tipo_correcao', 'Gradual');
    }
  }, [disableCorrecaoTotal, watchTipoCorrecao, setValue]);

  // ── Submit ───────────────────────────────────────────────────────────
  const onSubmitValidado: SubmitHandler<FormCompleta> = async (dados) => {
    let temErro = false;
    if (calagemAtiva && (!cidadeSelecionada || !municipios.some((m) => m.nome === cidadeSelecionada))) {
      setErroCidade(true);
      temErro = true;
    }
    if (!termosAceitos) {
      setErroTermos(true);
      temErro = true;
    }
    if (temErro) return;

    setResultadoCalagem(null);
    setErroCalagem(null);
    setResultadoAdubacao(null);
    setErroAdubacao(null);
    setSalvoCalagem(false);
    setSalvoAdubacao(false);

    const tarefas: Promise<unknown>[] = [];

    if (calagemAtiva) {
      setLoadingCalagem(true);
      const dadosCalagem = CalagemSchema.parse(dados);
      tarefas.push(
        calcularCalagem(dadosCalagem, {
          uf: ufSelecionada,
          cidade: cidadeSelecionada,
          modo_al_sat: modoAlSatAtual,
          monitoramento_ativo: monitoramentoAtivo,
        })
          .then((resposta) => setResultadoCalagem(resposta))
          .catch((error) => setErroCalagem(extrairMensagemErroCalagem(error)))
          .finally(() => setLoadingCalagem(false))
      );
    }

    if (adubacaoAtiva) {
      setLoadingAdubacao(true);
      const dadosAdubacao = AdubacaoSchema.parse(dados);
      tarefas.push(
        calcularAdubacao(dadosAdubacao)
          .then((res) => setResultadoAdubacao({ ...res.resultado, dadosEntrada: dadosAdubacao }))
          .catch((error) => setErroAdubacao(extrairMensagemErroAdubacao(error)))
          .finally(() => setLoadingAdubacao(false))
      );
    }

    await Promise.allSettled(tarefas);
  };

  const onErrorNoForm = () => {
    if (calagemAtiva && (!cidadeSelecionada || !municipios.some((m) => m.nome === cidadeSelecionada))) {
      setErroCidade(true);
    }
    if (!termosAceitos) setErroTermos(true);
  };

  // ── Salvar (cada módulo mantém exatamente o comportamento da página de
  //     origem — calagem é auto-persistida pelo backend no cálculo em si
  //     quando logado; adubação exige uma chamada explícita de salvar) ──
  const handleTentarSalvarCalagem = () => {
    if (!isLoggedIn) {
      sessionStorage.setItem(
        'analisePendente',
        JSON.stringify({
          dados: getValues(),
          localizacao: { uf: ufSelecionada, cidade: cidadeSelecionada },
          destino: location.pathname,
        })
      );
      navigate('/login');
      return;
    }
    setSalvoCalagem(true);
    setTimeout(() => setSalvoCalagem(false), 3000);
  };

  const handleTentarSalvarAdubacao = async () => {
    if (!resultadoAdubacao) return;

    if (!isLoggedIn) {
      sessionStorage.setItem(
        'adubacaoPendente',
        JSON.stringify({ dados: getValues(), destino: location.pathname })
      );
      navigate('/login');
      return;
    }

    try {
      await salvarAdubacao({
        dadosForm: getValues() as unknown as EntradaAdubacaoForm,
        resultado: resultadoAdubacao.recomendacao ? resultadoAdubacao : resultadoAdubacao.resultado,
      });
      setSalvoAdubacao(true);
      setTimeout(() => setSalvoAdubacao(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar adubação:', error);
      alert('Erro ao salvar adubação. Tente novamente.');
    }
  };

  const tituloResultadoCalagem =
    resultadoCalagem?.aplicar_calcario === false ? 'Aplicação não recomendada' : 'Diagnóstico Concluído';

  const nenhumResultadoAinda =
    !resultadoCalagem && !erroCalagem && !resultadoAdubacao && !erroAdubacao && !loadingCalagem && !loadingAdubacao;

  const labelBotaoCalcular =
    modo === 'AMBOS' ? 'Calcular Calagem + Adubação' : modo === 'CALAGEM' ? 'Calcular Calagem' : 'Calcular Adubação';

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl lg:flex-row">
      {/* ── Modal Termos ─────────────────────────────────────────────── */}
      <Modal isOpen={modalTermosOpen} onClose={() => setModalTermosOpen(false)} titulo="Termos de Uso do Ibiferti">
        <div className="space-y-4 text-sm leading-relaxed text-stone-600">
          <p>
            O <strong>Ibiferti</strong> é uma ferramenta de apoio à tomada de decisão baseada nos
            manuais regionais oficiais.
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

      {/* ═══════════════════════════════════════════════════════════════
          COLUNA ESQUERDA — Formulário
      ════════════════════════════════════════════════════════════════ */}
      <div className="w-full bg-white p-8 lg:w-3/5 lg:p-12">
        {/* Cabeçalho */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-green-600 shadow-lg">
            <Layers className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-800">Calculadora Completa</h1>
            <p className="text-sm font-medium text-stone-500">Calagem e adubação em um único lugar</p>
          </div>
        </div>

        {/* ── Seletor de Módulo (destaque) ─────────────────────────────── */}
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {OPCOES_MODO.map((opcao) => {
            const Icone = opcao.icone;
            const ativo = modo === opcao.valor;
            return (
              <button
                key={opcao.valor}
                type="button"
                onClick={() => handleTrocarModo(opcao.valor)}
                className={`flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98] ${
                  ativo
                    ? 'border-green-500 bg-green-50 shadow-md'
                    : 'border-stone-200 bg-white hover:border-green-300 hover:bg-green-50/40'
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    ativo ? 'bg-green-600 text-white' : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  <Icone size={18} />
                </div>
                <div>
                  <div className={`text-sm font-bold ${ativo ? 'text-green-800' : 'text-stone-800'}`}>
                    {opcao.titulo}
                  </div>
                  <div className="text-xs text-stone-500">{opcao.descricao}</div>
                </div>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit(onSubmitValidado, onErrorNoForm)} noValidate className="space-y-8">
          {calagemAtiva ? (
            <input type="hidden" {...register('primeira_calagem', { setValueAs: () => false })} />
          ) : null}

          {/* ── Bloco: Identificação (+ Localização se calagem ativa) ──── */}
          <div className="space-y-5 rounded-2xl border border-stone-100 bg-stone-50 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">
              Identificação{calagemAtiva ? ' e Localização' : ''}
            </h3>

            {calagemAtiva ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-stone-600">Cidade *</label>
                  <input
                    list="lista-municipios-completa"
                    value={cidadeSelecionada}
                    onChange={(e) => { setCidadeSelecionada(e.target.value); setErroCidade(false); }}
                    disabled={municipios.length === 0}
                    placeholder={ufSelecionada ? 'Digite para buscar...' : 'Selecione o Estado'}
                    autoComplete="off"
                    className={`w-full rounded-xl border px-4 py-3 shadow-sm outline-none transition-all disabled:opacity-50 ${
                      erroCidade ? 'border-red-400 bg-red-50' : 'border-stone-200 bg-white focus:border-green-500'
                    }`}
                  />
                  <datalist id="lista-municipios-completa">
                    {municipios.map((m) => <option key={m.id} value={m.nome} />)}
                  </datalist>
                  {erroCidade ? (
                    <span className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle size={11} /> Selecione uma cidade válida
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

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

          {/* ── Bloco: Configuração do Sistema (calagem) ─────────────── */}
          {calagemAtiva ? (
            <div className="space-y-5 rounded-2xl border border-stone-100 bg-stone-50 p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">
                Manejo e calcário
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <div className="group relative flex w-max items-center gap-2">
                    <label className="text-xs font-semibold text-stone-600">Sistema de Manejo *</label>
                    <div className="cursor-help text-yellow-500"><Lightbulb size={14} /></div>
                    <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden w-72 rounded-xl bg-stone-800 p-4 text-xs text-stone-200 shadow-xl group-hover:block">
                      <div className="space-y-2">
                        <div><strong className="block text-white">Convencional</strong>Revolvimento anual com aração e gradagem.</div>
                        <div className="h-px bg-stone-700" />
                        <div><strong className="block text-white">Plantio Direto — Implantação</strong>Fase inicial de transição para plantio direto.</div>
                        <div className="h-px bg-stone-700" />
                        <div><strong className="block text-white">Plantio Direto — Consolidado</strong>Sistema maduro, sem revolvimento e com boa palhada.</div>
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
                      errors.sistema_manejo ? 'border-red-400 bg-red-50' : 'border-stone-200 bg-white focus:border-green-500'
                    }`}
                  >
                    <option value="CONVENCIONAL">Convencional</option>
                    <option value="PD_IMPLANTACAO">Plantio Direto — Implantação</option>
                    <option value="PD_CONSOLIDADO">Plantio Direto — Consolidado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

              {isPDImplantacao ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-600">Modo de Aplicação *</label>
                  <select
                    {...register('opcao_superficial_campo_natural', { setValueAs: (v) => v === true || v === 'true' })}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm outline-none focus:border-green-500"
                  >
                    <option value="false">Incorporado (padrão)</option>
                    <option value="true">Superficial — Campo Natural (SMP &gt; 5,5)</option>
                  </select>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* ── Bloco: Dados de Solo (calagem — pH/SMP + B1/B2/B3) ───── */}
          {calagemAtiva ? (
            <div className="space-y-5 rounded-2xl border border-stone-100 bg-stone-50 p-6">
              <div className="space-y-1">
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">
                  Análise de solo — Calagem
                </h3>
                <p className="text-xs text-stone-500">
                  {isPDConsolidado ? 'Use a amostra da camada de 0–10 cm.' : 'Use a amostra da camada de 0–20 cm.'}
                </p>
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

              {mostrarBlocoSoloCompartilhado ? (
                <div className="space-y-3 pt-2">
                  <h4 className="text-sm font-bold text-stone-800">Matéria orgânica e CTC</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <CampoNumerico label="MO (%) *" name="MO" min={0} max={100} placeholder="Ex: 2,5" register={register} error={errors.MO} />
                    <CampoNumerico label="CTC pH7 (cmolc/dm³) *" name="CTC_pH7" min={0.1} placeholder="Ex: 10" register={register} error={errors.CTC_pH7} />
                  </div>
                </div>
              ) : null}

              {/* Bloco B3 — Polinomial (complementar ao SMP) */}
              {temSmpInformado ? (
                <div data-testid="bloco-polinomial" className="space-y-3 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-stone-800">Cálculo complementar (Polinomial)</h4>
                      <p className="text-xs text-stone-500">
                        {polinomialAutomatico
                          ? 'Com SMP acima de 6,3 o Polinomial é calculado automaticamente.'
                          : 'Com SMP até 6,3, marque se quiser ver o Polinomial como valor complementar.'}
                      </p>
                    </div>
                    {!polinomialAutomatico ? (
                      <label className="flex cursor-pointer items-center gap-3 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700">
                        <input
                          type="checkbox"
                          {...register('calcular_polinomial')}
                          className="h-4 w-4 rounded accent-green-600"
                        />
                        Calcular também o Polinomial
                      </label>
                    ) : null}
                  </div>
                  {isPolinomial ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {!moJaExibidaFora ? (
                        <CampoNumerico label="MO (%) *" name="MO" min={0} max={100} placeholder="Ex: 2,5" register={register} error={errors.MO} />
                      ) : null}
                      <CampoNumerico label="Al trocável (cmolc/dm³) *" name="Al_trocavel" min={0} placeholder="Ex: 0,5" register={register} error={errors.Al_trocavel} />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Bloco B1 — Reaplicação SMP / Saturação por Bases */}
              {isReaplicacaoSMP ? (
                <div data-testid="bloco-saturacao-bases" className="space-y-3 pt-2">
                  <h4 className="text-sm font-bold text-stone-800">Saturação por bases</h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <CampoNumerico label="Saturação por bases atual — V (%) *" name="V_atual" min={0} max={100} placeholder="Ex: 55" register={register} error={errors.V_atual} />
                    {!ctcJaExibidaFora ? (
                      <CampoNumerico label="CTC pH7 (cmolc/dm³) *" name="CTC_pH7" min={0.1} placeholder="Ex: 10" register={register} error={errors.CTC_pH7} />
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Bloco B2 — Trava PD Consolidado */}
              {precisaAlSat ? (
                <div data-testid="bloco-necessidade-calagem" className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-stone-800">Necessidade de calagem no Plantio Direto</h4>
                    <p className="text-xs text-stone-500">
                      Com pH abaixo de 5,5 em Plantio Direto Consolidado, precisamos de mais um dado para avaliar se a calagem é necessária.
                    </p>
                  </div>

                  {!isReaplicacaoSMP ? (
                    <CampoNumerico
                      label="Saturação por bases atual — V (%) *"
                      name="V_atual"
                      min={0}
                      max={100}
                      placeholder="Ex: 66"
                      register={register}
                      error={errors.V_atual}
                      dica="Usado para avaliar se a calagem é necessária."
                    />
                  ) : null}

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setModoAlSat('direto')}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        modoAlSatAtual === 'direto' ? 'border-green-500 bg-green-50' : 'border-stone-200 bg-stone-50 hover:border-stone-300'
                      }`}
                    >
                      <div className="text-sm font-bold text-stone-800">Já tenho o Al saturação</div>
                      <div className="text-xs text-stone-500">Informar o valor diretamente</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoAlSat('calculado')}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        modoAlSatAtual === 'calculado' ? 'border-green-500 bg-green-50' : 'border-stone-200 bg-stone-50 hover:border-stone-300'
                      }`}
                    >
                      <div className="text-sm font-bold text-stone-800">Calcular a partir do Al trocável e da CTC</div>
                      <div className="text-xs text-stone-500">Al saturação = Al trocável ÷ CTC pH 7 × 100</div>
                    </button>
                  </div>

                  {modoAlSatAtual === 'direto' ? (
                    <CampoNumerico label="Al saturação (%) *" name="Al_sat" min={0} max={100} placeholder="Ex: 8" register={register} error={errors.Al_sat} />
                  ) : (
                    <div className="space-y-3">
                      {!isPolinomial ? (
                        <CampoNumerico label="Al trocável (cmolc/dm³) *" name="Al_trocavel" min={0} placeholder="Ex: 0,8" register={register} error={errors.Al_trocavel} />
                      ) : null}
                      {!isReaplicacaoSMP && !ctcJaExibidaFora ? (
                        <CampoNumerico label="CTC pH7 (cmolc/dm³) *" name="CTC_pH7" min={0.1} placeholder="Ex: 10" register={register} error={errors.CTC_pH7} />
                      ) : null}
                      {isPolinomial || isReaplicacaoSMP || ctcJaExibidaFora ? (
                        <p className="text-xs text-stone-500">
                          Usaremos os valores de Al trocável e CTC pH 7 já informados nesta tela.
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* ── Bloco: Monitoramento de Profundidade (PD Consolidado) ─── */}
          {calagemAtiva && isPDConsolidado ? (
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
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <CampoNumerico label="pH em água 10–20 cm *" name="monitoramento.pH_agua_10_20" min={3.5} max={8} placeholder="Ex: 4,8" register={register} error={errors.monitoramento?.pH_agua_10_20} />
                    <CampoNumerico label="Al saturação 10–20 cm (%) *" name="monitoramento.Al_sat_10_20" min={0} max={100} placeholder="Ex: 35" register={register} error={errors.monitoramento?.Al_sat_10_20} />
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {[
                      { name: 'monitoramento.disponibilidade_P_10_20_abaixo_critico' as const, label: 'Disponibilidade de P abaixo do crítico' },
                      { name: 'monitoramento.compactacao_restringindo_raiz' as const, label: 'Compactação restringindo raiz' },
                      { name: 'monitoramento.produtividade_abaixo_media' as const, label: 'Produtividade abaixo da média' },
                    ].map(({ name, label }) => (
                      <label key={name} className="flex items-start gap-3 text-sm text-stone-700">
                        <input type="checkbox" {...register(name)} className="mt-0.5 h-4 w-4 rounded accent-green-600" />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>

                  {restricao10_20 ? (
                    <div className="space-y-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-orange-900">Restrição detectada na camada 10–20 cm</h4>
                        <p className="text-xs text-orange-800">
                          Recomenda-se avaliação por engenheiro agrônomo antes de reiniciar o sistema plantio direto
                        </p>
                      </div>
                      <CampoNumerico label="SMP camada 10–20 cm *" name="SMP_10_20" min={4.4} max={7.1} placeholder="Ex: 4,8" register={register} error={errors.SMP_10_20} dica="Necessário para montar o SMP médio do fluxo PD com Restrição." />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* ── Bloco: Análise de Solo (adubação) ────────────────────── */}
          {adubacaoAtiva ? (
            <div className="space-y-5 rounded-2xl border border-stone-100 bg-stone-50 p-6">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-stone-500">
                <Landmark size={16} /> Análise de solo — Adubação
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <CampoNumerico label="Argila (%)" name="argila" register={register} error={errors.argila} placeholder="Ex: 35" min={0} max={99} />
                {!calagemAtiva ? (
                  <>
                    <CampoNumerico label="Matéria Orgânica (%)" name="MO" register={register} error={errors.MO} placeholder="Ex: 2.5" min={0.1} />
                    <CampoNumerico label="CTC a pH 7" name="CTC_pH7" register={register} error={errors.CTC_pH7} placeholder="Ex: 12" min={0.1} />
                  </>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <CampoNumerico label="Fósforo (P)" name="P" register={register} error={errors.P} placeholder="mg/dm³" />
                <SelectPadrao label="Método P" name="metodo_P" register={register} error={errors.metodo_P} options={METODOS_EXTRACAO} />
                <CampoNumerico label="Potássio (K)" name="K" register={register} error={errors.K} placeholder="mg/dm³" />
                <SelectPadrao label="Método K" name="metodo_K" register={register} error={errors.metodo_K} options={METODOS_EXTRACAO} />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <CampoNumerico label="Cálcio (Ca)" name="Ca" register={register} error={errors.Ca} placeholder="cmolc/dm³" />
                <CampoNumerico label="Magnésio (Mg)" name="Mg" register={register} error={errors.Mg} placeholder="cmolc/dm³" />
                <CampoNumerico label={`Enxofre (S) ${exigeS ? '*' : ''}`} name="S" register={register} error={errors.S} placeholder="mg/dm³" />
                {!calagemAtiva ? (
                  <CampoNumerico label="pH (Água)" name="pH_agua" register={register} error={errors.pH_agua} placeholder="Ex: 5.5" />
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <CampoNumerico label="Cobre (Cu)" name="Cu" register={register} error={errors.Cu} placeholder="mg/dm³" step="0.01" />
                <CampoNumerico label="Zinco (Zn)" name="Zn" register={register} error={errors.Zn} placeholder="mg/dm³" step="0.01" />
                <CampoNumerico label="Boro (B)" name="B" register={register} error={errors.B} placeholder="mg/dm³" step="0.01" />
                <CampoNumerico label="Manganês (Mn)" name="Mn" register={register} error={errors.Mn} placeholder="mg/dm³" step="0.01" />
              </div>
            </div>
          ) : null}

          {/* ── Bloco: Cultura e Manejo (adubação) ───────────────────── */}
          {adubacaoAtiva ? (
            <div className="space-y-5 rounded-2xl border border-stone-100 bg-stone-50 p-6">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-stone-500">
                <Sprout size={16} /> Cultura e Manejo
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <SelectPadrao
                  label="Cultura"
                  name="cultura"
                  register={register}
                  error={errors.cultura}
                  placeholder="Selecione..."
                  options={[
                    { value: 'soja', label: 'Soja' },
                    { value: 'milho', label: 'Milho' },
                    { value: 'milho_pipoca', label: 'Milho Pipoca' },
                    { value: 'aveia_branca', label: 'Aveia Branca' },
                    { value: 'aveia_preta', label: 'Aveia Preta' },
                    { value: 'cevada', label: 'Cevada' },
                    { value: 'trigo', label: 'Trigo' },
                    { value: 'triticale', label: 'Triticale' },
                    { value: 'centeio', label: 'Centeio' },
                    { value: 'feijao', label: 'Feijão' },
                    { value: 'canola', label: 'Canola' },
                    { value: 'girassol', label: 'Girassol' },
                    { value: 'sorgo', label: 'Sorgo' },
                    { value: 'ervilha', label: 'Ervilha' },
                    { value: 'ervilhaca', label: 'Ervilhaca' },
                    { value: 'nabo_forrageiro', label: 'Nabo Forrageiro' },
                  ]}
                />
                <CampoNumerico label="Rendimento (t/ha)" name="rendimento_esperado" register={register} error={errors.rendimento_esperado} placeholder="Ex: 4.5" />
                <SelectPadrao
                  label="Número do Cultivo"
                  name="num_cultivo"
                  register={register}
                  error={errors.num_cultivo}
                  options={[{ value: '1', label: '1º Cultivo' }, { value: '2', label: '2º Cultivo ou +' }]}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {derivarCultivoDoManejo ? (
                  <input type="hidden" {...register('sistema_cultivo')} />
                ) : (
                  <SelectPadrao
                    label="Sistema de Cultivo"
                    name="sistema_cultivo"
                    register={register}
                    error={errors.sistema_cultivo}
                    options={[{ value: 'Plantio Direto', label: 'Plantio Direto' }, { value: 'Convencional', label: 'Convencional' }]}
                  />
                )}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-600">Tipo de Correção (P e K)</label>
                  <select className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm outline-none focus:border-green-500" {...register('tipo_correcao')}>
                    <option value="Gradual">Gradual (Manutenção + Fração)</option>
                    <option value="Total" disabled={disableCorrecaoTotal}>
                      Total {disableCorrecaoTotal ? '(Argila <20 ou CTC <7.5)' : ''}
                    </option>
                  </select>
                  {errors.tipo_correcao ? <span className="text-xs font-medium text-red-500">{errors.tipo_correcao.message}</span> : null}
                </div>
              </div>

              {exigeCultAnt || watchCultura === 'milho' ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {exigeCultAnt ? (
                    <SelectPadrao
                      label="Cultura Antecedente *"
                      name="cultura_antecedente"
                      register={register}
                      error={errors.cultura_antecedente}
                      placeholder="Selecione..."
                      options={[
                        { value: 'Leguminosa', label: 'Leguminosa (Ex: Soja)' },
                        { value: 'Gramínea', label: 'Gramínea (Ex: Milho, Trigo)' },
                        ...(watchCultura === 'milho' ? [{ value: 'Consorciação ou Pousio', label: 'Consorciação ou Pousio' }] : []),
                      ]}
                    />
                  ) : null}
                  {watchCultura === 'milho' ? (
                    <CampoNumerico
                      label="Densidade de Plantas (plantas/ha)"
                      name="densidade_plantas"
                      register={register}
                      error={errors.densidade_plantas}
                      placeholder="Ex: 70000"
                      step="1000"
                      dica="Acima de 65.000 plantas/ha, aplica bônus de N a cada 5.000 plantas extras."
                    />
                  ) : null}
                </div>
              ) : null}

              {watchCultura === 'cevada' ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <SelectPadrao
                    label="Finalidade Cevada *"
                    name="finalidade_cevada"
                    register={register}
                    error={errors.finalidade_cevada}
                    placeholder="Selecione..."
                    options={[
                      { value: 'cervejeira_malte_unico', label: 'Cervejeira (Malte Único)' },
                      { value: 'malte_especial', label: 'Cervejeira (Malte Especial)' },
                      { value: 'outra', label: 'Outra finalidade' },
                    ]}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {/* ── Termos de Uso ─────────────────────────────────────────── */}
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

          {/* ── Botão Calcular ────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={loadingCalagem || loadingAdubacao}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-4 font-semibold text-white shadow-lg transition-all hover:bg-stone-800 disabled:bg-stone-300"
          >
            {loadingCalagem || loadingAdubacao ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Processando...
              </>
            ) : (
              <>{labelBotaoCalcular} <ArrowRight size={16} /></>
            )}
          </button>
        </form>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          COLUNA DIREITA — Resultados
      ════════════════════════════════════════════════════════════════ */}
      <div className="flex w-full flex-col gap-6 border-t border-white/60 bg-gradient-to-br from-[#E8F3E8] to-[#F4F6F0] p-8 lg:w-2/5 lg:border-l lg:border-t-0 lg:p-12">
        {nenhumResultadoAinda ? (
          <div className="flex h-full flex-col items-center justify-center space-y-4 text-center opacity-60">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-stone-200/50">
              <Layers size={32} className="text-stone-400" />
            </div>
            <h3 className="text-xl font-semibold">Aguardando Dados</h3>
            <p className="max-w-xs text-sm text-stone-400">
              Preencha o formulário e clique em calcular para ver {modo === 'AMBOS' ? 'os dois diagnósticos' : 'o diagnóstico'}.
            </p>
          </div>
        ) : (
          <>
            {/* ── Resultado: Calagem ─────────────────────────────────── */}
            {calagemAtiva ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                  <Leaf size={14} /> Calagem
                </div>

                {loadingCalagem ? (
                  <div className="flex items-center justify-center rounded-[1.5rem] bg-white/70 p-8 shadow-sm">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-green-600" />
                  </div>
                ) : erroCalagem ? (
                  <div className="rounded-[1.5rem] border border-red-200 bg-white p-6 shadow-xl">
                    <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-red-600">
                      <AlertCircle size={14} /> Não foi possível calcular
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-stone-700">{erroCalagem}</p>
                  </div>
                ) : resultadoCalagem ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-stone-800">
                      <CheckCircle2 size={18} className="text-green-500" /> {tituloResultadoCalagem}
                    </div>

                    {resultadoCalagem.aplicar_calcario ? (
                      <div className="rounded-[1.5rem] bg-white p-6 text-center shadow-xl">
                        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-stone-400">Dose para Produto Real</p>
                        <div className="mb-1 flex items-baseline justify-center gap-2">
                          <span className="bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-4xl font-extrabold text-transparent">
                            {resultadoCalagem.NC_ajustada?.toFixed(2) ?? '—'}
                          </span>
                          <span className="text-lg font-bold text-green-700">t/ha</span>
                        </div>
                        <p className="text-xs text-stone-400">PRNT corrigido</p>
                      </div>
                    ) : (
                      <div className="rounded-[1.5rem] border border-stone-200 bg-white p-6 text-center shadow-xl">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-400">Situação Atual</p>
                        <p className="text-lg font-bold text-stone-800">Sem recomendação de aplicação</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'NC final', value: resultadoCalagem.NC_final?.toFixed(2), unit: 't/ha' },
                        { label: 'Método', value: resultadoCalagem.metodo_calc_roteado, unit: null },
                      ].map(({ label, value, unit }) => (
                        <div key={label} className="rounded-xl bg-white/80 p-3 text-center shadow-sm">
                          <p className="mb-1 text-[10px] text-stone-400">{label}</p>
                          <p className="text-sm font-bold text-stone-700">
                            {value ?? '—'}{unit ? <span className="text-xs font-normal"> {unit}</span> : null}
                          </p>
                        </div>
                      ))}
                    </div>

                    {resultadoCalagem.NC_polinomial !== undefined ? (
                      <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-800">
                        <strong>Complementar — Polinomial:</strong> {resultadoCalagem.NC_polinomial.toFixed(2)} t/ha
                      </div>
                    ) : null}

                    {resultadoCalagem.NC_vb !== undefined ? (
                      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
                        <strong>Referência — Saturação por Bases:</strong> {resultadoCalagem.NC_vb.toFixed(2)} t/ha
                      </div>
                    ) : null}

                    {resultadoCalagem.nota_tecnica ? (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                        {resultadoCalagem.nota_tecnica}
                      </div>
                    ) : null}

                    {resultadoCalagem.acao_requerida ? (
                      <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-900">
                        <strong>Ação requerida:</strong> {resultadoCalagem.acao_requerida}
                      </div>
                    ) : null}

                    {resultadoCalagem.alertas?.length > 0 ? (
                      <div className="space-y-2">
                        {resultadoCalagem.alertas.map((alerta, i) => (
                          <div key={`${alerta}-${i}`} className="flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 p-2 text-xs text-orange-800">
                            <AlertCircle size={12} className="mt-0.5 shrink-0" />
                            <span>{alerta}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          gerarPDFRelatorio({
                            dadosEntrada: CalagemSchema.parse(getValues()),
                            resultado: resultadoCalagem,
                            localizacao: { uf: ufSelecionada, cidade: cidadeSelecionada },
                          });
                        }}
                        className="flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-white py-2.5 text-sm font-semibold text-green-700 shadow-sm hover:bg-green-50"
                      >
                        <FileDown size={16} /> PDF
                      </button>
                      <button
                        type="button"
                        onClick={handleTentarSalvarCalagem}
                        className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold shadow-sm transition-all ${
                          salvoCalagem ? 'bg-green-500 text-white' : 'border border-stone-200 bg-white hover:bg-stone-50'
                        }`}
                      >
                        {salvoCalagem ? <><Check size={16} /> Salvo!</> : <><Save size={16} /> Salvar</>}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {calagemAtiva && adubacaoAtiva ? <div className="h-px bg-stone-300/60" /> : null}

            {/* ── Resultado: Adubação ────────────────────────────────── */}
            {adubacaoAtiva ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                  <Sprout size={14} /> Adubação
                </div>

                {loadingAdubacao ? (
                  <div className="flex items-center justify-center rounded-[1.5rem] bg-white/70 p-8 shadow-sm">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-green-600" />
                  </div>
                ) : erroAdubacao ? (
                  <div className="rounded-[1.5rem] border border-red-200 bg-white p-6 shadow-xl">
                    <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-red-600">
                      <AlertCircle size={14} /> Não foi possível calcular
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-stone-700">{erroAdubacao}</p>
                  </div>
                ) : resultadoAdubacao ? (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="rounded-[1.5rem] bg-white p-5 text-center shadow-xl">
                        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-stone-400">Nitrogênio (N)</p>
                        <div className="mb-1 flex items-baseline justify-center gap-2">
                          <span className="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-3xl font-extrabold text-transparent">
                            {resultadoAdubacao.recomendacao.n.dose_total_kg_ha}
                          </span>
                          <span className="text-sm font-bold text-emerald-700">kg/ha</span>
                        </div>
                        <p className="text-[11px] font-semibold text-stone-400">{resultadoAdubacao.recomendacao.n.tipo}</p>
                      </div>

                      <div className="rounded-[1.5rem] bg-white p-5 text-center shadow-xl">
                        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-stone-400">Fósforo (P₂O₅)</p>
                        <div className="mb-1 flex items-baseline justify-center gap-2">
                          <span className="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-3xl font-extrabold text-transparent">
                            {resultadoAdubacao.recomendacao.p2o5.dose_total_kg_ha}
                          </span>
                          <span className="text-sm font-bold text-emerald-700">kg/ha</span>
                        </div>
                        <p className="text-[11px] font-semibold text-stone-400">{resultadoAdubacao.recomendacao.p2o5.tipo_adubacao}</p>
                      </div>

                      <div className="rounded-[1.5rem] bg-white p-5 text-center shadow-xl">
                        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-stone-400">Potássio (K₂O)</p>
                        <div className="mb-1 flex items-baseline justify-center gap-2">
                          <span className="bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-3xl font-extrabold text-transparent">
                            {resultadoAdubacao.recomendacao.k2o.dose_total_kg_ha}
                          </span>
                          <span className="text-sm font-bold text-emerald-700">kg/ha</span>
                        </div>
                        <p className="text-[11px] font-semibold text-stone-400">{resultadoAdubacao.recomendacao.k2o.tipo_adubacao}</p>
                        <div className="mt-2 flex justify-center gap-4 border-t border-stone-100 pt-2">
                          <span className="text-[10px] font-bold uppercase text-stone-500">
                            Linha: <strong className="text-emerald-700">{resultadoAdubacao.recomendacao.k2o.k2o_semeadura_kg_ha}</strong> kg/ha
                          </span>
                          <span className="text-[10px] font-bold uppercase text-stone-500">
                            Lanço: <strong className="text-emerald-700">{resultadoAdubacao.recomendacao.k2o.k2o_complementar_kg_ha}</strong> kg/ha
                          </span>
                        </div>
                      </div>
                    </div>

                    {resultadoAdubacao.alertas?.length > 0 ? (
                      <div className="space-y-2">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {resultadoAdubacao.alertas.map((alerta: any, idx: number) => (
                          <div
                            key={idx}
                            className={`flex flex-col gap-1 rounded-xl border p-3 text-xs ${
                              alerta.nivel === 'AVISO' ? 'border-orange-200 bg-orange-50 text-orange-800' : 'border-blue-200 bg-blue-50 text-blue-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-80">
                              <ShieldCheck size={12} /> {alerta.nivel}
                            </div>
                            <span className="font-medium leading-relaxed">{alerta.mensagem}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          gerarPDFRelatorioAdubacao({
                            dadosEntrada: resultadoAdubacao.dadosEntrada,
                            resultado: resultadoAdubacao,
                          });
                        }}
                        className="flex items-center justify-center gap-2 rounded-xl border-2 border-green-600 bg-transparent py-2.5 text-sm font-bold text-green-600 shadow-sm transition-all hover:bg-green-50 active:scale-95"
                      >
                        <FileDown size={16} /> PDF
                      </button>
                      <button
                        type="button"
                        onClick={handleTentarSalvarAdubacao}
                        className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold shadow-sm transition-all active:scale-95 ${
                          salvoAdubacao ? 'bg-green-500 text-white' : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {salvoAdubacao ? <><CheckCircle2 size={16} /> Salvo!</> : <><Save size={16} /> Salvar</>}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
