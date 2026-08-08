import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Plus, TableProperties, Tractor, MapPin, AlertCircle, CheckCircle2, Leaf, Sprout, FlaskConical } from 'lucide-react';
import { getFazendas, postAnalisesBulk, postAdubacaoBulk } from '../services/api';
import { CalagemSchema } from '../schemas/calagemSchema';
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

interface LinhaAmostra {
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

type ModoInsercao = 'CALAGEM' | 'ADUBACAO';

// ─── Helpers Dinâmicos ────────────────────────────────────────────────────────

function isCellEnabled(modo: ModoInsercao, campo: keyof LinhaAmostra, linha: LinhaAmostra, configGlobais: any): boolean {
  if (modo === 'CALAGEM') {
    if (['ph', 'smp'].includes(campo)) return true;
    
    const phVal = Number(linha.ph);
    const smpVal = Number(linha.smp);
    
    if (['mo', 'al_trocavel'].includes(campo)) {
      return smpVal > 6.3; 
    }
    
    if (['v_atual', 'ctc'].includes(campo)) {
      const isReaplicacao = !configGlobais.primeira_calagem && smpVal <= 6.3;
      const isPDLock = configGlobais.sistemaManejo === 'PD_CONSOLIDADO' && phVal < 5.5 && configGlobais.primeira_calagem;
      return isReaplicacao || (campo === 'v_atual' && isPDLock);
    }
    
    if (campo === 'al_sat') {
      return configGlobais.sistemaManejo === 'PD_CONSOLIDADO' && phVal < 5.5;
    }
    return false;
  } 
  
  if (modo === 'ADUBACAO') {
    if (campo === 's') {
      const culturasComS = ['soja', 'ervilha', 'ervilhaca', 'canola', 'nabo_forrageiro'];
      return culturasComS.includes(configGlobais.cultura);
    }
    return true; // Demais sempre ativos
  }
  return true;
}

const COLS_CALAGEM: Array<{ key: keyof LinhaAmostra; label: string; placeholder: string }> = [
  { key: 'ph',          label: 'pH',         placeholder: '5.2' },
  { key: 'smp',         label: 'SMP',        placeholder: '5.5' },
  { key: 'mo',          label: 'MO (%)',     placeholder: '2.5' },
  { key: 'al_trocavel', label: 'Al (cmolc)', placeholder: '0.5' },
  { key: 'v_atual',     label: 'V (%)',      placeholder: '55'  },
  { key: 'ctc',         label: 'CTC',        placeholder: '10'  },
  { key: 'al_sat',      label: 'm (%)',      placeholder: '15'  },
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
  const [modo, setModo] = useState<ModoInsercao>('CALAGEM');
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [fazendaId, setFazendaId] = useState('');
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erroEnvio, setErroEnvio] = useState('');
  const [errosGlobais, setErrosGlobais] = useState<Record<string, Record<string, string>>>({});

  // ── Config Globais: Calagem
  const [sistemaManejo, setSistemaManejo] = useState<'CONVENCIONAL' | 'PD_IMPLANTACAO' | 'PD_CONSOLIDADO'>('CONVENCIONAL');
  const [prnt, setPrnt] = useState('90');
  const [primeiraCalagem, setPrimeiraCalagem] = useState(true);

  // ── Config Globais: Adubacao
  const [cultura, setCultura] = useState('soja');
  const [rendimento, setRendimento] = useState('4.5');
  const [numCultivo, setNumCultivo] = useState('1');
  const [sistemaCultivo, setSistemaCultivo] = useState('Plantio Direto');
  const [tipoCorrecao, setTipoCorrecao] = useState('Gradual');
  const [metodoP, setMetodoP] = useState('Mehlich-1');
  const [metodoK, setMetodoK] = useState('Mehlich-1');
  const [culturaAntecedente, setCulturaAntecedente] = useState('Gramínea');
  
