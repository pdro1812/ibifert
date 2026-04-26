import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Sprout, CheckCircle2, Leaf, FlaskConical, 
  FileDown, Save, Check, User, LogOut, LayoutDashboard, Map,
  Plus, TableProperties, ArrowRight, X, MapPin, Tractor
} from 'lucide-react';

import { CalagemSchema, type EntradaCalagem } from './schemas/calagemSchema';
import { api } from './services/api';
import { gerarPDFRelatorio } from './services/pdfGenerator';
import { ibgeService } from './services/ibge';
import type { Estado, Municipio } from './services/ibge';

// ============================================================================
// 0. CONSTANTES E COMPONENTES AUXILIARES
// ============================================================================

const CULTURAS_GRAOS = [
  "Soja", "Milho", "Trigo", "Aveia", "Cevada", "Feijão", "Arroz", "Sorgo", "Canola", "Outros"
];

const Modal = ({ isOpen, onClose, titulo, children }: { isOpen: boolean, onClose: () => void, titulo: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
        <div className="flex justify-between items-center p-6 border-b border-stone-100">
          <h3 className="text-lg font-bold text-stone-800">{titulo}</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 1. COMPONENTES GLOBAIS
// ============================================================================

const Header = ({ isLoggedIn, onLogout }: { isLoggedIn: boolean, onLogout: () => void }) => {
  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-green-300 transition-all">
            <Leaf className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-800 tracking-tight">Ibiferti</h1>
            <p className="text-[10px] text-stone-500 font-medium uppercase tracking-wider">Agronomia</p>
          </div>
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
              <div className="w-px h-6 bg-stone-200"></div>
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
};

// ============================================================================
// 2. TELAS DA ÁREA DO PRODUTOR
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

  useEffect(() => {
    ibgeService.getEstados().then(setEstados);
  }, []);

  useEffect(() => {
    if (ufSelecionada) {
      ibgeService.getMunicipios(ufSelecionada).then(setMunicipios);
    } else {
      setMunicipios([]);
    }
  }, [ufSelecionada]);

  const handleSalvarFazenda = (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    const municipioDigitado = target.municipio.value;

    // VALIDAÇÃO ESTRITA DA CIDADE
    const municipioValido = municipios.some(m => m.nome === municipioDigitado);
    if (!municipioValido) {
      alert("Por favor, selecione uma cidade válida da lista apresentada.");
      // Limpa o campo para o usuário tentar novamente
      target.municipio.value = '';
      target.municipio.focus();
      return;
    }

    const novaFazenda = {
      id: Date.now(),
      nome: target.nomeFazenda.value,
      uf: target.uf.value,
      municipio: municipioDigitado,
      talhoes: []
    };
    setFazendas([...fazendas, novaFazenda]);
    setModalFazendaOpen(false);
  };

  const handleSalvarTalhao = (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    const fazendaId = parseInt(target.fazendaId.value);
    const novoTalhao = {
      id: Date.now(),
      nome: target.nomeTalhao.value,
      cultura: target.cultura.value
    };
    
    setFazendas(fazendas.map(f => {
      if (f.id === fazendaId) return { ...f, talhoes: [...f.talhoes, novoTalhao] };
      return f;
    }));
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
          <button onClick={() => setModalFazendaOpen(true)} className="bg-white border border-stone-200 text-stone-700 px-4 py-2 rounded-lg font-semibold hover:bg-stone-50 transition-colors">
            + Nova Fazenda
          </button>
          <button onClick={() => setModalTalhaoOpen(true)} className="bg-white border border-stone-200 text-stone-700 px-4 py-2 rounded-lg font-semibold hover:bg-stone-50 transition-colors">
            + Novo Talhão
          </button>
          <button onClick={() => navigate('/dashboard/nova-analise')} className="bg-green-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md shadow-green-600/20 flex items-center gap-2">
            <FlaskConical size={18} /> Inserir Análises
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {fazendas.map((fazenda) => (
          <div key={fazenda.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <MapPin className="text-green-600" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-stone-800">{fazenda.nome}</h3>
                  <p className="text-sm text-stone-500">{fazenda.municipio}, {fazenda.uf}</p>
                </div>
              </div>
              <button onClick={() => setModalTalhaoOpen(true)} className="text-sm font-semibold text-green-600 hover:text-green-700 flex items-center gap-1">
                <Plus size={16} /> Adicionar Talhão aqui
              </button>
            </div>
            
            <div className="p-6">
              {fazenda.talhoes.length === 0 ? (
                <p className="text-sm text-stone-400 italic">Nenhum talhão cadastrado nesta fazenda.</p>
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
            <input name="nomeFazenda" required placeholder="Ex: Sítio São José" className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-700 outline-none focus:border-green-500" />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="text-sm font-semibold text-stone-700">Estado</label>
              <select 
                name="uf" 
                value={ufSelecionada} 
                onChange={(e) => setUfSelecionada(e.target.value)}
                className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-700 outline-none focus:border-green-500"
              >
                <option value="">UF</option>
                {estados.map(est => <option key={est.id} value={est.sigla}>{est.sigla}</option>)}
              </select>
            </div>
            
            <div className="col-span-2">
              <label className="text-sm font-semibold text-stone-700">Município</label>
              <input 
                name="municipio" 
                required
                list="lista-municipios"
                disabled={!ufSelecionada || municipios.length === 0}
                placeholder={ufSelecionada ? "Digite para buscar..." : "Selecione o Estado"}
                autoComplete="off"
                className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-700 outline-none focus:border-green-500 disabled:opacity-50"
              />
              <datalist id="lista-municipios">
                {municipios.map(mun => <option key={mun.id} value={mun.nome} />)}
              </datalist>
            </div>
          </div>

          <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl py-3 mt-4 transition-all">Salvar Fazenda</button>
        </form>
      </Modal>

      <Modal isOpen={modalTalhaoOpen} onClose={() => setModalTalhaoOpen(false)} titulo="Cadastrar Novo Talhão">
        <form onSubmit={handleSalvarTalhao} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-stone-700">Vincular a qual Fazenda?</label>
            <select name="fazendaId" required className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-700 outline-none focus:border-green-500">
              {fazendas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-stone-700">Nome/Identificação do Talhão</label>
            <input name="nomeTalhao" required placeholder="Ex: Talhão 1" className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-700 outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="text-sm font-semibold text-stone-700">Cultura Principal</label>
            <select name="cultura" required className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-700 outline-none focus:border-green-500">
              <option value="">Selecione...</option>
              {CULTURAS_GRAOS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button type="submit" className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl py-3 mt-4 transition-all">Salvar Talhão</button>
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

  const adicionarLinha = () => {
    setLinhas([...linhas, { id: Date.now(), camada: '', ph: '', smp: '', mo: '', v: '', m: '', al: '' }]);
  };

  return (
    <div className="w-full max-w-6xl bg-white rounded-[2rem] shadow-xl border border-stone-200 overflow-hidden relative">
      <div className="bg-stone-900 p-8 text-white flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <TableProperties className="text-green-400" />
            Inserção Rápida de Amostras
          </h2>
          <p className="text-stone-400 mt-1">Cadastre múltiplas amostras de laboratório manualmente para salvar no seu histórico.</p>
        </div>
      </div>

      <div className="p-8 space-y-8">
        <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-semibold text-stone-700">Fazenda</label>
            <select className="w-full mt-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-stone-700 outline-none">
              <option>Fazenda Bela Vista</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-stone-700">Talhão</label>
            <select className="w-full mt-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-stone-700 outline-none">
              <option>Selecione um talhão...</option>
              <option>Talhão Sul</option>
              <option>Talhão Norte</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-stone-700">Data da Coleta</label>
            <input type="date" className="w-full mt-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-stone-700 outline-none" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-stone-800">Dados do Laboratório</h3>
            <span className="text-sm text-stone-500">Dica: Use a tecla TAB para navegar rapidamente.</span>
          </div>
          
          <div className="border border-stone-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-stone-100 text-stone-600 uppercase text-xs font-bold border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3 border-r border-stone-200 w-12 text-center">#</th>
                  <th className="px-4 py-3 border-r border-stone-200">Camada (cm)</th>
                  <th className="px-4 py-3 border-r border-stone-200 text-center">pH</th>
                  <th className="px-4 py-3 border-r border-stone-200 text-center">Índice SMP</th>
                  <th className="px-4 py-3 border-r border-stone-200 text-center">MO (%)</th>
                  <th className="px-4 py-3 border-r border-stone-200 text-center">V (%)</th>
                  <th className="px-4 py-3 border-r border-stone-200 text-center">m (%)</th>
                  <th className="px-4 py-3 text-center">Al (cmolc)</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha, index) => (
                  <tr key={linha.id} className="border-b border-stone-100 hover:bg-green-50/50 transition-colors">
                    <td className="px-4 py-2 border-r border-stone-100 text-center text-stone-400 font-mono">{index + 1}</td>
                    <td className="border-r border-stone-100 p-0">
                      <input type="text" defaultValue={linha.camada} placeholder="0-20" className="w-full h-full px-4 py-2 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-green-500" />
                    </td>
                    {['ph', 'smp', 'mo', 'v', 'm', 'al'].map((campo) => (
                      <td key={campo} className="border-r border-stone-100 p-0 last:border-0">
                         <input type="number" step="0.1" className="w-full h-full px-4 py-2 bg-transparent outline-none text-center focus:bg-white focus:ring-2 focus:ring-inset focus:ring-green-500 font-mono" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="bg-stone-50 p-2 border-t border-stone-200">
              <button type="button" onClick={adicionarLinha} className="w-full py-2 border-2 border-dashed border-stone-300 rounded-lg text-stone-500 font-medium hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-all flex items-center justify-center gap-2">
                <Plus size={16} /> Adicionar Linha de Amostra
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-stone-100">
          <button onClick={() => navigate('/dashboard')} className="text-stone-500 hover:text-stone-800 font-semibold px-4 py-2">Cancelar</button>
          <button className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-green-600/20 flex items-center gap-2">
            Salvar e Processar Cálculos <ArrowRight size={18} />
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
    
    // VERIFICAÇÃO DE MEMÓRIA APÓS LOGIN
    const pendente = sessionStorage.getItem('analisePendente');
    if (pendente) {
      sessionStorage.removeItem('analisePendente');
      alert("Sua análise que estava em andamento foi recuperada! Você será redirecionado para vinculá-la a um talhão.");
      navigate('/dashboard/nova-analise'); // Direciona pro lugar certo no futuro
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-stone-100">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><User className="text-green-600" size={32} /></div>
        <h2 className="text-2xl font-bold text-stone-800">Acesso ao Produtor</h2>
          </div>
          <form onSubmit={handleMockLogin} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-stone-700">E-mail</label>
              <input
                type="email"
                required
                defaultValue="teste@email.com"
                className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-stone-700">Senha</label>
              <input
                type="password"
                required
                defaultValue="123456"
                className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none"
              />
            </div>
        <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl py-4 mt-4 shadow-lg transition-all">Entrar na Plataforma</button>
      </form>
    </div>
  );
};

const MonitoramentoScreen = () => (
  <div className="text-center space-y-4 opacity-70"><Map size={64} className="mx-auto text-stone-400" /><h2 className="text-2xl font-bold text-stone-600">Monitoramento Regional</h2></div>
);

type FormValores = EntradaCalagem & { identificacao?: string };

const CalculadoraScreen = ({ isLoggedIn }: { isLoggedIn: boolean }) => {
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const navigate = useNavigate(); // <-- HOOK ADICIONADO PARA NAVEGAÇÃO

  const { register, handleSubmit, watch, control, setValue, getValues } = useForm<FormValores>({
    resolver: zodResolver(CalagemSchema) as any,
    defaultValues: {
      versao_regra: 'ibiferti-calagem-graos-v1.6', sistema_manejo: 'CONVENCIONAL', prnt_pct: 90,
      amostras: [{ profundidade: '0-20', ph: 5.8, indice_smp: 6.5, mo_pct: 2.0, al_cmolc_dm3: 1.2 }]
    }
  });

  const { fields, replace } = useFieldArray({ control, name: 'amostras' });
  const sistemaSelecionado = watch('sistema_manejo');

  const handleSistemaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novo = e.target.value as EntradaCalagem['sistema_manejo'];
    setValue('sistema_manejo', novo);
    if (novo !== 'PD_IMPLANTACAO') setValue('modo_implantacao_pd', undefined); else setValue('modo_implantacao_pd', 'INCORPORADO'); 
    if (novo === 'PD_CONSOLIDADO') replace([{ profundidade: '0-10', ph: 0, indice_smp: 0 }, { profundidade: '10-20', ph: 0, indice_smp: 0 }]);
    else replace([{ profundidade: '0-20', ph: 5.8, indice_smp: 6.5, mo_pct: 2.0, al_cmolc_dm3: 1.2 }]);
  };

  const onSubmit: SubmitHandler<FormValores> = async (data) => {
    setLoading(true); setResultado(null); setSalvo(false);
    try { setResultado((await api.post('/calcular', JSON.parse(JSON.stringify(data)))).data); } 
    catch (e: any) { alert("Erro: " + (e.response?.data?.mensagem || "Falha")); } 
    finally { setLoading(false); }
  };

  // --- NOVA FUNÇÃO DE SALVAMENTO COM MEMÓRIA ---
  const handleTentarSalvar = () => {
    if (!isLoggedIn) {
      // Guarda os dados na memória temporária do navegador
      sessionStorage.setItem('analisePendente', JSON.stringify({ 
        dados: getValues(), 
        resultado 
      }));
      // Redireciona para o login
      navigate('/login');
    } else {
      // Futuramente, aqui será feita a requisição POST para salvar na API
      setSalvo(true);
      setTimeout(() => setSalvo(false), 3000);
    }
  };

  return (
    <div className="max-w-6xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row border border-white/60">
      <div className="w-full lg:w-3/5 p-8 lg:p-12 bg-white">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg"><Leaf className="text-white" size={24} /></div>
          <div><h1 className="text-2xl font-bold text-stone-800 tracking-tight">Ibiferti Calagem</h1><p className="text-sm text-stone-500 font-medium">Motor de Recomendação</p></div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700 flex justify-between">Identificação da Análise <span className="text-stone-400 font-normal">Opcional</span></label>
              <input type="text" placeholder="Ex: Talhão da Caixa D'água" {...register('identificacao')} className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-green-500 shadow-sm" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-stone-200/60">
              <div className="space-y-2"><label className="text-sm font-semibold">Sistema</label><select {...register('sistema_manejo')} onChange={handleSistemaChange} className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-green-500 shadow-sm"><option value="CONVENCIONAL">Convencional</option><option value="PD_IMPLANTACAO">Plantio Direto - Imp.</option><option value="PD_CONSOLIDADO">Plantio Direto - Cons.</option></select></div>
              <div className="space-y-2"><label className="text-sm font-semibold">PRNT (%)</label><input type="number" step="0.1" {...register('prnt_pct')} className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-green-500 shadow-sm" /></div>
            </div>
            {sistemaSelecionado === 'PD_IMPLANTACAO' && (
              <div className="space-y-2 animate-fade-in"><label className="text-sm font-semibold">Modo de Implantação</label><select {...register('modo_implantacao_pd')} className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 outline-none focus:border-green-500 shadow-sm"><option value="INCORPORADO">Incorporado</option><option value="CAMPO_NATURAL_SUPERFICIAL">Superficial</option></select></div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-4"><FlaskConical size={20} className="text-green-600" /><h3 className="text-lg font-bold">Amostras de Solo</h3></div>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="relative bg-white border border-stone-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <span className="absolute -top-3 left-6 bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-200">Camada {field.profundidade} cm</span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                    {[{ label: 'pH', name: 'ph' }, { label: 'SMP', name: 'indice_smp' }, { label: 'MO (%)', name: 'mo_pct' }, { label: 'V (%)', name: 'v_pct' }, { label: 'm (%)', name: 'm_pct' }, { label: 'Al', name: 'al_cmolc_dm3' }].map((item) => (
                      <div key={item.name} className="space-y-1"><label className="text-xs font-medium text-stone-500">{item.label}</label><input type="number" step="0.1" {...register(`amostras.${index}.${item.name}` as any)} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:bg-white focus:border-green-500 transition-all" /></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white font-semibold rounded-xl py-4 shadow-lg flex items-center justify-center">{loading ? 'Processando...' : 'Calcular Recomendação'}</button>
        </form>
      </div>

      <div className="w-full lg:w-2/5 p-8 lg:p-12 bg-gradient-to-br from-[#E8F3E8] to-[#F4F6F0] border-t lg:border-t-0 lg:border-l border-white/60 flex flex-col relative overflow-hidden">
        <div className="relative z-10 w-full h-full flex flex-col justify-center">
          {resultado ? (
            <div className="space-y-6 flex-grow flex flex-col justify-center">
              <div className="flex flex-col items-center text-center mb-4"><div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-green-500"><CheckCircle2 size={32} /></div><h2 className="text-2xl font-bold">Diagnóstico Concluído</h2></div>
              <div className="bg-white rounded-[1.5rem] p-8 shadow-xl text-center"><p className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-2">Dose Final</p><div className="flex items-baseline justify-center gap-2 mb-2"><span className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-400">{resultado.dose_final_t_ha}</span><span className="text-xl font-bold text-green-700">t/ha</span></div></div>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <button onClick={() => gerarPDFRelatorio(getValues(), resultado)} className="flex items-center justify-center gap-2 bg-white border border-green-200 text-green-700 font-semibold rounded-xl py-3 hover:bg-green-50 shadow-sm"><FileDown size={18} /> PDF</button>
                <button 
                  onClick={handleTentarSalvar} 
                  className={`flex items-center justify-center gap-2 font-semibold rounded-xl py-3 shadow-sm transition-all ${salvo ? 'bg-green-500 text-white border-transparent' : 'bg-white border border-stone-200 hover:bg-stone-50'}`}
                >
                  {salvo ? <><Check size={18} /> Salvo!</> : <><Save size={18} /> Salvar</>}
                </button>
              </div>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center text-center h-full space-y-4 opacity-60"><div className="w-20 h-20 bg-stone-200/50 rounded-full flex items-center justify-center"><Sprout size={32} className="text-stone-400" /></div><h3 className="text-xl font-semibold">Aguardando Dados</h3></div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. APP PRINCIPAL
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