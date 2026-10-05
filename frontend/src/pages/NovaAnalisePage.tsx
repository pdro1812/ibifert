import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Plus, TableProperties, Tractor, MapPin, AlertCircle, CheckCircle2, Leaf, Sprout, FlaskConical, Layers } from 'lucide-react';
import { getFazendas, postFazenda, postTalhao, postAnalisesBulk, postAdubacaoBulk } from '../services/api';
import { ibgeService, type Estado, type Municipio } from '../services/ibge';
import { CalagemSchema, precisaAlSatPDConsolidado, rotearMetodoCalagem, type SistemaManejo } from '../schemas/calagemSchema';
import { AdubacaoSchema } from '../schemas/adubacaoSchema';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Talhao {
  id: string;
  nome: string;
  cultura: string;
}

interface Fazenda {
  id: string;
  nome: string;
  municipio: string;
  uf: string;
  talhoes: Talhao[];
}

export interface LinhaAmostra {
  id: string;
  talhao_id: string;
  identificacao: string;
  
  // Compartilhados
  ph: string;
  mo: string;
  ctc: string;

  // Calagem
  smp: string;
  al_trocavel: string;
  v_atual: string;
  al_sat: string;

  // Adubacao
  argila: string;
  p: string;
  k: string;
  ca: string;
  mg: string;
  s: string;
  cu: string;
  zn: string;
  b: string;
  mn: string;
}

export type ModoInsercao = 'CALAGEM' | 'ADUBACAO' | 'AMBOS';

// ─── Helpers Dinâmicos ────────────────────────────────────────────────────────

type ConfigGlobais = Record<string, unknown>;

const CAMPOS_CALAGEM: Array<keyof LinhaAmostra> = ['smp', 'al_trocavel', 'v_atual', 'al_sat'];
const CAMPOS_ADUBACAO: Array<keyof LinhaAmostra> = ['argila', 'p', 'k', 'ca', 'mg', 's', 'cu', 'zn', 'b', 'mn'];

function isCellEnabledCalagem(campo: keyof LinhaAmostra, linha: LinhaAmostra, configGlobais: ConfigGlobais): boolean {
  if (['ph', 'smp'].includes(campo)) return true;

  const phVal = Number(linha.ph);
  const smpVal = Number(linha.smp);
  // SMP > 6,3 calcula o Polinomial automaticamente; abaixo disso, só se o
  // lote marcar "Calcular também o Polinomial".
  const polinomial = rotearMetodoCalagem(smpVal) === 'POLINOMIAL' || configGlobais.calcularPolinomial === true;

  if (['mo', 'al_trocavel'].includes(campo)) {
    return polinomial;
  }

  if (['v_atual', 'ctc'].includes(campo)) {
    // Toda calagem é tratada como reaplicação (não é mais uma opção do
    // formulário) — ver docs/diagnostico-primeira-calagem-metodo-smp.md.
    const isReaplicacao = rotearMetodoCalagem(smpVal) === 'SMP';
    const precisaTravaPDConsolidado =
      configGlobais.sistemaManejo === 'PD_CONSOLIDADO' && phVal < 5.5;
    return isReaplicacao || (campo === 'v_atual' && precisaTravaPDConsolidado);
  }

  if (campo === 'al_sat') {
    return precisaAlSatPDConsolidado(configGlobais.sistemaManejo as SistemaManejo | undefined, phVal);
  }
  return false;
}

function isCellEnabledAdubacao(campo: keyof LinhaAmostra, configGlobais: ConfigGlobais): boolean {
  if (campo === 's') {
    const culturasComS = ['soja', 'ervilha', 'ervilhaca', 'canola', 'nabo_forrageiro'];
    return culturasComS.includes(configGlobais.cultura as string);
  }
  return true; // Demais sempre ativos
}

export function isCellEnabled(modo: ModoInsercao, campo: keyof LinhaAmostra, linha: LinhaAmostra, configGlobais: ConfigGlobais): boolean {
  if (modo === 'CALAGEM') return isCellEnabledCalagem(campo, linha, configGlobais);
  if (modo === 'ADUBACAO') return isCellEnabledAdubacao(campo, configGlobais);

  // AMBOS: colunas específicas seguem a regra do próprio módulo; as
  // compartilhadas (pH, MO, CTC) ficam ativas se qualquer módulo as exigir.
  if (CAMPOS_CALAGEM.includes(campo)) return isCellEnabledCalagem(campo, linha, configGlobais);
  if (CAMPOS_ADUBACAO.includes(campo)) return isCellEnabledAdubacao(campo, configGlobais);
  return isCellEnabledCalagem(campo, linha, configGlobais) || isCellEnabledAdubacao(campo, configGlobais);
}

const COLS_CALAGEM: Array<{ key: keyof LinhaAmostra; label: string; placeholder: string }> = [
  { key: 'ph',          label: 'pH',         placeholder: '5.2' },
  { key: 'smp',         label: 'SMP',        placeholder: '5.5' },
  { key: 'mo',          label: 'MO (%)',     placeholder: '2.5' },
  { key: 'al_trocavel', label: 'Al (cmolc)', placeholder: '0.5' },
  { key: 'v_atual',     label: 'V (%)',      placeholder: '55'  },
  { key: 'ctc',         label: 'CTC',        placeholder: '10'  },
  { key: 'al_sat',      label: 'Al saturação (%)', placeholder: '15'  },
];

