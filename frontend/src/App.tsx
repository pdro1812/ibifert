import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { BrowserRouter, Link, Route, Routes, useNavigate } from 'react-router-dom';
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
  FlaskConical,
  Info,
  LayoutDashboard,
  Leaf,
  Lightbulb,
  LogOut,
  Map,
  MapPin,
  Plus,
  Save,
  ShieldCheck,
  Sprout,
  TableProperties,
  Tractor,
  User,
  X,
} from 'lucide-react';

import {
  CalagemSchema,
  detectarRestricaoMonitoramento,
  resolverSistemaEfetivo,
  rotearMetodoCalagem,
  type CalagemResultado,
  type EntradaCalagem,
} from './schemas/calagemSchema';
import { calcularCalagem } from './services/api';
import { ibgeService } from './services/ibge';
import type { Estado, Municipio } from './services/ibge';

const CULTURAS_GRAOS = [
  'Soja',
  'Milho',
  'Trigo',
  'Aveia',
  'Cevada',
  'Feijão',
  'Sorgo',
  'Canola',
  'Girassol',
  'Outros grãos',
];

const MSG_MONITORAMENTO_RESTRICAO =
  'Recomenda-se avaliação por engenheiro agrônomo antes de reiniciar o sistema plantio direto';

function normalizarNumero(valor: unknown): number | undefined {
  if (valor === '' || valor === null || valor === undefined) {
    return undefined;
  }

  if (typeof valor === 'number') {
    return Number.isNaN(valor) ? undefined : valor;
  }

  if (typeof valor === 'string') {
    const normalizado = valor.replace(',', '.').trim();
    if (!normalizado) {
      return undefined;
    }

    const convertido = Number(normalizado);
    return Number.isNaN(convertido) ? undefined : convertido;
  }

  return undefined;
}

function extrairMensagemErro(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'mensagem' in error.response.data &&
    typeof error.response.data.mensagem === 'string'
  ) {
    return error.response.data.mensagem;
  }

  return 'Falha na comunicação com o servidor.';
}