  const configGlobais = modo === 'CALAGEM' 
    ? { sistemaManejo, primeiraCalagem, prnt }
    : { cultura, rendimento, numCultivo, sistemaCultivo, tipoCorrecao, metodoP, metodoK, culturaAntecedente };

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
    if (modo === 'CALAGEM') {
      const linha = GERAR_LINHA_VAZIA(talhoesDisponiveis[0]?.id || '', 1);
      linha.ph = '5.2';
      linha.smp = '5.5';
      linha.mo = '2.5';
      linha.al_trocavel = '0.5';
      linha.v_atual = '55';
      linha.ctc = '10';
      linha.al_sat = '15';
      
      setSistemaManejo('CONVENCIONAL');
      setPrnt('90');
      setPrimeiraCalagem(true);
      setLinhas([linha]);
    } else {
      const linha = GERAR_LINHA_VAZIA(talhoesDisponiveis[0]?.id || '', 1);
      linha.argila = '40';
      linha.mo = '3.5';
      linha.ctc = '12';
      linha.p = '5';
      linha.k = '80';
      linha.ca = '4.5';
      linha.mg = '2.5';
      linha.ph = '5.8';
      linha.s = '15';
      linha.cu = '1';
      linha.zn = '2';
      linha.b = '0.5';
      linha.mn = '5';
      
      setCultura('soja');
      setRendimento('4.5');
      setLinhas([linha]);
    }
    setErrosGlobais({});
  };

  const handleSalvarTudo = async () => {
    setErrosGlobais({});
    
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
    
    const novosErros: Record<string, Record<string, string>> = {};
    let temErro = false;
    const amostrasAgrupadas: Record<string, any[]> = {};

    amostrasParaProcessar.forEach(l => {
      novosErros[l.id] = {};
      
      if (!l.talhao_id) {
        novosErros[l.id]['talhao_id'] = "Talhão é obrigatório";
        temErro = true;
      }

      if (modo === 'CALAGEM') {
        const payload = {
          sistema_manejo: sistemaManejo,
          primeira_calagem: primeiraCalagem,
          PRNT: prnt ? Number(prnt) : undefined,
          pH_agua: l.ph !== '' ? Number(l.ph) : undefined,
          SMP: l.smp !== '' ? Number(l.smp) : undefined,
          MO: l.mo !== '' ? Number(l.mo) : undefined,
          Al_trocavel: l.al_trocavel !== '' ? Number(l.al_trocavel) : undefined,
          V_atual: l.v_atual !== '' ? Number(l.v_atual) : undefined,
          CTC_pH7: l.ctc !== '' ? Number(l.ctc) : undefined,
          Al_sat: l.al_sat !== '' ? Number(l.al_sat) : undefined,
        };
        
        const parseResult = CalagemSchema.safeParse(payload);
        if (!parseResult.success) {
          temErro = true;
          const errosZod = parseResult.error?.issues || parseResult.error?.errors || [];
          errosZod.forEach(err => {
            const path = err.path[0] as string;
            let key = path;
            if (path === 'pH_agua') key = 'ph';
            if (path === 'SMP') key = 'smp';
            if (path === 'MO') key = 'mo';
            if (path === 'Al_trocavel') key = 'al_trocavel';
            if (path === 'V_atual') key = 'v_atual';
            if (path === 'CTC_pH7') key = 'ctc';
            if (path === 'Al_sat') key = 'al_sat';
            novosErros[l.id][key] = err.message;
          });
        } else if (l.talhao_id) {
          if (!amostrasAgrupadas[l.talhao_id]) amostrasAgrupadas[l.talhao_id] = [];
          amostrasAgrupadas[l.talhao_id].push({ ...payload, identificacao: l.identificacao, modo: 'avancado' });
        }
      } else {
        // MODO ADUBACAO
        const payload = {
          cultura,
          rendimento_esperado: rendimento ? Number(rendimento) : undefined,
          num_cultivo: numCultivo,
          sistema_cultivo: sistemaCultivo,
          tipo_correcao: tipoCorrecao,
          cultura_antecedente: culturaAntecedente,
          metodo_P: metodoP,
          metodo_K: metodoK,
          argila: l.argila !== '' ? Number(l.argila) : undefined,
          MO: l.mo !== '' ? Number(l.mo) : undefined,
          CTC_pH7: l.ctc !== '' ? Number(l.ctc) : undefined,
          P: l.p !== '' ? Number(l.p) : undefined,
          K: l.k !== '' ? Number(l.k) : undefined,
          Ca: l.ca !== '' ? Number(l.ca) : undefined,
          Mg: l.mg !== '' ? Number(l.mg) : undefined,
          pH_agua: l.ph !== '' ? Number(l.ph) : undefined,
          S: l.s !== '' ? Number(l.s) : undefined,
          Cu: l.cu !== '' ? Number(l.cu) : undefined,
          Zn: l.zn !== '' ? Number(l.zn) : undefined,
          B: l.b !== '' ? Number(l.b) : undefined,
          Mn: l.mn !== '' ? Number(l.mn) : undefined
        };
        
        const parseResult = AdubacaoSchema.safeParse(payload);
        if (!parseResult.success) {
          temErro = true;
          const errosZod = parseResult.error?.issues || parseResult.error?.errors || [];
          errosZod.forEach(err => {
            const path = err.path[0] as string;
            let key = path.toLowerCase();
            if (path === 'CTC_pH7') key = 'ctc';
            if (path === 'pH_agua') key = 'ph';
            novosErros[l.id][key] = err.message;
          });
        } else if (l.talhao_id) {
          if (!amostrasAgrupadas[l.talhao_id]) amostrasAgrupadas[l.talhao_id] = [];
          amostrasAgrupadas[l.talhao_id].push({ 
            ...payload, 
            identificacao: l.identificacao,
            uf: fazendaSelecionada.uf,
            cidade: fazendaSelecionada.municipio
          });
        }
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
      if (modo === 'CALAGEM') {
        await Promise.all(
          Object.entries(amostrasAgrupadas).map(([tId, amostras]) => 
            postAnalisesBulk({ talhao_id: tId, uf: fazendaSelecionada.uf, cidade: fazendaSelecionada.municipio, amostras })
          )
        );
      } else {
        await Promise.all(
          Object.entries(amostrasAgrupadas).map(([tId, amostras]) => 
            postAdubacaoBulk({ talhao_id: tId, amostras })
          )
        );
      }

      setSucesso(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      console.error(err);
      setErroEnvio('Erro ao processar e salvar análises.');
      setTimeout(() => setErroEnvio(''), 5000);
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

  const colunas = modo === 'CALAGEM' ? COLS_CALAGEM : COLS_ADUBACAO;
  const exigeCultAnt = ['aveia_branca', 'aveia_preta', 'centeio', 'cevada', 'trigo', 'triticale', 'milho'].includes(cultura);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-[1400px] overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-xl mx-auto">
      {/* Header */}
      <div className="bg-stone-900 p-8 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-3 text-2xl font-bold">
              <TableProperties className={modo === 'CALAGEM' ? 'text-green-400' : 'text-emerald-400'} />
              Inserção Rápida de Lotes
            </h2>
            <p className="mt-1 text-stone-400 text-sm">
              Cadastre múltiplas amostras de solo de uma só vez para processamento em massa.
            </p>
          </div>
          
          <div className="flex bg-stone-800 p-1 rounded-xl">
            <button
              onClick={() => setModo('CALAGEM')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                modo === 'CALAGEM' ? 'bg-green-500 text-white shadow-lg' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Leaf size={16} /> Calagem
            </button>
            <button
              onClick={() => setModo('ADUBACAO')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                modo === 'ADUBACAO' ? 'bg-emerald-500 text-white shadow-lg' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Sprout size={16} /> Adubação
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
              <select 
                value={fazendaId}
                onChange={(e) => setFazendaId(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 shadow-sm"
              >
                {fazendas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
          </div>

          {/* Configurações Globais (Ocupa 3 colunas) */}
          <div className="space-y-4 col-span-1 lg:col-span-3">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-stone-500">
              <Tractor size={16} /> Configurações Globais (Aplicado a todo o lote)
            </h3>
            
            {modo === 'CALAGEM' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                  <label className="text-xs font-bold text-stone-600">Aplicação</label>
                  <select 
                    value={primeiraCalagem ? 'true' : 'false'}
                    onChange={(e) => setPrimeiraCalagem(e.target.value === 'true')}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none shadow-sm"
                  >
                    <option value="true">1ª Calagem</option>
                    <option value="false">Reaplicação</option>
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
              </div>
            ) : (
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
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-600">Método P e K (Padrão Lab)</label>
                  <select value={metodoP} onChange={e => { setMetodoP(e.target.value); setMetodoK(e.target.value); }} className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none shadow-sm">
                    <option value="Mehlich-1">Mehlich-1</option>
                    <option value="Mehlich-3">Mehlich-3</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Planilha de Amostras */}
        <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="border-b border-stone-200 bg-stone-50 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="w-10 px-3 py-4 text-center">#</th>
                  <th className="w-40 px-3 py-4">Gleba / Amostra</th>
                  <th className="w-40 px-3 py-4">Talhão Vinculado</th>
                  {colunas.map(({ key, label }) => (
                    <th key={key} className="w-24 px-2 py-4 text-center">{label}</th>
                  ))}
                  <th className="w-12 px-3 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {linhas.map((linha, index) => (
                  <tr key={linha.id} className="group hover:bg-stone-50/50 transition-colors">
                    <td className="px-3 py-3 text-center font-mono text-[10px] text-stone-400 font-bold">
                      {index + 1}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={linha.identificacao}
                        onChange={(e) => atualizarCampo(linha.id, 'identificacao', e.target.value)}
                        placeholder="Ex: Ponto 01"
                        className="w-full rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-stone-700 outline-none focus:border-stone-200 focus:bg-stone-50 transition-all"
                      />
                    </td>
                    <td className="px-2 py-2">
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
                            className={`w-full rounded-lg border px-2 py-2 text-center font-mono text-sm outline-none transition-all
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
    </div>
  );
}