const COLS_ADUBACAO: Array<{ key: keyof LinhaAmostra; label: string; placeholder: string }> = [
  { key: 'argila', label: 'Argila (%)', placeholder: '35' },
  { key: 'mo',     label: 'MO (%)',     placeholder: '2.5' },
  { key: 'ctc',    label: 'CTC',        placeholder: '10' },
  { key: 'p',      label: 'P',          placeholder: 'mg/dm³' },
  { key: 'k',      label: 'K',          placeholder: 'mg/dm³' },
  { key: 'ca',     label: 'Ca',         placeholder: 'cmolc' },
  { key: 'mg',     label: 'Mg',         placeholder: 'cmolc' },
  { key: 'ph',     label: 'pH H2O',     placeholder: '5.5' },
  { key: 's',      label: 'S',          placeholder: 'mg/dm³' },
  { key: 'cu',     label: 'Cu',         placeholder: 'mg' },
  { key: 'zn',     label: 'Zn',         placeholder: 'mg' },
  { key: 'b',      label: 'B',          placeholder: 'mg' },
  { key: 'mn',     label: 'Mn',         placeholder: 'mg' },
];

type Coluna = { key: keyof LinhaAmostra; label: string; placeholder: string };

// Modo AMBOS: colunas compartilhadas uma única vez, depois as de cada módulo.
const COLS_AMBOS_GRUPOS: Array<{ nome: string; cor: string; colunas: Coluna[] }> = [
  {
    nome: 'Compartilhados',
    cor: 'text-stone-500',
    colunas: [
      { key: 'ph',  label: 'pH',     placeholder: '5.2' },
      { key: 'mo',  label: 'MO (%)', placeholder: '2.5' },
      { key: 'ctc', label: 'CTC',    placeholder: '10'  },
    ],
  },
  {
    nome: 'Calagem',
    cor: 'text-green-600',
    colunas: COLS_CALAGEM.filter((c) => CAMPOS_CALAGEM.includes(c.key)),
  },
  {
    nome: 'Adubação',
    cor: 'text-emerald-600',
    colunas: COLS_ADUBACAO.filter((c) => CAMPOS_ADUBACAO.includes(c.key)),
  },
];

const GERAR_LINHA_VAZIA = (talhao_id: string, index: number): LinhaAmostra => ({
  id: Math.random().toString(36).substr(2, 9),
  talhao_id,
  identificacao: `Amostra ${index}`,
  ph: '', smp: '', mo: '', al_trocavel: '', v_atual: '', ctc: '', al_sat: '',
  argila: '', p: '', k: '', ca: '', mg: '', s: '', cu: '', zn: '', b: '', mn: ''
});

// ─── Page ─────────────────────────────────────────────────────────────────────

