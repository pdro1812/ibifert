import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, MapPin, Plus, Tractor } from 'lucide-react';
import { ibgeService } from '../services/ibge';
import type { Estado, Municipio } from '../services/ibge';
import { Modal } from '../components/Modal';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Talhao {
  id: number;
  nome: string;
  cultura: string;
}

interface Fazenda {
  id: number;
  nome: string;
  municipio: string;
  uf: string;
  talhoes: Talhao[];
}

const CULTURAS_GRAOS = [
  'Soja', 'Milho', 'Trigo', 'Aveia', 'Cevada',
  'Feijão', 'Sorgo', 'Canola', 'Girassol', 'Outros grãos',
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function FazendasPage() {
  const navigate = useNavigate();

  // ── Local UI state (not global — lives only in this page) ────────────────
  const [fazendas, setFazendas] = useState<Fazenda[]>([
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

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSalvarFazenda = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const formData = new FormData(evento.currentTarget);
    const municipioDigitado = String(formData.get('municipio') ?? '');

    if (!municipios.some((m) => m.nome === municipioDigitado)) {
      alert('Por favor, selecione uma cidade válida da lista.');
      return;
    }

    setFazendas((prev) => [
      ...prev,
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
    const formData = new FormData(evento.currentTarget);
    const fazendaId = Number(formData.get('fazendaId'));
    const novoTalhao: Talhao = {
      id: Date.now(),
      nome: String(formData.get('nomeTalhao') ?? ''),
      cultura: String(formData.get('cultura') ?? ''),
    };

    setFazendas((prev) =>
      prev.map((f) =>
        f.id === fazendaId ? { ...f, talhoes: [...f.talhoes, novoTalhao] } : f
      )
    );
    setModalTalhaoOpen(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-6xl space-y-8">
      {/* Header bar */}
      <div className="flex flex-col justify-between gap-6 rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-stone-800">Minhas Propriedades</h2>
          <p className="text-stone-500">Gerencie suas fazendas, talhões e históricos de solo.</p>
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

      {/* Fazendas list */}
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
                  <p className="text-sm text-stone-500">{fazenda.municipio}, {fazenda.uf}</p>
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
                <p className="text-sm italic text-stone-400">Nenhum talhão cadastrado.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {fazenda.talhoes.map((talhao) => (
                    <div
                      key={talhao.id}
                      className="group cursor-pointer rounded-xl border border-stone-100 p-4 transition-all hover:border-green-200 hover:shadow-md"
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <Tractor className="text-stone-300 transition-colors group-hover:text-green-500" size={24} />
                        <span className="rounded-md bg-green-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-green-700">
                          {talhao.cultura}
                        </span>
                      </div>
                      <h4 className="font-bold text-stone-800">{talhao.nome}</h4>
                      <p className="mt-2 text-xs text-stone-500">Sem análises recentes</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Nova Fazenda */}
      <Modal isOpen={modalFazendaOpen} onClose={() => setModalFazendaOpen(false)} titulo="Cadastrar Nova Fazenda">
        <form onSubmit={handleSalvarFazenda} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-stone-700">Nome da Fazenda</label>
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
                onChange={(e) => {
                  setUfSelecionada(e.target.value);
                  if (!e.target.value) setMunicipios([]);
                }}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-green-500"
              >
                <option value="">UF</option>
                {estados.map((estado) => (
                  <option key={estado.id} value={estado.sigla}>{estado.sigla}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-semibold text-stone-700">Município</label>
              <input
                name="municipio"
                required
                list="lista-municipios-fazenda"
                disabled={municipios.length === 0}
                placeholder={ufSelecionada ? 'Digite para buscar...' : 'Selecione o Estado'}
                autoComplete="off"
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-green-500 disabled:opacity-50"
              />
              <datalist id="lista-municipios-fazenda">
                {municipios.map((m) => <option key={m.id} value={m.nome} />)}
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

      {/* Modal: Novo Talhão */}
      <Modal isOpen={modalTalhaoOpen} onClose={() => setModalTalhaoOpen(false)} titulo="Cadastrar Novo Talhão">
        <form onSubmit={handleSalvarTalhao} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-stone-700">Fazenda</label>
            <select
              name="fazendaId"
              required
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-green-500"
            >
              {fazendas.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-stone-700">Nome do Talhão</label>
            <input
              name="nomeTalhao"
              required
              placeholder="Ex: Talhão 1"
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-stone-700">Cultura Principal</label>
            <select
              name="cultura"
              required
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-green-500"
            >
              <option value="">Selecione...</option>
              {CULTURAS_GRAOS.map((c) => (
                <option key={c} value={c}>{c}</option>
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
}