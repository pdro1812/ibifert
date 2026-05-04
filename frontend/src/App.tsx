import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Sprout, CheckCircle2, Leaf, FlaskConical,
  FileDown, Save, Check, User, LogOut, LayoutDashboard, Map,
  Plus, TableProperties, ArrowRight, X, MapPin, Tractor,
  Lightbulb, AlertCircle, ShieldCheck, Info
} from 'lucide-react';

import { CalagemSchema, type EntradaCalagem } from './schemas/calagemSchema';
import { api } from './services/api';
import { ibgeService } from './services/ibge';
import type { Estado, Municipio } from './services/ibge';

// ============================================================================
// 0. CONSTANTES E COMPONENTES AUXILIARES
// ============================================================================

const CULTURAS_GRAOS = [
  "Soja", "Milho", "Trigo", "Aveia", "Cevada", "Feijão", "Arroz", "Sorgo", "Canola", "Outros"
];

const Modal = ({ isOpen, onClose, titulo, children }: {
  isOpen: boolean; onClose: () => void; titulo: string; children: React.ReactNode
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-stone-100">
          <h3 className="text-lg font-bold text-stone-800">{titulo}</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

// Campo numérico reutilizável com borda de erro
const CampoNumerico = ({
  label, name, step = '0.1', min, max, register, error, dica
}: {
  label: string; name: string; step?: string; min?: number; max?: number;
  register: any; error?: any; dica?: string;
}) => (
  <div className="space-y-1">
    <label className="text-xs font-semibold text-stone-600 flex items-center gap-1">
      {label}
      {dica && (
        <span className="relative group cursor-help">
          <Info size={12} className="text-stone-400" />
          <span className="absolute left-0 bottom-full mb-1 hidden group-hover:block w-52 bg-stone-800 text-stone-200 text-xs p-2 rounded-lg z-50 pointer-events-none">
            {dica}
          </span>
        </span>
      )}
    </label>
    <input
      type="number" step={step} min={min} max={max}
      {...register(name)}
      className={`w-full bg-stone-50 border rounded-lg px-3 py-2.5 text-sm outline-none transition-all
        ${error ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-stone-200 focus:bg-white focus:border-green-500'}`}
    />
    {error && (
      <span className="text-red-500 text-xs flex items-center gap-1">
        <AlertCircle size={11} /> {error.message || 'Campo obrigatório'}
      </span>
    )}
  </div>
);

// ============================================================================
// 1. COMPONENTES GLOBAIS
// ============================================================================

const Header = ({ isLoggedIn, onLogout }: { isLoggedIn: boolean; onLogout: () => void }) => (
  <header className="bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm">
    <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3 group">
        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-md">
          <Leaf className="text-white" size={20} />
        </div>
        <h1 className="text-xl font-bold text-stone-800 tracking-tight">Ibiferti</h1>
      </Link>

      <nav className="hidden md:flex items-center gap-8">
        <Link to="/" className="text-sm font-semibold text-stone-600 hover:text-green-600 transition-colors">Calculadora</Link>
        <Link to="/monitoramento" className="text-sm font-semibold text-stone-600 hover:text-green-600 transition-colors">Monitoramento Regional</Link>
      </nav>

      <div className="flex items-center gap-4">
        {isLoggedIn ? (
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-stone-700 hover:text-green-600 transition-colors">
              <LayoutDashboard size={18} /> Painel
            </Link>
            <div className="w-px h-6 bg-stone-200" />
            <button onClick={onLogout} className="flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-700 transition-colors">
              <LogOut size={18} /> Sair
            </button>
          </div>
        ) : (
          <>
            <Link to="/login" className="text-sm font-semibold text-stone-600 hover:text-green-600 transition-colors">Entrar</Link>
            <Link to="/login" className="bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all shadow-md">Criar Conta</Link>
          </>
        )}
      </div>
    </div>
  </header>
);

// ============================================================================
// 2. TELAS DA ÁREA DO PRODUTOR (sem alteração de lógica)
// ============================================================================

const DashboardScreen = () => {
  const navigate = useNavigate();
  const [fazendas, setFazendas] = useState([
    { id: 1, nome: 'Fazenda Bela Vista', municipio: 'Ibirubá', uf: 'RS', talhoes: [{ id: 101, nome: 'Talhão Sul', cultura: 'Soja' }, { id: 102, nome: 'Talhão Norte', cultura: 'Milho' }] }
  ]);
  const [modalFazendaOpen, setModalFazendaOpen] = useState(false);
  const [modalTalhaoOpen, setModalTalhaoOpen] = useState(false);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [ufSelecionada, setUfSelecionada] = useState('RS');

  useEffect(() => { ibgeService.getEstados().then(setEstados); }, []);
  useEffect(() => {
    if (ufSelecionada) ibgeService.getMunicipios(ufSelecionada).then(setMunicipios);
    else setMunicipios([]);
  }, [ufSelecionada]);

  const handleSalvarFazenda = (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    const municipioDigitado = target.municipio.value;
    if (!municipios.some(m => m.nome === municipioDigitado)) {
      alert("Por favor, selecione uma cidade válida da lista.");
      return;
    }
    setFazendas([...fazendas, { id: Date.now(), nome: target.nomeFazenda.value, uf: target.uf.value, municipio: municipioDigitado, talhoes: [] }]);
    setModalFazendaOpen(false);
  };

  const handleSalvarTalhao = (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    const fazendaId = parseInt(target.fazendaId.value);
    const novoTalhao = { id: Date.now(), nome: target.nomeTalhao.value, cultura: target.cultura.value };
    setFazendas(fazendas.map(f => f.id === fazendaId ? { ...f, talhoes: [...f.talhoes, novoTalhao] } : f));
    setModalTalhaoOpen(false);
  };

  return (
    <div className="w-full max-w-6xl space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-8 rounded-[2rem] border border-stone-200 shadow-sm gap-6">
        <div>
          <h2 className="text-3xl font-bold text-stone-800">Minhas Propriedades</h2>
          <p className="text-stone-500">Gerencie suas fazendas, talhões e históricos de solo.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setModalFazendaOpen(true)} className="bg-white border border-stone-200 text-stone-700 px-4 py-2 rounded-lg font-semibold hover:bg-stone-50 transition-colors">+ Nova Fazenda</button>
          <button onClick={() => setModalTalhaoOpen(true)} className="bg-white border border-stone-200 text-stone-700 px-4 py-2 rounded-lg font-semibold hover:bg-stone-50 transition-colors">+ Novo Talhão</button>
          <button onClick={() => navigate('/dashboard/nova-analise')} className="bg-green-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md flex items-center gap-2">
            <FlaskConical size={18} /> Inserir Análises
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {fazendas.map(fazenda => (
          <div key={fazenda.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><MapPin className="text-green-600" size={20} /></div>
                <div>
                  <h3 className="text-xl font-bold text-stone-800">{fazenda.nome}</h3>
                  <p className="text-sm text-stone-500">{fazenda.municipio}, {fazenda.uf}</p>
                </div>
              </div>
              <button onClick={() => setModalTalhaoOpen(true)} className="text-sm font-semibold text-green-600 hover:text-green-700 flex items-center gap-1">
                <Plus size={16} /> Adicionar Talhão
              </button>
            </div>
            <div className="p-6">
              {fazenda.talhoes.length === 0 ? (
                <p className="text-sm text-stone-400 italic">Nenhum talhão cadastrado.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {fazenda.talhoes.map(talhao => (
                    <div key={talhao.id} className="border border-stone-100 rounded-xl p-4 hover:border-green-200 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-start justify-between mb-2">
                        <Tractor className="text-stone-300 group-hover:text-green-500 transition-colors" size={24} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 px-2 py-1 rounded-md">{talhao.cultura}</span>
                      </div>
                      <h4 className="font-bold text-stone-800">{talhao.nome}</h4>
                      <p className="text-xs text-stone-500 mt-2">Sem análises recentes</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalFazendaOpen} onClose={() => setModalFazendaOpen(false)} titulo="Cadastrar Nova Fazenda">
        <form onSubmit={handleSalvarFazenda} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-stone-700">Nome da Fazenda</label>
            <input name="nomeFazenda" required placeholder="Ex: Sítio São José" className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-green-500" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="text-sm font-semibold text-stone-700">Estado</label>
              <select name="uf" value={ufSelecionada} onChange={e => setUfSelecionada(e.target.value)} className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-green-500">
                <option value="">UF</option>
                {estados.map(est => <option key={est.id} value={est.sigla}>{est.sigla}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-semibold text-stone-700">Município</label>
              <input name="municipio" required list="lista-municipios" disabled={municipios.length === 0}
                placeholder={ufSelecionada ? "Digite para buscar..." : "Selecione o Estado"}
                autoComplete="off" className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-green-500 disabled:opacity-50" />
              <datalist id="lista-municipios">{municipios.map(m => <option key={m.id} value={m.nome} />)}</datalist>
            </div>
          </div>
          <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl py-3 transition-all">Salvar Fazenda</button>
        </form>
      </Modal>

      <Modal isOpen={modalTalhaoOpen} onClose={() => setModalTalhaoOpen(false)} titulo="Cadastrar Novo Talhão">
        <form onSubmit={handleSalvarTalhao} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-stone-700">Fazenda</label>
            <select name="fazendaId" required className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-green-500">
              {fazendas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-stone-700">Nome do Talhão</label>
            <input name="nomeTalhao" required placeholder="Ex: Talhão 1" className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="text-sm font-semibold text-stone-700">Cultura Principal</label>
            <select name="cultura" required className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-green-500">
              <option value="">Selecione...</option>
              {CULTURAS_GRAOS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button type="submit" className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl py-3 transition-all">Salvar Talhão</button>
        </form>
      </Modal>
    </div>
  );
};

const NovaAnaliseScreen = () => {
  const navigate = useNavigate();
  const [linhas, setLinhas] = useState([
    { id: 1, camada: '0-20', ph: '', smp: '', mo: '', v: '', m: '', al: '' }
  ]);
  const adicionarLinha = () => setLinhas([...linhas, { id: Date.now(), camada: '', ph: '', smp: '', mo: '', v: '', m: '', al: '' }]);

  return (
    <div className="w-full max-w-6xl bg-white rounded-[2rem] shadow-xl border border-stone-200 overflow-hidden">
      <div className="bg-stone-900 p-8 text-white">
        <h2 className="text-2xl font-bold flex items-center gap-3"><TableProperties className="text-green-400" /> Inserção Rápida de Amostras</h2>
        <p className="text-stone-400 mt-1">Cadastre múltiplas amostras para salvar no histórico.</p>
      </div>
      <div className="p-8 space-y-8">
        <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div><label className="text-sm font-semibold text-stone-700">Fazenda</label><select className="w-full mt-1 bg-white border border-stone-200 rounded-lg px-3 py-2 outline-none"><option>Fazenda Bela Vista</option></select></div>
          <div><label className="text-sm font-semibold text-stone-700">Talhão</label><select className="w-full mt-1 bg-white border border-stone-200 rounded-lg px-3 py-2 outline-none"><option>Selecione...</option><option>Talhão Sul</option></select></div>
          <div><label className="text-sm font-semibold text-stone-700">Data da Coleta</label><input type="date" className="w-full mt-1 bg-white border border-stone-200 rounded-lg px-3 py-2 outline-none" /></div>
        </div>
        <div className="border border-stone-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-stone-100 text-stone-600 uppercase text-xs font-bold border-b border-stone-200">
              <tr>
                <th className="px-4 py-3 border-r border-stone-200 w-12 text-center">#</th>
                <th className="px-4 py-3 border-r border-stone-200">Camada (cm)</th>
                <th className="px-4 py-3 border-r border-stone-200 text-center">pH</th>
                <th className="px-4 py-3 border-r border-stone-200 text-center">SMP</th>
                <th className="px-4 py-3 border-r border-stone-200 text-center">MO (%)</th>
                <th className="px-4 py-3 border-r border-stone-200 text-center">V (%)</th>
                <th className="px-4 py-3 border-r border-stone-200 text-center">m (%)</th>
                <th className="px-4 py-3 text-center">Al (cmolc)</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, index) => (
                <tr key={linha.id} className="border-b border-stone-100 hover:bg-green-50/50">
                  <td className="px-4 py-2 border-r border-stone-100 text-center text-stone-400 font-mono">{index + 1}</td>
                  <td className="border-r border-stone-100 p-0"><input type="text" defaultValue={linha.camada} placeholder="0-20" className="w-full px-4 py-2 bg-transparent outline-none focus:bg-white" /></td>
                  {['ph', 'smp', 'mo', 'v', 'm', 'al'].map(campo => (
                    <td key={campo} className="border-r border-stone-100 p-0 last:border-0">
                      <input type="number" step="0.1" className="w-full px-4 py-2 bg-transparent outline-none text-center focus:bg-white font-mono" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bg-stone-50 p-2 border-t border-stone-200">
            <button type="button" onClick={adicionarLinha} className="w-full py-2 border-2 border-dashed border-stone-300 rounded-lg text-stone-500 hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-all flex items-center justify-center gap-2">
              <Plus size={16} /> Adicionar Linha
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-stone-100">
          <button onClick={() => navigate('/dashboard')} className="text-stone-500 hover:text-stone-800 font-semibold px-4 py-2">Cancelar</button>
          <button className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg flex items-center gap-2">
            Salvar e Processar <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. TELAS PÚBLICAS
// ============================================================================

const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  const navigate = useNavigate();
  const handleMockLogin = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
    const pendente = sessionStorage.getItem('analisePendente');
    if (pendente) { sessionStorage.removeItem('analisePendente'); navigate('/dashboard/nova-analise'); }
    else navigate('/dashboard');
  };
  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-stone-100">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><User className="text-green-600" size={32} /></div>
        <h2 className="text-2xl font-bold text-stone-800">Acesso ao Produtor</h2>
      </div>
      <form onSubmit={handleMockLogin} className="space-y-4">
        <div><label className="text-sm font-semibold text-stone-700">E-mail</label><input type="email" required defaultValue="teste@email.com" className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none" /></div>
        <div><label className="text-sm font-semibold text-stone-700">Senha</label><input type="password" required defaultValue="123456" className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none" /></div>
        <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl py-4 mt-4 shadow-lg transition-all">Entrar na Plataforma</button>
      </form>
    </div>
  );
};

const MonitoramentoScreen = () => (
  <div className="text-center space-y-4 opacity-70"><Map size={64} className="mx-auto text-stone-400" /><h2 className="text-2xl font-bold text-stone-600">Monitoramento Regional</h2></div>
);

// ============================================================================
// 4. CALCULADORA — TELA PRINCIPAL
// ============================================================================

type FormValores = EntradaCalagem & { identificacao?: string };

const CalculadoraScreen = ({ isLoggedIn }: { isLoggedIn: boolean }) => {
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const navigate = useNavigate();

  const [modalTermosOpen, setModalTermosOpen] = useState(false);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [ufSelecionada, setUfSelecionada] = useState('RS');
  const [cidadeSelecionada, setCidadeSelecionada] = useState('Ibirubá');
  const [termosAceitos, setTermosAceitos] = useState(false);
  const [erroCidade, setErroCidade] = useState(false);
  const [erroTermos, setErroTermos] = useState(false);

  useEffect(() => { ibgeService.getEstados().then(setEstados); }, []);
  useEffect(() => {
    if (ufSelecionada) ibgeService.getMunicipios(ufSelecionada).then(setMunicipios);
    else { setMunicipios([]); setCidadeSelecionada(''); }
  }, [ufSelecionada]);

  const { register, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<FormValores>({
    resolver: zodResolver(CalagemSchema) as any,
    defaultValues: {
      sistema_manejo: 'CONVENCIONAL',
      primeira_calagem: true,
      pH_agua: 5.2,
      SMP: 5.5,
      PRNT: 90,
    }
  });

  const sistemaSelecionado = watch('sistema_manejo');
  const primCalagem = watch('primeira_calagem');
  const smpValor = watch('SMP');
  const pHValor = watch('pH_agua');

  // Lógica de visibilidade de campos (espelha Parte 1 do documento)
  const isPolinomial = Number(smpValor) > 6.3;
  const isReaplicacaoSMP = primCalagem === false && !isPolinomial;
  const isPDConsolidado = sistemaSelecionado === 'PD_CONSOLIDADO';
  const isPDImplantacao = sistemaSelecionado === 'PD_IMPLANTACAO';
  const precisaAlSat = isPDConsolidado && Number(pHValor) < 5.5;

  const onSubmitValidado: SubmitHandler<FormValores> = async (data) => {
    let erros = false;
    if (!cidadeSelecionada || !municipios.some(m => m.nome === cidadeSelecionada)) { setErroCidade(true); erros = true; }
    if (!termosAceitos) { setErroTermos(true); erros = true; }
    if (erros) return;

    // Monta payload limpo — remove campos de UI e não usados pelo backend
    const { identificacao, opcao_superficial_campo_natural, ...payload } = data;

    // opcao_superficial_campo_natural só vai se for PD_IMPLANTACAO
    const payloadFinal: any = { ...payload };
    if (isPDImplantacao) {
      payloadFinal.opcao_superficial_campo_natural = opcao_superficial_campo_natural ?? false;
    }

    setLoading(true); setResultado(null); setSalvo(false);
    try {
      const resp = await api.post('/calcular', payloadFinal);
      setResultado(resp.data.resultado ?? resp.data);
    } catch (e: any) {
      alert('Erro: ' + (e.response?.data?.mensagem || 'Falha na comunicação com o servidor'));
    } finally {
      setLoading(false);
    }
  };

  const onErrorNoForm = () => {
    if (!cidadeSelecionada || !municipios.some(m => m.nome === cidadeSelecionada)) setErroCidade(true);
    if (!termosAceitos) setErroTermos(true);
  };

  const handleTentarSalvar = () => {
    if (!isLoggedIn) {
      sessionStorage.setItem('analisePendente', JSON.stringify({ dados: getValues(), resultado }));
      navigate('/login');
    } else {
      setSalvo(true);
      setTimeout(() => setSalvo(false), 3000);
    }
  };

  return (
    <div className="max-w-6xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row border border-white/60">

      {/* MODAL TERMOS */}
      <Modal isOpen={modalTermosOpen} onClose={() => setModalTermosOpen(false)} titulo="Termos de Uso do Ibiferti">
        <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
          <p>O <strong>Ibiferti</strong> é uma ferramenta de apoio à tomada de decisão baseada nos manuais regionais oficiais.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>As recomendações são puramente matemáticas baseadas nos dados informados.</li>
            <li>Não substitui a avaliação de um Engenheiro Agrônomo qualificado.</li>
            <li>A precisão depende da qualidade da coleta de solo e da análise laboratorial.</li>
          </ul>
          <button onClick={() => setModalTermosOpen(false)} className="w-full mt-4 bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 rounded-xl transition-colors">Entendido</button>
        </div>
      </Modal>

      {/* ── PAINEL ESQUERDO — FORMULÁRIO ── */}
      <div className="w-full lg:w-3/5 p-8 lg:p-12 bg-white">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg"><Leaf className="text-white" size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold text-stone-800 tracking-tight">Ibiferti Calagem</h1>
            <p className="text-sm text-stone-500 font-medium">Motor de Recomendação v2.0</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmitValidado, onErrorNoForm)} noValidate className="space-y-8">

          {/* ── BLOCO: Localização ── */}
          <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 space-y-5">
            <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider">Localização</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-1 space-y-1">
                <label className="text-xs font-semibold text-stone-600">Estado *</label>
                <select value={ufSelecionada} onChange={e => setUfSelecionada(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-green-500 shadow-sm">
                  <option value="">UF</option>
                  {estados.map(est => <option key={est.id} value={est.sigla}>{est.sigla}</option>)}
                </select>
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-stone-600">Cidade *</label>
                <input list="lista-municipios-calc" value={cidadeSelecionada}
                  onChange={e => { setCidadeSelecionada(e.target.value); setErroCidade(false); }}
                  disabled={municipios.length === 0}
                  placeholder={ufSelecionada ? 'Digite para buscar...' : 'Selecione o Estado'}
                  autoComplete="off"
                  className={`w-full bg-white border rounded-xl px-4 py-3 outline-none transition-all shadow-sm disabled:opacity-50
                    ${erroCidade ? 'border-red-400 bg-red-50' : 'border-stone-200 focus:border-green-500'}`} />
                <datalist id="lista-municipios-calc">{municipios.map(m => <option key={m.id} value={m.nome} />)}</datalist>
                {erroCidade && <span className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11} /> Selecione uma cidade válida</span>}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-600 flex justify-between">Identificação <span className="font-normal text-stone-400">Opcional</span></label>
              <input type="text" placeholder="Ex: Talhão da Caixa D'água" {...register('identificacao')}
                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-green-500 shadow-sm" />
            </div>
          </div>

          {/* ── BLOCO: Configuração do Sistema ── */}
          <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 space-y-5">
            <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider">Configuração do Sistema</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sistema de manejo */}
              <div className="space-y-1">
                <div className="relative flex items-center gap-2 group w-max">
                  <label className="text-xs font-semibold text-stone-600">Sistema de Manejo *</label>
                  <div className="text-yellow-500 cursor-help"><Lightbulb size={14} /></div>
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-72 bg-stone-800 text-stone-200 p-4 rounded-xl shadow-xl z-50 text-xs pointer-events-none">
                    <div className="space-y-2">
                      <div><strong className="text-white block">Convencional</strong>Revolvimento anual (aração, gradagem).</div>
                      <div className="h-px bg-stone-700" />
                      <div><strong className="text-white block">PD Implantado</strong>Fase inicial de transição para plantio direto.</div>
                      <div className="h-px bg-stone-700" />
                      <div><strong className="text-white block">PD Consolidado</strong>Sistema maduro, sem revolvimento, boa palhada.</div>
                    </div>
                    <div className="absolute top-full left-6 -mt-1 border-4 border-transparent border-t-stone-800" />
                  </div>
                </div>
                <select {...register('sistema_manejo')}
                  onChange={e => setValue('sistema_manejo', e.target.value as any)}
                  className={`w-full bg-white border rounded-xl px-4 py-3 outline-none shadow-sm transition-all
                    ${errors.sistema_manejo ? 'border-red-400 bg-red-50' : 'border-stone-200 focus:border-green-500'}`}>
                  <option value="CONVENCIONAL">Convencional</option>
                  <option value="PD_IMPLANTACAO">Plantio Direto — Implantado</option>
                  <option value="PD_CONSOLIDADO">Plantio Direto — Consolidado</option>
                </select>
              </div>

              {/* Primeira calagem */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-600">Tipo de Aplicação *</label>
                <select {...register('primeira_calagem', { setValueAs: v => v === 'true' })}
                  className={`w-full bg-white border rounded-xl px-4 py-3 outline-none shadow-sm transition-all
                    ${errors.primeira_calagem ? 'border-red-400 bg-red-50' : 'border-stone-200 focus:border-green-500'}`}>
                  <option value="true">Primeira calagem</option>
                  <option value="false">Reaplicação</option>
                </select>
              </div>
            </div>

            {/* PRNT */}
            <div className="max-w-xs">
              <CampoNumerico label="PRNT (%) *" name="PRNT" min={1} max={100} register={register} error={errors.PRNT}
                dica="Poder Relativo de Neutralização Total do calcário. Padrão: 100% (PRNT puro)." />
            </div>

            {/* PD Implantação — opção superficial */}
            {isPDImplantacao && (
              <div className="space-y-1 animate-pulse-once">
                <label className="text-xs font-semibold text-stone-600">Modo de Aplicação *</label>
                <select {...register('opcao_superficial_campo_natural', { setValueAs: v => v === 'true' })}
                  className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none shadow-sm focus:border-green-500">
                  <option value="false">Incorporado (padrão)</option>
                  <option value="true">Superficial — Campo Natural (SMP {'>'} 5,5)</option>
                </select>
              </div>
            )}
          </div>

          {/* ── BLOCO: Dados de Solo ── */}
          <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 space-y-5">
            <h3 className="text-sm font-bold text-stone-500 uppercase tracking-wider">
              Dados de Solo
              {isPDConsolidado && <span className="ml-2 text-green-600 font-normal normal-case">(camada 0–10 cm)</span>}
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <CampoNumerico label="pH em água *" name="pH_agua" min={3.5} max={8.0} register={register} error={errors.pH_agua}
                dica="Intervalo válido: 3.5 a 8.0. Camada 0-20 cm (Convencional) ou 0-10 cm (PD Consolidado)." />
              <CampoNumerico label="Índice SMP *" name="SMP" min={4.4} max={7.1} register={register} error={errors.SMP}
                dica="Índice SMP da camada. Valores entre 4.4 e 7.1." />

              {/* B3: Polinomial — exibe MO e Al_trocavel quando SMP > 6.3 */}
              {isPolinomial && (
                <>
                  <CampoNumerico label="MO (%) *" name="MO" min={0} max={100} register={register} error={errors.MO}
                    dica="Matéria orgânica do solo. Necessário pois SMP > 6.3 (método polinomial)." />
                  <CampoNumerico label="Al trocável (cmolc/dm³) *" name="Al_trocavel" min={0} register={register} error={errors.Al_trocavel}
                    dica="Alumínio trocável. Necessário para equação polinomial." />
                </>
              )}

              {/* B1: V% e CTC — reaplicação + SMP <= 6.3 */}
              {isReaplicacaoSMP && (
                <>
                  <CampoNumerico label="V atual (%) *" name="V_atual" min={0} max={100} register={register} error={errors.V_atual}
                    dica="Saturação por bases atual. Usado como referência informativa para reaplicações." />
                  <CampoNumerico label="CTC pH7 (cmolc/dm³) *" name="CTC_pH7" min={0.1} register={register} error={errors.CTC_pH7}
                    dica="Capacidade de troca de cátions a pH 7.0." />
                </>
              )}

              {/* B2: Al_sat — PD Consolidado com pH < 5.5 */}
              {precisaAlSat && (
                <CampoNumerico label="Al saturação (%) *" name="Al_sat" min={0} max={100} register={register} error={errors.Al_sat}
                  dica="Saturação por Al na CTC. Obrigatório em PD Consolidado quando pH < 5.5." />
              )}
            </div>

            {/* PD com Restrição — SMP das duas camadas */}
            {sistemaSelecionado === 'PD_COM_RESTRICAO' && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-200">
                <CampoNumerico label="SMP camada 0–10 cm *" name="SMP_0_10" register={register} error={errors.SMP_0_10} />
                <CampoNumerico label="SMP camada 10–20 cm *" name="SMP_10_20" register={register} error={errors.SMP_10_20} />
              </div>
            )}
          </div>

          {/* ── TERMOS DE USO ── */}
          <div className={`p-5 rounded-2xl border transition-colors ${erroTermos ? 'bg-red-50 border-red-200' : 'bg-stone-50 border-stone-200'}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={termosAceitos}
                onChange={e => { setTermosAceitos(e.target.checked); setErroTermos(false); }}
                className="w-5 h-5 accent-green-600 rounded mt-0.5 cursor-pointer" />
              <div className="flex-1 text-sm text-stone-700 leading-relaxed">
                Li e concordo com os{' '}
                <button type="button" onClick={e => { e.preventDefault(); setModalTermosOpen(true); }} className="text-green-600 font-bold hover:underline">Termos de Uso</button>.
                {erroTermos && (
                  <span className="text-red-500 text-xs font-semibold mt-1 flex items-center gap-1">
                    <ShieldCheck size={14} /> O aceite dos termos é obrigatório.
                  </span>
                )}
              </div>
            </label>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white font-semibold rounded-xl py-4 shadow-lg flex items-center justify-center gap-2 transition-all">
            {loading ? 'Processando...' : 'Calcular Recomendação'}
          </button>
        </form>
      </div>

      {/* ── PAINEL DIREITO — RESULTADO ── */}
      <div className="w-full lg:w-2/5 p-8 lg:p-12 bg-gradient-to-br from-[#E8F3E8] to-[#F4F6F0] border-t lg:border-t-0 lg:border-l border-white/60 flex flex-col">
        <div className="relative z-10 w-full h-full flex flex-col justify-center">
          {resultado ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center mb-2">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-green-500"><CheckCircle2 size={32} /></div>
                <h2 className="text-2xl font-bold">Diagnóstico Concluído</h2>
              </div>

              {/* Card principal — NC_ajustada */}
              <div className="bg-white rounded-[1.5rem] p-8 shadow-xl text-center">
                <p className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-1">Dose para Produto Real</p>
                <div className="flex items-baseline justify-center gap-2 mb-1">
                  <span className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-400">
                    {resultado.NC_ajustada?.toFixed(2) ?? '—'}
                  </span>
                  <span className="text-xl font-bold text-green-700">t/ha</span>
                </div>
                <p className="text-xs text-stone-400">PRNT corrigido</p>
              </div>

              {/* Detalhes secundários */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/80 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-xs text-stone-400 mb-1">NC base</p>
                  <p className="text-lg font-bold text-stone-700">{resultado.NC_base?.toFixed(2) ?? '—'} <span className="text-xs font-normal">t/ha</span></p>
                </div>
                <div className="bg-white/80 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-xs text-stone-400 mb-1">NC final</p>
                  <p className="text-lg font-bold text-stone-700">{resultado.NC_final?.toFixed(2) ?? '—'} <span className="text-xs font-normal">t/ha</span></p>
                </div>
                <div className="bg-white/80 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-xs text-stone-400 mb-1">Método</p>
                  <p className="text-sm font-bold text-stone-700">{resultado.metodo_calc_roteado ?? '—'}</p>
                </div>
                <div className="bg-white/80 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-xs text-stone-400 mb-1">Modo de aplicação</p>
                  <p className="text-sm font-bold text-stone-700">{resultado.modo_aplicacao ?? '—'}</p>
                </div>
              </div>

              {/* NC_vb referência (reaplicação) */}
              {resultado.NC_vb !== undefined && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
                  <strong>Referência — Saturação por Bases:</strong> {resultado.NC_vb?.toFixed(2)} t/ha
                  <p className="text-xs mt-1 text-yellow-600">A definição do método a aplicar é decisão do técnico responsável.</p>
                </div>
              )}

              {/* Alertas do motor */}
              {resultado.alertas?.length > 0 && (
                <div className="space-y-2">
                  {resultado.alertas.map((alerta: string, i: number) => (
                    <div key={i} className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-800 flex items-start gap-2">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" /> {alerta}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-4">
                <button
                  onClick={() => {
                    // pdfGenerator pode ser reintegrado futuramente
                    alert('Exportação de PDF será reintegrada em breve.');
                  }}
                  className="flex items-center justify-center gap-2 bg-white border border-green-200 text-green-700 font-semibold rounded-xl py-3 hover:bg-green-50 shadow-sm">
                  <FileDown size={18} /> PDF
                </button>
                <button onClick={handleTentarSalvar}
                  className={`flex items-center justify-center gap-2 font-semibold rounded-xl py-3 shadow-sm transition-all
                    ${salvo ? 'bg-green-500 text-white' : 'bg-white border border-stone-200 hover:bg-stone-50'}`}>
                  {salvo ? <><Check size={18} /> Salvo!</> : <><Save size={18} /> Salvar</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full space-y-4 opacity-60">
              <div className="w-20 h-20 bg-stone-200/50 rounded-full flex items-center justify-center"><Sprout size={32} className="text-stone-400" /></div>
              <h3 className="text-xl font-semibold">Aguardando Dados</h3>
              <p className="text-sm text-stone-400 max-w-xs">Preencha o formulário e clique em calcular para ver o diagnóstico.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 5. APP PRINCIPAL
// ============================================================================

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#F4F6F0] font-sans text-stone-800 flex flex-col">
        <Header isLoggedIn={isLoggedIn} onLogout={() => setIsLoggedIn(false)} />
        <main className="flex-grow flex items-center justify-center p-4 md:p-8">
          <Routes>
            <Route path="/" element={<CalculadoraScreen isLoggedIn={isLoggedIn} />} />
            <Route path="/monitoramento" element={<MonitoramentoScreen />} />
            <Route path="/login" element={<LoginScreen onLogin={() => setIsLoggedIn(true)} />} />
            <Route path="/dashboard" element={isLoggedIn ? <DashboardScreen /> : <LoginScreen onLogin={() => setIsLoggedIn(true)} />} />
            <Route path="/dashboard/nova-analise" element={isLoggedIn ? <NovaAnaliseScreen /> : <LoginScreen onLogin={() => setIsLoggedIn(true)} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}