export function NovaAnalisePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateTalhaoId = location.state?.talhaoId as string | undefined;

  // ── Data state
  const [modo, setModo] = useState<ModoInsercao>('AMBOS');
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [fazendaId, setFazendaId] = useState('');
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erroEnvio, setErroEnvio] = useState('');
  const [errosGlobais, setErrosGlobais] = useState<Record<string, Record<string, string>>>({});
  // Linhas já gravadas por módulo (ids das linhas) — numa falha parcial, o
  // reenvio manda só o que ainda não foi salvo, para não duplicar registros.
  const [salvas, setSalvas] = useState<{ calagem: string[]; adubacao: string[] }>({ calagem: [], adubacao: [] });
  const [resumoEnvio, setResumoEnvio] = useState<string[]>([]);

  const mostraCalagem = modo !== 'ADUBACAO';
  const mostraAdubacao = modo !== 'CALAGEM';

  const trocarModo = (novo: ModoInsercao) => {
    setModo(novo);
    setSalvas({ calagem: [], adubacao: [] });
    setResumoEnvio([]);
    setErrosGlobais({});
  };

  // ── Config Globais: Calagem
  const [sistemaManejo, setSistemaManejo] = useState<'CONVENCIONAL' | 'PD_IMPLANTACAO' | 'PD_CONSOLIDADO'>('CONVENCIONAL');
  const [prnt, setPrnt] = useState('90');
  const [calcularPolinomial, setCalcularPolinomial] = useState(false);

  // ── Config Globais: Adubacao
  const [cultura, setCultura] = useState('soja');
  const [rendimento, setRendimento] = useState('4.5');
  const [numCultivo, setNumCultivo] = useState('1');
  const sistemaCultivo = 'Plantio Direto';
  const [tipoCorrecao, setTipoCorrecao] = useState('Gradual');
  const [metodoP, setMetodoP] = useState('Mehlich-1');
  const [metodoK, setMetodoK] = useState('Mehlich-1');
  const [culturaAntecedente, setCulturaAntecedente] = useState('Gramínea');
  const [finalidadeCevada, setFinalidadeCevada] = useState('cervejeira_malte_unico');

  const configGlobais = {
    ...(mostraCalagem ? { sistemaManejo, prnt, calcularPolinomial } : {}),
    ...(mostraAdubacao
      ? { cultura, rendimento, numCultivo, sistemaCultivo, tipoCorrecao, metodoP, metodoK, culturaAntecedente, finalidadeCevada }
      : {}),
  };

  // ── Amostras
  const [linhas, setLinhas] = useState<LinhaAmostra[]>([]);

  // ── Carregamento Inicial
  useEffect(() => {
    getFazendas()
      .then((data) => {
        setFazendas(data);
        if (data.length > 0) {
          if (stateTalhaoId) {
            const fazendaDesteTalhao = data.find((f: Fazenda) => f.talhoes.some((t: Talhao) => t.id === stateTalhaoId));
            if (fazendaDesteTalhao) {
              setFazendaId(fazendaDesteTalhao.id);
              setLinhas([GERAR_LINHA_VAZIA(stateTalhaoId, 1)]);
              return;
            }
          }
          setFazendaId(data[0].id);
          setLinhas([GERAR_LINHA_VAZIA('', 1)]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [stateTalhaoId]);

  const fazendaSelecionada = fazendas.find(f => f.id === fazendaId);
  const talhoesDisponiveis = fazendaSelecionada?.talhoes ?? [];

  // ── Criação rápida de fazenda (botão "+" ao lado do seletor de fazenda)
  const [modalFazendaOpen, setModalFazendaOpen] = useState(false);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [novaFazendaNome, setNovaFazendaNome] = useState('');
  const [novaFazendaUf, setNovaFazendaUf] = useState('RS');
  const [novaFazendaMunicipio, setNovaFazendaMunicipio] = useState('');
  const [salvandoFazenda, setSalvandoFazenda] = useState(false);

  useEffect(() => {
    if (modalFazendaOpen && estados.length === 0) ibgeService.getEstados().then(setEstados).catch(console.error);
  }, [modalFazendaOpen, estados.length]);

  useEffect(() => {
    if (modalFazendaOpen && novaFazendaUf) ibgeService.getMunicipios(novaFazendaUf).then(setMunicipios).catch(console.error);
  }, [modalFazendaOpen, novaFazendaUf]);

  const salvarNovaFazenda = async () => {
    if (!municipios.some((m) => m.nome === novaFazendaMunicipio)) {
      alert('Por favor, selecione uma cidade válida da lista.');
      return;
    }
    setSalvandoFazenda(true);
    try {
      const nova = await postFazenda({ nome: novaFazendaNome.trim(), uf: novaFazendaUf, municipio: novaFazendaMunicipio });
      setFazendas((prev) => [...prev, { ...nova, talhoes: [] }]);
      setFazendaId(nova.id);
      setLinhas((prev) => (prev.length ? prev.map((l) => ({ ...l, talhao_id: '' })) : [GERAR_LINHA_VAZIA('', 1)]));
      setModalFazendaOpen(false);
      setNovaFazendaNome('');
      setNovaFazendaMunicipio('');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar fazenda.');
    } finally {
      setSalvandoFazenda(false);
    }
  };

  // ── Criação rápida de talhão (botão "+" na coluna Talhão Vinculado)
  const [novoTalhaoLinhaId, setNovoTalhaoLinhaId] = useState<string | null>(null);
  const [novoTalhaoNome, setNovoTalhaoNome] = useState('');
  const [novoTalhaoCultura, setNovoTalhaoCultura] = useState('Soja');
  const [salvandoTalhao, setSalvandoTalhao] = useState(false);

  const salvarNovoTalhao = async () => {
    if (!novoTalhaoNome.trim() || !fazendaId || !novoTalhaoLinhaId) return;
    setSalvandoTalhao(true);
    try {
      const novo = await postTalhao(fazendaId, { nome: novoTalhaoNome.trim(), cultura: novoTalhaoCultura });
      setFazendas((prev) => prev.map((f) => (f.id === fazendaId ? { ...f, talhoes: [...f.talhoes, novo] } : f)));
      setLinhas((prev) => prev.map((l) => (l.id === novoTalhaoLinhaId ? { ...l, talhao_id: novo.id } : l)));
      setNovoTalhaoLinhaId(null);
      setNovoTalhaoNome('');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar talhão.');
    } finally {
      setSalvandoTalhao(false);
    }
  };

  // ── Handlers
  const adicionarLinha = () => {
    setLinhas((prev) => [...prev, GERAR_LINHA_VAZIA(prev[prev.length - 1]?.talhao_id || '', prev.length + 1)]);
  };

  const atualizarCampo = (id: string, campo: keyof LinhaAmostra, valor: string) => {
    setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)));
    // Limpa erro ao digitar
    if (errosGlobais[id]?.[campo]) {
      setErrosGlobais((prev) => {
        const novos = { ...prev };
        if (novos[id]) {
          delete novos[id][campo];
        }
        return novos;
      });
    }
  };

  const removerLinha = (id: string) => {
    if (linhas.length === 1) return;
    setLinhas((prev) => prev.filter((l) => l.id !== id));
  };

  const preencherExemplo = () => {
    const linha = GERAR_LINHA_VAZIA(talhoesDisponiveis[0]?.id || '', 1);

    if (mostraCalagem) {
      linha.ph = '5.2';
      linha.smp = '5.5';
      linha.mo = '2.5';
      linha.al_trocavel = '0.5';
      linha.v_atual = '55';
      linha.ctc = '10';
      linha.al_sat = '15';

      setSistemaManejo('CONVENCIONAL');
      setPrnt('90');
    }

    if (mostraAdubacao) {
      linha.argila = '40';
      linha.p = '5';
      linha.k = '80';
      linha.ca = '4.5';
      linha.mg = '2.5';
      linha.s = '15';
      linha.cu = '1';
      linha.zn = '2';
      linha.b = '0.5';
      linha.mn = '5';
      if (!mostraCalagem) {
        linha.ph = '5.8';
        linha.mo = '3.5';
        linha.ctc = '12';
      }

      setCultura('soja');
      setRendimento('4.5');
    }

    setLinhas([linha]);
    setErrosGlobais({});
  };

  const numOuUndef = (v: string) => (v !== '' ? Number(v) : undefined);

  const montarPayloadCalagem = (l: LinhaAmostra) => ({
    sistema_manejo: sistemaManejo,
    // Não é mais uma opção do formulário — sempre reaplicação
    // (ver docs/diagnostico-primeira-calagem-metodo-smp.md).
    primeira_calagem: false,
    PRNT: prnt ? Number(prnt) : undefined,
    pH_agua: numOuUndef(l.ph),
    SMP: numOuUndef(l.smp),
    MO: numOuUndef(l.mo),
    Al_trocavel: numOuUndef(l.al_trocavel),
    V_atual: numOuUndef(l.v_atual),
    CTC_pH7: numOuUndef(l.ctc),
    Al_sat: numOuUndef(l.al_sat),
    calcular_polinomial: calcularPolinomial ? true : undefined,
  });

  const montarPayloadAdubacao = (l: LinhaAmostra) => ({
    cultura,
    rendimento_esperado: rendimento ? Number(rendimento) : undefined,
    num_cultivo: numCultivo,
    sistema_cultivo: sistemaCultivo,
    tipo_correcao: tipoCorrecao,
    cultura_antecedente: culturaAntecedente,
    finalidade_cevada: cultura === 'cevada' ? finalidadeCevada : undefined,
    metodo_P: metodoP,
    metodo_K: metodoK,
    argila: numOuUndef(l.argila),
    MO: numOuUndef(l.mo),
    CTC_pH7: numOuUndef(l.ctc),
    P: numOuUndef(l.p),
    K: numOuUndef(l.k),
    Ca: numOuUndef(l.ca),
    Mg: numOuUndef(l.mg),
    pH_agua: numOuUndef(l.ph),
    S: numOuUndef(l.s),
    Cu: numOuUndef(l.cu),
    Zn: numOuUndef(l.zn),
    B: numOuUndef(l.b),
    Mn: numOuUndef(l.mn),
  });

  const handleSalvarTudo = async () => {
    setErrosGlobais({});
    setResumoEnvio([]);

    if (!fazendaSelecionada) {
      alert('Selecione uma fazenda para prosseguir.');
      return;
    }

    // Filtra linhas que têm pelo menos um dado preenchido ou talhão
    const amostrasParaProcessar = linhas.filter(l =>
      l.talhao_id || Object.keys(l).some(k => !['id', 'identificacao', 'talhao_id'].includes(k) && l[k as keyof LinhaAmostra] !== '')
    );

    if (amostrasParaProcessar.length === 0) {
      setErroEnvio('Preencha pelo menos uma amostra para processar o lote.');
      setTimeout(() => setErroEnvio(''), 5000);
      return;
    }

    type Pendente = { rowId: string; identificacao: string; payload: any };
    const novosErros: Record<string, Record<string, string>> = {};
    let temErro = false;
    const gruposCalagem: Record<string, Pendente[]> = {};
    const gruposAdubacao: Record<string, Pendente[]> = {};

    amostrasParaProcessar.forEach(l => {
      novosErros[l.id] = {};

      if (!l.talhao_id) {
        novosErros[l.id]['talhao_id'] = "Talhão é obrigatório";
        temErro = true;
      }

      let calagemOk = true;
      let adubacaoOk = true;
      const payloadCalagem = mostraCalagem ? montarPayloadCalagem(l) : null;
      const payloadAdubacao = mostraAdubacao ? montarPayloadAdubacao(l) : null;

      if (payloadCalagem) {
        const parseResult = CalagemSchema.safeParse(payloadCalagem);
        if (!parseResult.success) {
          calagemOk = false;
          const mapa: Record<string, string> = {
            pH_agua: 'ph', SMP: 'smp', MO: 'mo', Al_trocavel: 'al_trocavel',
            V_atual: 'v_atual', CTC_pH7: 'ctc', Al_sat: 'al_sat',
          };
          (parseResult.error?.issues || []).forEach(err => {
            const path = err.path[0] as string;
            novosErros[l.id][mapa[path] ?? path] = err.message;
          });
        }
      }

      if (payloadAdubacao) {
        const parseResult = AdubacaoSchema.safeParse(payloadAdubacao);
        if (!parseResult.success) {
          adubacaoOk = false;
          (parseResult.error?.issues || []).forEach(err => {
            const path = err.path[0] as string;
            let key = path.toLowerCase();
            if (path === 'CTC_pH7') key = 'ctc';
            if (path === 'pH_agua') key = 'ph';
            // No modo AMBOS, o erro de calagem (já registrado) tem prioridade na célula compartilhada
            if (!novosErros[l.id][key]) novosErros[l.id][key] = err.message;
          });
        }
      }

      if (!calagemOk || !adubacaoOk) {
        temErro = true;
        return;
      }

      if (!l.talhao_id) return;

      if (payloadCalagem && !salvas.calagem.includes(l.id)) {
        (gruposCalagem[l.talhao_id] ??= []).push({
          rowId: l.id,
          identificacao: l.identificacao,
          payload: { ...payloadCalagem, identificacao: l.identificacao, modo: 'avancado' },
        });
      }

      if (payloadAdubacao && !salvas.adubacao.includes(l.id)) {
        (gruposAdubacao[l.talhao_id] ??= []).push({
          rowId: l.id,
          identificacao: l.identificacao,
          payload: {
            ...payloadAdubacao,
            identificacao: l.identificacao,
            uf: fazendaSelecionada.uf,
            cidade: fazendaSelecionada.municipio,
          },
        });
      }
    });

    if (temErro) {
      setErrosGlobais(novosErros);
      setErroEnvio('Campos em vermelho possuem erros ou são obrigatórios.');
      setTimeout(() => setErroEnvio(''), 5000);
      return;
    }

    setProcessando(true);
    try {
      const novasSalvas = { calagem: [...salvas.calagem], adubacao: [...salvas.adubacao] };
      const falhasCalagem: string[] = [];
      const falhasAdubacao: string[] = [];
      let okCalagem = 0;
      let okAdubacao = 0;

      const enviarCalagem = Promise.allSettled(
        Object.entries(gruposCalagem).map(async ([tId, itens]) => {
          try {
            await postAnalisesBulk({
              talhao_id: tId,
              uf: fazendaSelecionada.uf,
              cidade: fazendaSelecionada.municipio,
              amostras: itens.map(i => i.payload),
            });
            okCalagem += itens.length;
            itens.forEach(i => novasSalvas.calagem.push(i.rowId));
          } catch (err) {
            console.error(err);
            itens.forEach(i => falhasCalagem.push(i.identificacao));
          }
        })
      );

      const enviarAdubacao = Promise.allSettled(
        Object.entries(gruposAdubacao).map(async ([tId, itens]) => {
          try {
            const res = await postAdubacaoBulk({ talhao_id: tId, amostras: itens.map(i => i.payload) });
            // O bulk responde 200 mesmo com falhas individuais — conferir cada amostra.
            const resultados: Array<{ sucesso: boolean; erro?: string }> = res?.resultados ?? [];
            itens.forEach((item, idx) => {
              if (resultados[idx]?.sucesso) {
                okAdubacao += 1;
                novasSalvas.adubacao.push(item.rowId);
              } else {
                falhasAdubacao.push(item.identificacao);
              }
            });
          } catch (err) {
            console.error(err);
            itens.forEach(i => falhasAdubacao.push(i.identificacao));
          }
        })
      );

      await Promise.all([enviarCalagem, enviarAdubacao]);
      setSalvas(novasSalvas);

      const resumo: string[] = [];
      if (mostraCalagem && (okCalagem > 0 || falhasCalagem.length > 0)) {
        resumo.push(
          falhasCalagem.length === 0
            ? `Calagem: ${okCalagem} amostra(s) salva(s).`
            : `Calagem: ${okCalagem} salva(s), ${falhasCalagem.length} com erro (${falhasCalagem.join(', ')}).`
        );
      }
      if (mostraAdubacao && (okAdubacao > 0 || falhasAdubacao.length > 0)) {
        resumo.push(
          falhasAdubacao.length === 0
            ? `Adubação: ${okAdubacao} amostra(s) salva(s).`
            : `Adubação: ${okAdubacao} salva(s), ${falhasAdubacao.length} com erro (${falhasAdubacao.join(', ')}).`
        );
      }

      if (falhasCalagem.length === 0 && falhasAdubacao.length === 0) {
        setSucesso(true);
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        resumo.push('Clique em "Salvar" novamente: só o que falhou será reenviado.');
        setResumoEnvio(resumo);
      }
    } finally {
      setProcessando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-green-600" />
      </div>
    );
  }

  const gruposColunas = modo === 'AMBOS'
    ? COLS_AMBOS_GRUPOS
    : [{ nome: '', cor: '', colunas: modo === 'CALAGEM' ? COLS_CALAGEM : COLS_ADUBACAO }];
  const colunas = gruposColunas.flatMap((g) => g.colunas);
  const exigeCultAnt = ['aveia_branca', 'aveia_preta', 'centeio', 'cevada', 'trigo', 'triticale', 'milho'].includes(cultura);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-[1400px] overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-xl mx-auto">
      {/* Header */}
      <div className="bg-stone-900 p-8 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-3 text-2xl font-bold">
              <TableProperties className={modo === 'ADUBACAO' ? 'text-emerald-400' : modo === 'AMBOS' ? 'text-teal-400' : 'text-green-400'} />
              Inserção Rápida de Lotes
            </h2>
            <p className="mt-1 text-stone-400 text-sm">
              Cadastre múltiplas amostras de solo de uma só vez para processamento em massa.
            </p>
          </div>
          
          <div className="flex bg-stone-800 p-1 rounded-xl">
            <button
              onClick={() => trocarModo('CALAGEM')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                modo === 'CALAGEM' ? 'bg-green-500 text-white shadow-lg' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Leaf size={16} /> Calagem
            </button>
            <button
              onClick={() => trocarModo('ADUBACAO')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                modo === 'ADUBACAO' ? 'bg-emerald-500 text-white shadow-lg' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Sprout size={16} /> Adubação
            </button>
            <button
              onClick={() => trocarModo('AMBOS')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                modo === 'AMBOS' ? 'bg-teal-500 text-white shadow-lg' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Layers size={16} /> Calagem + Adubação
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {/* Contexto Global */}
        <div className="grid grid-cols-1 gap-6 rounded-2xl border border-stone-100 bg-stone-50 p-6 lg:grid-cols-4">
          
          {/* Localização (Ocupa 1 coluna) */}
          <div className="space-y-4 col-span-1 border-r border-stone-200 pr-6">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-stone-500">
              <MapPin size={16} /> Fazenda Principal
            </h3>
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-600">Selecione a Fazenda</label>
              <div className="flex items-center gap-2">
              <select 
                value={fazendaId}
                onChange={(e) => setFazendaId(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 shadow-sm"
              >
                {fazendas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
              <button
                type="button"
                title="Adicionar nova fazenda"
                onClick={() => setModalFazendaOpen(true)}
                className="shrink-0 rounded-xl border border-stone-200 bg-white p-2 text-stone-500 shadow-sm transition-all hover:border-green-500 hover:bg-green-50 hover:text-green-700"
              >
                <Plus size={16} />
              </button>
              </div>
            </div>
          </div>

          {/* Configurações Globais (Ocupa 3 colunas) */}
          <div className="space-y-4 col-span-1 lg:col-span-3">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-stone-500">
              <Tractor size={16} /> Configurações Globais (Aplicado a todo o lote)
            </h3>
            
            <div className="space-y-4">
              {mostraCalagem ? (
                <div className="space-y-2">
                  {modo === 'AMBOS' ? <p className="text-xs font-bold uppercase tracking-wider text-green-600">Calagem</p> : null}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-600">Manejo</label>
                  <select
                    value={sistemaManejo}
                    onChange={(e) => setSistemaManejo(e.target.value as any)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none shadow-sm"
                  >
                    <option value="CONVENCIONAL">Convencional</option>
                    <option value="PD_IMPLANTACAO">PD Implantação</option>
                    <option value="PD_CONSOLIDADO">PD Consolidado</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-600">PRNT (%)</label>
                  <input
                    type="number"
                    value={prnt}
                    onChange={(e) => setPrnt(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none shadow-sm"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 self-end rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={calcularPolinomial}
                    onChange={(e) => setCalcularPolinomial(e.target.checked)}
                    className="h-4 w-4 rounded accent-green-600"
                  />
                  Calcular também o Polinomial (valor complementar; automático com SMP &gt; 6,3)
                </label>
              </div>
                </div>
              ) : null}
              {mostraAdubacao ? (
                <div className="space-y-2">
                  {modo === 'AMBOS' ? <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Adubação</p> : null}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-600">Cultura</label>
                  <select value={cultura} onChange={e => setCultura(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none shadow-sm">
                    <option value="soja">Soja</option>
                    <option value="milho">Milho</option>
                    <option value="trigo">Trigo</option>
                    <option value="cevada">Cevada</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-600">Rendimento (t/ha)</label>
                  <input type="number" step="0.1" value={rendimento} onChange={e => setRendimento(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-600">Cultivo nº</label>
                  <select value={numCultivo} onChange={e => setNumCultivo(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none shadow-sm">
                    <option value="1">1º</option>
                    <option value="2">2º ou +</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-600">Tipo Correção</label>
                  <select value={tipoCorrecao} onChange={e => setTipoCorrecao(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none shadow-sm">
                    <option value="Gradual">Gradual</option>
                    <option value="Total">Total</option>
                  </select>
                </div>
                
                {exigeCultAnt && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-600">Cultura Antecedente</label>
                    <select value={culturaAntecedente} onChange={e => setCulturaAntecedente(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none shadow-sm">
                      <option value="Leguminosa">Leguminosa</option>
                      <option value="Gramínea">Gramínea</option>
                    </select>
                  </div>
                )}

                {cultura === 'cevada' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-600">Finalidade Cevada</label>
                    <select value={finalidadeCevada} onChange={e => setFinalidadeCevada(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none shadow-sm">
                      <option value="cervejeira_malte_unico">Cervejeira (Malte Único)</option>
                      <option value="malte_especial">Cervejeira (Malte Especial)</option>
                      <option value="outra">Outra finalidade</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-600">Método P e K (Padrão Lab)</label>
                  <select value={metodoP} onChange={e => { setMetodoP(e.target.value); setMetodoK(e.target.value); }} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none shadow-sm">
                    <option value="Mehlich-1">Mehlich-1</option>
                    <option value="Mehlich-3">Mehlich-3</option>
                  </select>
                </div>
              </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Planilha de Amostras */}
        <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-sm whitespace-nowrap">
              <thead className="border-b border-stone-200 bg-stone-50 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                {modo === 'AMBOS' ? (
                  <tr className="border-b border-stone-100">
                    <th colSpan={3} className="px-3 py-2" />
                    {gruposColunas.map((g) => (
                      <th
                        key={g.nome}
                        colSpan={g.colunas.length}
                        className={`border-l border-stone-200 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider ${g.cor}`}
                      >
                        {g.nome}
                      </th>
                    ))}
                    <th className="px-3 py-2" />
                  </tr>
                ) : null}
                <tr>
                  <th className="sticky left-0 z-10 w-10 bg-stone-50 px-3 py-4 text-center">#</th>
                  <th className="sticky left-10 z-10 w-40 bg-stone-50 px-3 py-4">Gleba / Amostra</th>
                  <th className="w-40 px-3 py-4">Talhão Vinculado</th>
                  {colunas.map(({ key, label }) => (
                    <th key={key} className={`${modo === 'AMBOS' ? 'min-w-[5rem]' : 'w-24'} px-2 py-4 text-center`}>{label}</th>
                  ))}
                  <th className="w-12 px-3 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {linhas.map((linha, index) => (
                  <tr key={linha.id} className="group hover:bg-stone-50/50 transition-colors">
                    <td className="sticky left-0 z-10 bg-white px-3 py-3 text-center font-mono text-[10px] text-stone-400 font-bold">
                      {index + 1}
                    </td>
                    <td className="sticky left-10 z-10 bg-white px-2 py-2">
                      <input
                        type="text"
                        value={linha.identificacao}
                        onChange={(e) => atualizarCampo(linha.id, 'identificacao', e.target.value)}
                        placeholder="Ex: Ponto 01"
                        className="w-full rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-stone-700 outline-none focus:border-stone-200 focus:bg-stone-50 transition-all"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                      <select
                        title={errosGlobais[linha.id]?.talhao_id || 'Selecione o talhão'}
                        value={linha.talhao_id}
                        onChange={(e) => atualizarCampo(linha.id, 'talhao_id', e.target.value)}
                        className={`w-full rounded-lg border px-2 py-2 text-sm outline-none transition-all ${
                          errosGlobais[linha.id]?.talhao_id
                            ? 'border-red-500 bg-red-50 focus:border-red-500 focus:bg-red-50 text-red-600'
                            : 'border-transparent bg-transparent focus:border-stone-200 focus:bg-white text-stone-600'
                        }`}
                      >
                        <option value="">Selecione...</option>
                        {talhoesDisponiveis.map((t) => (
                          <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        title="Adicionar novo talhão"
                        onClick={() => { setNovoTalhaoNome(''); setNovoTalhaoLinhaId(linha.id); }}
                        className="shrink-0 rounded-lg border border-stone-200 p-1.5 text-stone-500 transition-all hover:border-green-500 hover:bg-green-50 hover:text-green-700"
                      >
                        <Plus size={14} />
                      </button>
                      </div>
                    </td>
                    {colunas.map(({ key, label, placeholder }) => {
                      const enabled = isCellEnabled(modo, key, linha, configGlobais);
                      const erroStr = errosGlobais[linha.id]?.[key];
                      return (
                        <td key={key} className="px-1 py-2">
                          <input
                            title={erroStr || label}
                            type={enabled ? "number" : "text"}
                            step="0.1"
                            placeholder={enabled ? placeholder : '-'}
                            value={enabled ? (linha[key] || '') : ''}
                            onChange={(e) => enabled && atualizarCampo(linha.id, key, e.target.value)}
                            disabled={!enabled}
                            className={`${modo === 'AMBOS' ? 'w-[4.75rem]' : 'w-full'} rounded-lg border px-2 py-2 text-center font-mono text-sm outline-none transition-all
                              ${enabled 
                                ? erroStr
                                  ? 'border-red-500 bg-red-50 text-red-600 focus:border-red-500 shadow-sm'
                                  : 'border-stone-200 focus:border-green-500 bg-white shadow-sm' 
                                : 'border-transparent bg-stone-100/50 text-stone-300 cursor-not-allowed opacity-50'
                              }`}
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2">
                      <button
                        onClick={() => removerLinha(linha.id)}
                        disabled={linhas.length === 1}
                        className="rounded-lg p-1.5 text-stone-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-0 transition-all"
                        title="Remover amostra"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-stone-100 bg-stone-50/50 p-3 flex gap-2">
            <button
              onClick={preencherExemplo}
              className="flex w-1/3 items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 py-3 text-sm font-bold text-stone-500 transition-all hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"
            >
              <FlaskConical size={18} /> Exemplo Teste
            </button>
            <button
              onClick={adicionarLinha}
              className="flex w-2/3 items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 py-3 text-sm font-bold text-stone-500 transition-all hover:border-green-500 hover:bg-green-50 hover:text-green-600"
            >
              <Plus size={18} /> Adicionar Linha
            </button>
          </div>
        </div>

        {resumoEnvio.length > 0 ? (
          <div className="space-y-1 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
            {resumoEnvio.map((linha, i) => (
              <p key={i} className="flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0" /> {linha}
              </p>
            ))}
          </div>
        ) : null}

        {/* Rodapé informativo e Ações */}
        <div className="flex flex-col gap-6 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-stone-500">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100">
              <FlaskConical size={20} className="text-stone-400" />
            </div>
            <p className="text-xs leading-tight">
              Os campos bloqueados com <strong>"-"</strong> não são necessários<br/>
              para os parâmetros da linha, o sistema irá ignorá-los.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="font-bold text-stone-500 hover:text-stone-800">Cancelar</button>
            <button
              onClick={handleSalvarTudo}
              disabled={processando || !fazendaId}
              className="flex items-center gap-2 rounded-xl bg-stone-900 px-10 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-stone-800 disabled:bg-stone-300 active:scale-[0.98]"
            >
              {processando ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Processando...
                </>
              ) : (
                <>Salvar e Processar Lote <ArrowRight size={18} /></>
              )}
            </button>
          </div>
        </div>
        
        {sucesso && (
           <div className="fixed bottom-6 right-6 flex items-center gap-2 rounded-xl bg-stone-900 px-6 py-4 text-sm font-bold text-white shadow-2xl animate-in slide-in-from-bottom-4 z-50">
             <CheckCircle2 size={20} className="text-green-400" />
             Lote salvo com sucesso!
           </div>
        )}
        
        {erroEnvio && (
           <div className="fixed bottom-6 right-6 flex items-center gap-2 rounded-xl bg-red-500 px-6 py-4 text-sm font-bold text-white shadow-2xl animate-in slide-in-from-bottom-4 z-50">
             <AlertCircle size={20} className="text-white" />
             {erroEnvio}
           </div>
        )}
      </div>
      {novoTalhaoLinhaId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
          <form
            onSubmit={(e) => { e.preventDefault(); salvarNovoTalhao(); }}
            className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-stone-900">Novo talhão</h3>
            <p className="text-xs text-stone-500">Fazenda: {fazendaSelecionada?.nome}</p>
            <div>
              <label className="text-sm font-semibold text-stone-700">Nome</label>
              <input
                autoFocus
                required
                value={novoTalhaoNome}
                onChange={(e) => setNovoTalhaoNome(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-stone-700">Cultura principal</label>
              <select
                value={novoTalhaoCultura}
                onChange={(e) => setNovoTalhaoCultura(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 outline-none focus:border-green-500"
              >
                {['Soja', 'Milho', 'Trigo', 'Aveia', 'Cevada', 'Feijão', 'Sorgo', 'Canola', 'Girassol', 'Outros grãos'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setNovoTalhaoLinhaId(null)} className="flex-1 rounded-xl border border-stone-200 py-2.5 font-semibold text-stone-600 hover:bg-stone-50">Cancelar</button>
              <button type="submit" disabled={salvandoTalhao} className="flex-1 rounded-xl bg-stone-900 py-2.5 font-bold text-white hover:bg-stone-800 disabled:opacity-50">{salvandoTalhao ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        </div>
      )}
      {modalFazendaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
          <form
            onSubmit={(e) => { e.preventDefault(); salvarNovaFazenda(); }}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-stone-900">Nova fazenda</h3>
            <div>
              <label className="text-sm font-semibold text-stone-700">Nome da Fazenda</label>
              <input
                autoFocus
                required
                value={novaFazendaNome}
                onChange={(e) => setNovaFazendaNome(e.target.value)}
                placeholder="Ex: Sítio São José"
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 outline-none focus:border-green-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-semibold text-stone-700">Estado</label>
                <select
                  value={novaFazendaUf}
                  onChange={(e) => { setNovaFazendaUf(e.target.value); setNovaFazendaMunicipio(''); if (!e.target.value) setMunicipios([]); }}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 outline-none focus:border-green-500"
                >
                  <option value="">UF</option>
                  {estados.map((e) => <option key={e.id} value={e.sigla}>{e.sigla}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-semibold text-stone-700">Município</label>
                <input
                  required
                  list="lista-municipios-nova-analise"
                  value={novaFazendaMunicipio}
                  onChange={(e) => setNovaFazendaMunicipio(e.target.value)}
                  disabled={municipios.length === 0}
                  placeholder={novaFazendaUf ? 'Digite para buscar...' : 'Selecione o Estado'}
                  autoComplete="off"
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 outline-none focus:border-green-500 disabled:opacity-50"
                />
                <datalist id="lista-municipios-nova-analise">
                  {municipios.map((m) => <option key={m.id} value={m.nome} />)}
                </datalist>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setModalFazendaOpen(false)} className="flex-1 rounded-xl border border-stone-200 py-2.5 font-semibold text-stone-600 hover:bg-stone-50">Cancelar</button>
              <button type="submit" disabled={salvandoFazenda} className="flex-1 rounded-xl bg-green-600 py-2.5 font-bold text-white hover:bg-green-700 disabled:opacity-50">{salvandoFazenda ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