const Modal = ({
  isOpen,
  onClose,
  titulo,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  children: ReactNode;
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 p-6">
          <h3 className="text-lg font-bold text-stone-800">{titulo}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 transition-colors hover:text-stone-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
};

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

const Header = ({
  isLoggedIn,
  onLogout,
}: {
  isLoggedIn: boolean;
  onLogout: () => void;
}) => (
  <header className="sticky top-0 z-50 border-b border-stone-200 bg-white shadow-sm">
    <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-8">
      <Link to="/" className="group flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-green-600 shadow-md">
          <Leaf className="text-white" size={20} />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-stone-800">Ibiferti</h1>
      </Link>

      <nav className="hidden items-center gap-8 md:flex">
        <Link
          to="/"
          className="text-sm font-semibold text-stone-600 transition-colors hover:text-green-600"
        >
          Calculadora
        </Link>
        <Link
          to="/monitoramento"
          className="text-sm font-semibold text-stone-600 transition-colors hover:text-green-600"
        >
          Monitoramento Regional
        </Link>
      </nav>

      <div className="flex items-center gap-4">
        {isLoggedIn ? (
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-sm font-semibold text-stone-700 transition-colors hover:text-green-600"
            >
              <LayoutDashboard size={18} /> Painel
            </Link>
            <div className="h-6 w-px bg-stone-200" />
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-sm font-semibold text-red-500 transition-colors hover:text-red-700"
            >
              <LogOut size={18} /> Sair
            </button>
          </div>
        ) : (
          <>
            <Link
              to="/login"
              className="text-sm font-semibold text-stone-600 transition-colors hover:text-green-600"
            >
              Entrar
            </Link>
            <Link
              to="/login"
              className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-stone-800"
            >
              Criar Conta
            </Link>
          </>
        )}
      </div>
    </div>
  </header>
);

const DashboardScreen = () => {
  const navigate = useNavigate();
  const [fazendas, setFazendas] = useState([
    {
      id: 1,
      nome: 'Fazenda Bela Vista',
      municipio: 'Ibirubá',
      uf: 'RS',
      talhoes: [
        { id: 101, nome: 'Talhão Sul', cultura: 'Soja' },
        { id: 102, nome: 'Talhão Norte', cultura: 'Milho' },
      ],
    },
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
    }
  }, [ufSelecionada]);

  const handleSalvarFazenda = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const target = evento.currentTarget;
    const formData = new FormData(target);
    const municipioDigitado = String(formData.get('municipio') ?? '');

    if (!municipios.some((municipio) => municipio.nome === municipioDigitado)) {
      alert('Por favor, selecione uma cidade válida da lista.');
      return;
    }

    setFazendas([
      ...fazendas,
      {
        id: Date.now(),
        nome: String(formData.get('nomeFazenda') ?? ''),
        uf: String(formData.get('uf') ?? ''),
        municipio: municipioDigitado,
        talhoes: [],
      },
    ]);
    setModalFazendaOpen(false);
  };

  const handleSalvarTalhao = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const target = evento.currentTarget;
    const formData = new FormData(target);
    const fazendaId = Number(formData.get('fazendaId'));
    const novoTalhao = {
      id: Date.now(),
      nome: String(formData.get('nomeTalhao') ?? ''),
      cultura: String(formData.get('cultura') ?? ''),
    };

    setFazendas(
      fazendas.map((fazenda) =>
        fazenda.id === fazendaId
          ? { ...fazenda, talhoes: [...fazenda.talhoes, novoTalhao] }
          : fazenda
      )
    );
    setModalTalhaoOpen(false);
  };

  return (
    <div className="w-full max-w-6xl space-y-8">
      <div className="flex flex-col justify-between gap-6 rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-stone-800">Minhas Propriedades</h2>
          <p className="text-stone-500">
            Gerencie suas fazendas, talhões e históricos de solo.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setModalFazendaOpen(true)}
            className="rounded-lg border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-700 transition-colors hover:bg-stone-50"
          >
            + Nova Fazenda
          </button>
          <button
            onClick={() => setModalTalhaoOpen(true)}
            className="rounded-lg border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-700 transition-colors hover:bg-stone-50"
          >
            + Novo Talhão
          </button>
          <button
            onClick={() => navigate('/dashboard/nova-analise')}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 font-semibold text-white shadow-md transition-colors hover:bg-green-700"
          >
            <FlaskConical size={18} /> Inserir Análises
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {fazendas.map((fazenda) => (
          <div
            key={fazenda.id}
            className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                  <MapPin className="text-green-600" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-stone-800">{fazenda.nome}</h3>
                  <p className="text-sm text-stone-500">
                    {fazenda.municipio}, {fazenda.uf}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalTalhaoOpen(true)}
                className="flex items-center gap-1 text-sm font-semibold text-green-600 hover:text-green-700"
              >
                <Plus size={16} /> Adicionar Talhão
              </button>
            </div>
            <div className="p-6">
              {fazenda.talhoes.length === 0 ? (
                <p className="text-sm italic text-stone-400">
                  Nenhum talhão cadastrado.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {fazenda.talhoes.map((talhao) => (
                    <div
                      key={talhao.id}
                      className="group cursor-pointer rounded-xl border border-stone-100 p-4 transition-all hover:border-green-200 hover:shadow-md"
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <Tractor
                          className="text-stone-300 transition-colors group-hover:text-green-500"
                          size={24}
                        />
                        <span className="rounded-md bg-green-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-green-700">
                          {talhao.cultura}
                        </span>
                      </div>
                      <h4 className="font-bold text-stone-800">{talhao.nome}</h4>
                      <p className="mt-2 text-xs text-stone-500">
                        Sem análises recentes
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={modalFazendaOpen}
        onClose={() => setModalFazendaOpen(false)}
        titulo="Cadastrar Nova Fazenda"
      >
        <form onSubmit={handleSalvarFazenda} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-stone-700">
              Nome da Fazenda
            </label>
            <input
              name="nomeFazenda"
              required
              placeholder="Ex: Sítio São José"
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-green-500"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="text-sm font-semibold text-stone-700">Estado</label>
              <select
                name="uf"
                value={ufSelecionada}
                onChange={(evento) => {
                  const proximaUf = evento.target.value;
                  setUfSelecionada(proximaUf);
                  if (!proximaUf) {
                    setMunicipios([]);
                  }
                }}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-green-500"
              >
                <option value="">UF</option>
                {estados.map((estado) => (
                  <option key={estado.id} value={estado.sigla}>
                    {estado.sigla}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-semibold text-stone-700">
                Município
              </label>
              <input
                name="municipio"
                required
                list="lista-municipios"
                disabled={municipios.length === 0}
                placeholder={ufSelecionada ? 'Digite para buscar...' : 'Selecione o Estado'}
                autoComplete="off"
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-green-500 disabled:opacity-50"
              />
              <datalist id="lista-municipios">
                {municipios.map((municipio) => (
                  <option key={municipio.id} value={municipio.nome} />
                ))}
              </datalist>
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-green-600 py-3 font-bold text-white transition-all hover:bg-green-700"
          >
            Salvar Fazenda
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={modalTalhaoOpen}
        onClose={() => setModalTalhaoOpen(false)}
        titulo="Cadastrar Novo Talhão"
      >
        <form onSubmit={handleSalvarTalhao} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-stone-700">Fazenda</label>
            <select
              name="fazendaId"
              required
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-green-500"
            >
              {fazendas.map((fazenda) => (
                <option key={fazenda.id} value={fazenda.id}>
                  {fazenda.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-stone-700">
              Nome do Talhão
            </label>
            <input
              name="nomeTalhao"
              required
              placeholder="Ex: Talhão 1"
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-stone-700">
              Cultura Principal
            </label>
            <select
              name="cultura"
              required
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-green-500"
            >
              <option value="">Selecione...</option>
              {CULTURAS_GRAOS.map((cultura) => (
                <option key={cultura} value={cultura}>
                  {cultura}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-stone-900 py-3 font-bold text-white transition-all hover:bg-stone-800"
          >
            Salvar Talhão
          </button>
        </form>
      </Modal>
    </div>
  );
};

const NovaAnaliseScreen = () => {
  const navigate = useNavigate();
  const [linhas, setLinhas] = useState([
    { id: 1, camada: '0-20', ph: '', smp: '', mo: '', v: '', m: '', al: '' },
  ]);

  const adicionarLinha = () => {
    setLinhas([
      ...linhas,
      { id: Date.now(), camada: '', ph: '', smp: '', mo: '', v: '', m: '', al: '' },
    ]);
  };

  return (
    <div className="w-full max-w-6xl overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-xl">
      <div className="bg-stone-900 p-8 text-white">
        <h2 className="flex items-center gap-3 text-2xl font-bold">
          <TableProperties className="text-green-400" /> Inserção Rápida de Amostras
        </h2>
        <p className="mt-1 text-stone-400">
          Cadastre múltiplas amostras para salvar no histórico.
        </p>
      </div>
      <div className="space-y-8 p-8">
        <div className="grid grid-cols-1 gap-6 rounded-2xl border border-stone-200 bg-stone-50 p-6 md:grid-cols-3">
          <div>
            <label className="text-sm font-semibold text-stone-700">Fazenda</label>
            <select className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 outline-none">
              <option>Fazenda Bela Vista</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-stone-700">Talhão</label>
            <select className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 outline-none">
              <option>Selecione...</option>
              <option>Talhão Sul</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-stone-700">
              Data da Coleta
            </label>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 outline-none"
            />
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-stone-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-100 text-xs font-bold uppercase text-stone-600">
              <tr>
                <th className="w-12 border-r border-stone-200 px-4 py-3 text-center">
                  #
                </th>
                <th className="border-r border-stone-200 px-4 py-3">Camada (cm)</th>
                <th className="border-r border-stone-200 px-4 py-3 text-center">pH</th>
                <th className="border-r border-stone-200 px-4 py-3 text-center">SMP</th>
                <th className="border-r border-stone-200 px-4 py-3 text-center">
                  MO (%)
                </th>
                <th className="border-r border-stone-200 px-4 py-3 text-center">
                  V (%)
                </th>
                <th className="border-r border-stone-200 px-4 py-3 text-center">
                  m (%)
                </th>
                <th className="px-4 py-3 text-center">Al (cmolc)</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, index) => (
                <tr key={linha.id} className="border-b border-stone-100 hover:bg-green-50/50">
                  <td className="border-r border-stone-100 px-4 py-2 text-center font-mono text-stone-400">
                    {index + 1}
                  </td>
                  <td className="border-r border-stone-100 p-0">
                    <input
                      type="text"
                      defaultValue={linha.camada}
                      placeholder="0-20"
                      className="w-full bg-transparent px-4 py-2 outline-none focus:bg-white"
                    />
                  </td>
                  {['ph', 'smp', 'mo', 'v', 'm', 'al'].map((campo) => (
                    <td key={campo} className="border-r border-stone-100 p-0 last:border-0">
                      <input
                        type="number"
                        step="0.1"
                        className="w-full bg-transparent px-4 py-2 text-center font-mono outline-none focus:bg-white"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-stone-200 bg-stone-50 p-2">
            <button
              type="button"
              onClick={adicionarLinha}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-300 py-2 text-stone-500 transition-all hover:border-green-500 hover:bg-green-50 hover:text-green-600"
            >
              <Plus size={16} /> Adicionar Linha
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-stone-100 pt-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 font-semibold text-stone-500 hover:text-stone-800"
          >
            Cancelar
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-green-600 px-8 py-3 font-bold text-white shadow-lg transition-all hover:bg-green-700">
            Salvar e Processar <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  const navigate = useNavigate();

  const handleMockLogin = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    onLogin();
    const pendente = sessionStorage.getItem('analisePendente');
    if (pendente) {
      sessionStorage.removeItem('analisePendente');
      navigate('/dashboard/nova-analise');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-stone-100 bg-white p-8 shadow-xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <User className="text-green-600" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-stone-800">Acesso ao Produtor</h2>
      </div>
      <form onSubmit={handleMockLogin} className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-stone-700">E-mail</label>
          <input
            type="email"
            required
            defaultValue="teste@email.com"
            className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-stone-700">Senha</label>
          <input
            type="password"
            required
            defaultValue="123456"
            className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none"
          />
        </div>
        <button
          type="submit"
          className="mt-4 w-full rounded-xl bg-green-600 py-4 font-bold text-white shadow-lg transition-all hover:bg-green-700"
        >
          Entrar na Plataforma
        </button>
      </form>
    </div>
  );
};

const MonitoramentoScreen = () => (
  <div className="space-y-4 text-center opacity-70">
    <Map size={64} className="mx-auto text-stone-400" />
    <h2 className="text-2xl font-bold text-stone-600">Monitoramento Regional</h2>
  </div>
);

const CalculadoraScreen = ({ isLoggedIn }: { isLoggedIn: boolean }) => {
  const navigate = useNavigate();
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

  useEffect(() => {
    ibgeService.getEstados().then(setEstados);
  }, []);

  useEffect(() => {
    if (ufSelecionada) {
      ibgeService.getMunicipios(ufSelecionada).then(setMunicipios);
    }
  }, [ufSelecionada]);

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
  const primeiraCalagem = useWatch({ control, name: 'primeira_calagem' });
  const smpValor = useWatch({ control, name: 'SMP' });
  const pHValor = useWatch({ control, name: 'pH_agua' });
  const monitoramento = useWatch({ control, name: 'monitoramento' });

  const temSmpInformado = typeof smpValor === 'number';
  const temPhInformado = typeof pHValor === 'number';
  const metodoRoteado = temSmpInformado ? rotearMetodoCalagem(smpValor) : null;
  const isPolinomial = metodoRoteado === 'POLINOMIAL';
  const isReaplicacaoSMP = primeiraCalagem === false && metodoRoteado === 'SMP';
  const isPDConsolidado = sistemaSelecionado === 'PD_CONSOLIDADO';
  const isPDImplantacao = sistemaSelecionado === 'PD_IMPLANTACAO';
  const precisaAlSat = isPDConsolidado && temPhInformado && pHValor < 5.5;
  const modoAlSatAtual = precisaAlSat ? modoAlSat : 'direto';
  const restricao10_20 =
    isPDConsolidado &&
    monitoramentoAtivo &&
    detectarRestricaoMonitoramento(monitoramento);
  const sistemaEfetivo = resolverSistemaEfetivo({
    sistema_manejo: sistemaSelecionado,
    monitoramento,
  });

  const onSubmitValidado: SubmitHandler<FormValores> = async (dados) => {
    let temErro = false;

    if (!cidadeSelecionada || !municipios.some((municipio) => municipio.nome === cidadeSelecionada)) {
      setErroCidade(true);
      temErro = true;
    }

    if (!termosAceitos) {
      setErroTermos(true);
      temErro = true;
    }

    if (temErro) {
      return;
    }

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
    if (!cidadeSelecionada || !municipios.some((municipio) => municipio.nome === cidadeSelecionada)) {
      setErroCidade(true);
    }

    if (!termosAceitos) {
      setErroTermos(true);
    }
  };

  const handleTentarSalvar = () => {
    if (!isLoggedIn) {
      sessionStorage.setItem(
        'analisePendente',
        JSON.stringify({ dados: getValues(), resultado })
      );
      navigate('/login');
      return;
    }

    setSalvo(true);
    setTimeout(() => setSalvo(false), 3000);
  };

  const tituloResultado =
    resultado?.aplicar_calcario === false
      ? 'Aplicação não recomendada'
      : 'Diagnóstico Concluído';

  return (
    <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl lg:flex-row">
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
            <li>
              A precisão depende da qualidade da coleta de solo e da análise
              laboratorial.
            </li>
          </ul>
          <button
            onClick={() => setModalTermosOpen(false)}
            className="mt-4 w-full rounded-xl bg-stone-900 py-3 font-bold text-white transition-colors hover:bg-stone-800"
          >
            Entendido
          </button>
        </div>
      </Modal>

      <div className="w-full bg-white p-8 lg:w-3/5 lg:p-12">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-green-600 shadow-lg">
            <Leaf className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-800">
              Ibiferti Calagem
            </h1>
            <p className="text-sm font-medium text-stone-500">
              Motor de Recomendação v2.0
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmitValidado, onErrorNoForm)}
          noValidate
          className="space-y-8"
        >
          <div className="space-y-5 rounded-2xl border border-stone-100 bg-stone-50 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">
              Localização
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="col-span-1 space-y-1">
                <label className="text-xs font-semibold text-stone-600">Estado *</label>
                <select
                  value={ufSelecionada}
                  onChange={(evento) => {
                    const proximaUf = evento.target.value;
                    setUfSelecionada(proximaUf);
                    setErroCidade(false);
                    if (!proximaUf) {
                      setMunicipios([]);
                      setCidadeSelecionada('');
                    }
                  }}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm outline-none focus:border-green-500"
                >
                  <option value="">UF</option>
                  {estados.map((estado) => (
                    <option key={estado.id} value={estado.sigla}>
                      {estado.sigla}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-stone-600">Cidade *</label>
                <input
                  list="lista-municipios-calc"
                  value={cidadeSelecionada}
                  onChange={(evento) => {
                    setCidadeSelecionada(evento.target.value);
                    setErroCidade(false);
                  }}
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
                  {municipios.map((municipio) => (
                    <option key={municipio.id} value={municipio.nome} />
                  ))}
                </datalist>
                {erroCidade ? (
                  <span className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle size={11} /> Selecione uma cidade válida
                  </span>
                ) : null}
              </div>
            </div>
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

          <div className="space-y-5 rounded-2xl border border-stone-100 bg-stone-50 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">
              Configuração do Sistema
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <div className="group relative flex w-max items-center gap-2">
                  <label className="text-xs font-semibold text-stone-600">
                    Sistema de Manejo *
                  </label>
                  <div className="cursor-help text-yellow-500">
                    <Lightbulb size={14} />
                  </div>
                  <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden w-72 rounded-xl bg-stone-800 p-4 text-xs text-stone-200 shadow-xl group-hover:block">
                    <div className="space-y-2">
                      <div>
                        <strong className="block text-white">Convencional</strong>
                        Revolvimento anual com aração e gradagem.
                      </div>
                      <div className="h-px bg-stone-700" />
                      <div>
                        <strong className="block text-white">PD Implantação</strong>
                        Fase inicial de transição para plantio direto.
                      </div>
                      <div className="h-px bg-stone-700" />
                      <div>
                        <strong className="block text-white">PD Consolidado</strong>
                        Sistema maduro, sem revolvimento e com boa palhada.
                      </div>
                    </div>
                    <div className="absolute left-6 top-full -mt-1 border-4 border-transparent border-t-stone-800" />
                  </div>
                </div>
                <select
                  {...register('sistema_manejo', {
                    onChange: (evento) => {
                      if (evento.target.value !== 'PD_CONSOLIDADO') {
                        setMonitoramentoAtivo(false);
                      }
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

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-600">
                  Tipo de Aplicação *
                </label>
                <select
                  {...register('primeira_calagem', {
                    setValueAs: (valor) => valor === 'true',
                  })}
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

            <div className="max-w-xs">
              <CampoNumerico
                label="PRNT (%) *"
                name="PRNT"
                min={0.1}
                max={100}
                placeholder="Ex: 90"
                register={register}
                error={errors.PRNT}
                dica="Parte 10: PRNT deve estar no intervalo (0, 100]."
              />
            </div>

            {isPDImplantacao ? (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-600">
                  Modo de Aplicação *
                </label>
                <select
                  {...register('opcao_superficial_campo_natural', {
                    setValueAs: (valor) => valor === 'true',
                  })}
                  className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm outline-none focus:border-green-500"
                >
                  <option value="false">Incorporado (padrão)</option>
                  <option value="true">Superficial — Campo Natural (SMP &gt; 5,5)</option>
                </select>
              </div>
            ) : null}
          </div>

          <div className="space-y-5 rounded-2xl border border-stone-100 bg-stone-50 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">
                Dados de Solo
              </h3>
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
                dica="Parte 10: SMP deve estar entre 4.4 e 7.1."
              />
            </div>

            {isPolinomial ? (
              <div className="space-y-4 rounded-2xl border border-green-200 bg-white p-5">
                <div>
                  <h4 className="text-sm font-bold text-stone-800">Bloco B3 — Método Polinomial</h4>
                  <p className="text-xs text-stone-500">
                    O formulário só exibe estes campos porque SMP &gt; 6,3.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <CampoNumerico
                    label="MO (%) *"
                    name="MO"
                    min={0}
                    max={100}
                    placeholder="Ex: 2,5"
                    register={register}
                    error={errors.MO}
                  />
                  <CampoNumerico
                    label="Al trocável (cmolc/dm³) *"
                    name="Al_trocavel"
                    min={0}
                    placeholder="Ex: 0,5"
                    register={register}
                    error={errors.Al_trocavel}
                  />
                </div>
              </div>
            ) : null}

            {isReaplicacaoSMP ? (
              <div className="space-y-4 rounded-2xl border border-blue-200 bg-white p-5">
                <div>
                  <h4 className="text-sm font-bold text-stone-800">
                    Bloco B1 — Saturação por Bases (referência)
                  </h4>
                  <p className="text-xs text-stone-500">
                    Estes campos só aparecem em reaplicação com método roteado para SMP.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <CampoNumerico
                    label="V atual (%) *"
                    name="V_atual"
                    min={0}
                    max={100}
                    placeholder="Ex: 55"
                    register={register}
                    error={errors.V_atual}
                  />
                  <CampoNumerico
                    label="CTC pH7 (cmolc/dm³) *"
                    name="CTC_pH7"
                    min={0.1}
                    placeholder="Ex: 10"
                    register={register}
                    error={errors.CTC_pH7}
                  />
                </div>
              </div>
            ) : null}

            {precisaAlSat ? (
              <div className="space-y-4 rounded-2xl border border-orange-200 bg-white p-5">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-stone-800">
                    Bloco B2 — Verificação da trava do PD Consolidado
                  </h4>
                  <p className="text-xs text-stone-500">
                    Como sistema_manejo = PD_CONSOLIDADO e pH_agua &lt; 5,5, o formulário
                    libera a coleta de Al_sat.
                  </p>
                </div>

                {!primeiraCalagem ? (
                  <>
                    {isReaplicacaoSMP ? (
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
                    )}
                  </>
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
                    <div className="text-xs text-stone-500">
                      Calcular Al_sat = (Al_trocavel / CTC_pH7) * 100
                    </div>
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
                        Al_trocavel já está visível no Bloco B3 e será reaproveitado no cálculo de Al_sat.
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

          {isPDConsolidado ? (
            <div className="space-y-5 rounded-2xl border border-stone-100 bg-stone-50 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-stone-500">
                    Monitoramento de Profundidade
                  </h3>
                  <p className="text-xs text-stone-500">
                    Módulo opcional e independente para a camada 10–20 cm.
                  </p>
                </div>
                <label className="flex cursor-pointer items-center gap-3 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700">
                  <input
                    type="checkbox"
                    checked={monitoramentoAtivo}
                    onChange={(evento) => setMonitoramentoAtivo(evento.target.checked)}
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
                    <label className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        {...register('monitoramento.disponibilidade_P_10_20_abaixo_critico')}
                        className="mt-0.5 h-4 w-4 rounded accent-green-600"
                      />
                      <span>Disponibilidade de P abaixo do crítico</span>
                    </label>
                    <label className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        {...register('monitoramento.compactacao_restringindo_raiz')}
                        className="mt-0.5 h-4 w-4 rounded accent-green-600"
                      />
                      <span>Compactação restringindo raiz</span>
                    </label>
                    <label className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        {...register('monitoramento.produtividade_abaixo_media')}
                        className="mt-0.5 h-4 w-4 rounded accent-green-600"
                      />
                      <span>Produtividade abaixo da média</span>
                    </label>
                  </div>

                  {restricao10_20 ? (
                    <div className="space-y-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-orange-900">
                          Restrição detectada na camada 10–20 cm
                        </h4>
                        <p className="text-xs text-orange-800">
                          {MSG_MONITORAMENTO_RESTRICAO}
                        </p>
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
                      Sem restrição 10–20 cm detectada com os dados atuais. Nenhum campo
                      adicional é solicitado.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div
            className={`rounded-2xl border p-5 transition-colors ${
              erroTermos ? 'border-red-200 bg-red-50' : 'border-stone-200 bg-stone-50'
            }`}
          >
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={termosAceitos}
                onChange={(evento) => {
                  setTermosAceitos(evento.target.checked);
                  setErroTermos(false);
                }}
                className="mt-0.5 h-5 w-5 cursor-pointer rounded accent-green-600"
              />
              <div className="flex-1 text-sm leading-relaxed text-stone-700">
                Li e concordo com os{' '}
                <button
                  type="button"
                  onClick={(evento) => {
                    evento.preventDefault();
                    setModalTermosOpen(true);
                  }}
                  className="font-bold text-green-600 hover:underline"
                >
                  Termos de Uso
                </button>
                .
                {erroTermos ? (
                  <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-500">
                    <ShieldCheck size={14} /> O aceite dos termos é obrigatório.
                  </span>
                ) : null}
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-4 font-semibold text-white shadow-lg transition-all hover:bg-stone-800 disabled:bg-stone-300"
          >
            {loading ? 'Processando...' : 'Calcular Recomendação'}
          </button>
        </form>
      </div>

      <div className="flex w-full flex-col border-t border-white/60 bg-gradient-to-br from-[#E8F3E8] to-[#F4F6F0] p-8 lg:w-2/5 lg:border-l lg:border-t-0 lg:p-12">
        <div className="relative z-10 flex h-full w-full flex-col justify-center">
          {mensagemApi ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-red-500 shadow-sm">
                  <AlertCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-stone-800">Não foi possível calcular</h2>
              </div>
              <div className="rounded-[1.5rem] border border-red-200 bg-white p-6 shadow-xl">
                <p className="text-sm font-bold uppercase tracking-wider text-red-600">
                  Feedback da validação
                </p>
                <p className="mt-3 text-sm leading-relaxed text-stone-700">{mensagemApi}</p>
              </div>
            </div>
          ) : resultado ? (
            <div className="space-y-6">
              <div className="mb-2 flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-green-500 shadow-sm">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-2xl font-bold text-stone-800">{tituloResultado}</h2>
              </div>

              {resultado.aplicar_calcario ? (
                <div className="rounded-[1.5rem] bg-white p-8 text-center shadow-xl">
                  <p className="mb-1 text-sm font-bold uppercase tracking-wider text-stone-400">
                    Dose para Produto Real
                  </p>
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
                  <p className="mb-2 text-sm font-bold uppercase tracking-wider text-stone-400">
                    Situação Atual
                  </p>
                  <p className="text-2xl font-bold text-stone-800">
                    Sem recomendação de aplicação
                  </p>
                  <p className="mt-2 text-sm text-stone-500">
                    O retorno do backend indica que não há calagem a recomendar neste momento.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/80 p-4 text-center shadow-sm">
                  <p className="mb-1 text-xs text-stone-400">NC base</p>
                  <p className="text-lg font-bold text-stone-700">
                    {resultado.NC_base?.toFixed(2) ?? '—'}{' '}
                    <span className="text-xs font-normal">t/ha</span>
                  </p>
                </div>
                <div className="rounded-xl bg-white/80 p-4 text-center shadow-sm">
                  <p className="mb-1 text-xs text-stone-400">NC final</p>
                  <p className="text-lg font-bold text-stone-700">
                    {resultado.NC_final?.toFixed(2) ?? '—'}{' '}
                    <span className="text-xs font-normal">t/ha</span>
                  </p>
                </div>
                <div className="rounded-xl bg-white/80 p-4 text-center shadow-sm">
                  <p className="mb-1 text-xs text-stone-400">Método</p>
                  <p className="text-sm font-bold text-stone-700">
                    {resultado.metodo_calc_roteado ?? '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-white/80 p-4 text-center shadow-sm">
                  <p className="mb-1 text-xs text-stone-400">Modo de aplicação</p>
                  <p className="text-sm font-bold text-stone-700">
                    {resultado.modo_aplicacao ?? '—'}
                  </p>
                </div>
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
                  {resultado.alertas.map((alerta, indice) => (
                    <div
                      key={`${alerta}-${indice}`}
                      className="flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800"
                    >
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <span>{alerta}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-4">
                <button
                  onClick={() => alert('Exportação de PDF será reintegrada em breve.')}
                  className="flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-white py-3 font-semibold text-green-700 shadow-sm hover:bg-green-50"
                >
                  <FileDown size={18} /> PDF
                </button>
                <button
                  onClick={handleTentarSalvar}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 font-semibold shadow-sm transition-all ${
                    salvo
                      ? 'bg-green-500 text-white'
                      : 'border border-stone-200 bg-white hover:bg-stone-50'
                  }`}
                >
                  {salvo ? (
                    <>
                      <Check size={18} /> Salvo!
                    </>
                  ) : (
                    <>
                      <Save size={18} /> Salvar
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
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
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col bg-[#F4F6F0] text-stone-800">
        <Header isLoggedIn={isLoggedIn} onLogout={() => setIsLoggedIn(false)} />
        <main className="flex flex-grow items-center justify-center p-4 md:p-8">
          <Routes>
            <Route path="/" element={<CalculadoraScreen isLoggedIn={isLoggedIn} />} />
            <Route path="/monitoramento" element={<MonitoramentoScreen />} />
            <Route
              path="/login"
              element={<LoginScreen onLogin={() => setIsLoggedIn(true)} />}
            />
            <Route
              path="/dashboard"
              element={
                isLoggedIn ? (
                  <DashboardScreen />
                ) : (
                  <LoginScreen onLogin={() => setIsLoggedIn(true)} />
                )
              }
            />
            <Route
              path="/dashboard/nova-analise"
              element={
                isLoggedIn ? (
                  <NovaAnaliseScreen />
                ) : (
                  <LoginScreen onLogin={() => setIsLoggedIn(true)} />
                )
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
