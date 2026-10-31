// frontend/src/pages/FazendasPage.tsx

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, MapPin, Pencil, Plus, Tractor } from 'lucide-react';
import { ibgeService } from '../services/ibge';
import type { Municipio } from '../services/ibge';
import { ESTADOS_ATENDIDOS } from '../constants/estados';
import { Modal } from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import {
  getFazendas,
  postFazenda,
  putFazenda,
  deleteFazendaApi,
  postTalhao,
  deleteTalhaoApi,
  putTalhao,
} from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Talhao {
  id: string;
  nome: string;
  cultura: string;
  ultimaAnalise?: {
    id: string;
    criado_em: string;
    NC_ajustada: number | null;
    aplicar_calcario: boolean | null;
  } | null;
}

interface Fazenda {
  id: string;
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
  const { user } = useAuth();

  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalFazendaOpen, setModalFazendaOpen] = useState(false);
  const [modalTalhaoOpen, setModalTalhaoOpen] = useState(false);
  // null = cadastro; preenchido = edição do registro existente
  const [fazendaEmEdicao, setFazendaEmEdicao] = useState<Fazenda | null>(null);
  const [talhaoEmEdicao, setTalhaoEmEdicao] = useState<{ fazendaId: string; talhao: Talhao } | null>(null);
  const [fazendaIdNovoTalhao, setFazendaIdNovoTalhao] = useState<string>('');

  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [ufSelecionada, setUfSelecionada] = useState('RS');

  // ── Carrega dados iniciais ──────────────────────────────────────────────────

  useEffect(() => {
    // Se for admin, redireciona para a visão geral
    if (user?.role === 'ADMIN') {
      navigate('/admin', { replace: true });
      return;
    }

    getFazendas()
      .then(setFazendas)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, navigate]);


  useEffect(() => {
    if (ufSelecionada) {
      ibgeService.getMunicipios(ufSelecionada).then(setMunicipios);
    }
  }, [ufSelecionada]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const abrirNovaFazenda = () => {
    setFazendaEmEdicao(null);
    setUfSelecionada('RS');
    setModalFazendaOpen(true);
  };

  const abrirEdicaoFazenda = (fazenda: Fazenda) => {
    setFazendaEmEdicao(fazenda);
    setUfSelecionada(fazenda.uf);
    setModalFazendaOpen(true);
  };

  const fecharModalFazenda = () => {
    setModalFazendaOpen(false);
    setFazendaEmEdicao(null);
  };

  const abrirNovoTalhao = (fazendaId = '') => {
    setTalhaoEmEdicao(null);
    setFazendaIdNovoTalhao(fazendaId);
    setModalTalhaoOpen(true);
  };

  const abrirEdicaoTalhao = (fazendaId: string, talhao: Talhao) => {
    setTalhaoEmEdicao({ fazendaId, talhao });
    setModalTalhaoOpen(true);
  };

  const fecharModalTalhao = () => {
    setModalTalhaoOpen(false);
    setTalhaoEmEdicao(null);
  };

  const handleSalvarFazenda = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const formData = new FormData(evento.currentTarget);
    const municipioDigitado = String(formData.get('municipio') ?? '');

    if (!municipios.some((m) => m.nome === municipioDigitado)) {
      alert('Por favor, selecione uma cidade válida da lista.');
      return;
    }

    const dados = {
      nome: String(formData.get('nomeFazenda') ?? ''),
      uf: String(formData.get('uf') ?? ''),
      municipio: municipioDigitado,
    };

    try {
      if (fazendaEmEdicao) {
        const atualizada = await putFazenda(fazendaEmEdicao.id, dados);
        setFazendas((prev) =>
          prev.map((f) => (f.id === fazendaEmEdicao.id ? { ...f, ...atualizada, talhoes: f.talhoes } : f))
        );
      } else {
        const novaFazenda = await postFazenda(dados);
        setFazendas((prev) => [...prev, { ...novaFazenda, talhoes: [] }]);
      }
      fecharModalFazenda();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar propriedade.');
    }
  };

  const handleSalvarTalhao = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const formData = new FormData(evento.currentTarget);
    const dados = {
      nome: String(formData.get('nomeTalhao') ?? ''),
      cultura: String(formData.get('cultura') ?? ''),
    };

    try {
      if (talhaoEmEdicao) {
        const { fazendaId, talhao } = talhaoEmEdicao;
        const atualizado = await putTalhao(talhao.id, dados);
        setFazendas((prev) =>
          prev.map((f) =>
            f.id === fazendaId
              ? { ...f, talhoes: f.talhoes.map((t) => (t.id === talhao.id ? { ...t, ...atualizado } : t)) }
              : f
          )
        );
      } else {
        const fazendaId = String(formData.get('fazendaId') ?? '');
        const novoTalhao = await postTalhao(fazendaId, dados);
        setFazendas((prev) =>
          prev.map((f) =>
            f.id === fazendaId ? { ...f, talhoes: [...f.talhoes, novoTalhao] } : f
          )
        );
      }
      fecharModalTalhao();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar talhão.');
    }
  };

  const handleDeletarFazenda = async (id: string) => {
    if (!confirm('Remover esta propriedade e todos os seus talhões? As análises já feitas continuam no seu histórico.')) return;
    try {
      await deleteFazendaApi(id);
      setFazendas((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error(err);
      alert('Erro ao remover propriedade.');
    }
  };

  const handleDeletarTalhao = async (fazendaId: string, talhaoId: string) => {
    if (!confirm('Remover este talhão?')) return;
    try {
      await deleteTalhaoApi(talhaoId);
      setFazendas((prev) =>
        prev.map((f) =>
          f.id === fazendaId
            ? { ...f, talhoes: f.talhoes.filter((t) => t.id !== talhaoId) }
            : f
        )
      );
    } catch (err) {
      console.error(err);
      alert('Erro ao remover talhão.');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-6xl space-y-8">
      {/* Header bar */}
      <div className="flex flex-col justify-between gap-6 rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-stone-800">Minhas Propriedades</h2>
          <p className="text-stone-500">Gerencie suas propriedades, talhões e históricos de solo.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={abrirNovaFazenda}
            className="rounded-lg border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-700 transition-colors hover:bg-stone-50"
          >
            + Nova Propriedade
          </button>
          <button
            onClick={() => abrirNovoTalhao()}
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
      {loading ? (
        <p className="text-sm text-stone-400">Carregando...</p>
      ) : (
        <div className="space-y-6">
          {fazendas.length === 0 && (
            <p className="text-sm italic text-stone-400">Nenhuma propriedade cadastrada.</p>
          )}
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
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => abrirNovoTalhao(fazenda.id)}
                    className="flex items-center gap-1 text-sm font-semibold text-green-600 hover:text-green-700"
                  >
                    <Plus size={16} /> Adicionar Talhão
                  </button>
                  <button
                    onClick={() => abrirEdicaoFazenda(fazenda)}
                    className="flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-stone-800"
                  >
                    <Pencil size={14} /> Editar
                  </button>
                  <button
                    onClick={() => handleDeletarFazenda(fazenda.id)}
                    className="text-sm font-semibold text-red-400 hover:text-red-600"
                  >
                    Remover
                  </button>
                </div>
              </div>
              <div className="p-6">
                {fazenda.talhoes.length === 0 ? (
                  <p className="text-sm italic text-stone-400">Nenhum talhão cadastrado.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {fazenda.talhoes.map((talhao) => (
                      <div
                        key={talhao.id}
                        onClick={() => navigate(`/dashboard/talhao/${talhao.id}`)}
                        className="group relative cursor-pointer rounded-xl border border-stone-100 p-4 transition-all hover:border-green-200 hover:shadow-md"
                      >
                        <div className="mb-2 flex items-start justify-between">
                          <Tractor className="text-stone-300 transition-colors group-hover:text-green-500" size={24} />
                          <span className="rounded-md bg-green-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-green-700">
                            {talhao.cultura}
                          </span>
                        </div>
                        <h4 className="font-bold text-stone-800">{talhao.nome}</h4>
                        {talhao.ultimaAnalise ? (
                          <div className="mt-2 space-y-1">
                            <p className="text-[10px] font-bold uppercase text-stone-400">Último Diagnóstico</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-stone-600">
                                {talhao.ultimaAnalise.aplicar_calcario ? (
                                  <span className="text-green-600 font-bold">{talhao.ultimaAnalise.NC_ajustada?.toFixed(2)} t/ha</span>
                                ) : (
                                  <span className="text-stone-400">Não aplicar</span>
                                )}
                              </span>
                              <span className="text-[10px] text-stone-400">
                                {new Date(talhao.ultimaAnalise.criado_em).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-stone-500">Sem análises recentes</p>
                        )}
                        <div className="mt-3 flex items-center gap-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); abrirEdicaoTalhao(fazenda.id, talhao); }}
                            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 transition-colors hover:text-stone-700"
                          >
                            <Pencil size={11} /> Editar
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeletarTalhao(fazenda.id, talhao.id); }}
                            className="text-[10px] font-bold uppercase tracking-wider text-red-300 transition-colors hover:text-red-500"
                          >
                            Remover Talhão
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Nova / Editar Fazenda */}
      <Modal
        isOpen={modalFazendaOpen}
        onClose={fecharModalFazenda}
        titulo={fazendaEmEdicao ? 'Editar Propriedade' : 'Cadastrar Nova Propriedade'}
      >
        <form key={fazendaEmEdicao?.id ?? 'nova'} onSubmit={handleSalvarFazenda} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-stone-700">Nome da Propriedade</label>
            <input
              name="nomeFazenda"
              required
              defaultValue={fazendaEmEdicao?.nome}
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
                  const municipio = e.currentTarget.form?.elements.namedItem('municipio');
                  if (municipio instanceof HTMLInputElement) municipio.value = '';
                }}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-green-500"
              >
                {ESTADOS_ATENDIDOS.map((estado) => (
                  <option key={estado.sigla} value={estado.sigla}>{estado.sigla}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-semibold text-stone-700">Município</label>
              <input
                name="municipio"
                required
                defaultValue={fazendaEmEdicao?.municipio}
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
            {fazendaEmEdicao ? 'Salvar Alterações' : 'Salvar Propriedade'}
          </button>
        </form>
      </Modal>

      {/* Modal: Novo / Editar Talhão */}
      <Modal
        isOpen={modalTalhaoOpen}
        onClose={fecharModalTalhao}
        titulo={talhaoEmEdicao ? 'Editar Talhão' : 'Cadastrar Novo Talhão'}
      >
        <form
          key={talhaoEmEdicao?.talhao.id ?? `novo-${fazendaIdNovoTalhao}`}
          onSubmit={handleSalvarTalhao}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-semibold text-stone-700">Propriedade</label>
            <select
              name="fazendaId"
              required
              defaultValue={talhaoEmEdicao?.fazendaId ?? (fazendaIdNovoTalhao || undefined)}
              disabled={talhaoEmEdicao !== null}
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
              defaultValue={talhaoEmEdicao?.talhao.nome}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-stone-700">Cultura Principal</label>
            <select
              name="cultura"
              required
              defaultValue={talhaoEmEdicao?.talhao.cultura}
              className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-green-500"
            >
              <option value="">Selecione...</option>
              {talhaoEmEdicao && !CULTURAS_GRAOS.includes(talhaoEmEdicao.talhao.cultura) ? (
                <option value={talhaoEmEdicao.talhao.cultura}>{talhaoEmEdicao.talhao.cultura}</option>
              ) : null}
              {CULTURAS_GRAOS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-stone-900 py-3 font-bold text-white transition-all hover:bg-stone-800"
          >
            {talhaoEmEdicao ? 'Salvar Alterações' : 'Salvar Talhão'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
