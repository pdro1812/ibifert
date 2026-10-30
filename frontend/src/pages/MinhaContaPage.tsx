import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, Trash2, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function MinhaContaPage() {
  const { user, excluirConta } = useAuth();
  const navigate = useNavigate();
  const [senha, setSenha] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const handleExcluir = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirmado || !senha) return;
    setErro(null);
    setExcluindo(true);
    try {
      await excluirConta(senha);
      navigate('/', { replace: true });
    } catch (error) {
      const resposta = (error as { response?: { data?: { erro?: string } } }).response;
      setErro(resposta?.data?.erro ?? 'Não foi possível excluir a conta. Tente novamente.');
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Minha conta</h1>

      <section className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
            <User size={20} className="text-stone-500" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-stone-800">{user?.nome}</p>
            <p className="truncate text-sm text-stone-500">{user?.email}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold text-red-600">
          <Trash2 size={18} /> Excluir minha conta
        </h2>

        {isAdmin ? (
          <p className="mt-2 text-sm text-stone-500">
            Contas de administrador não podem ser excluídas por aqui. Peça a outro administrador para remover o acesso.
          </p>
        ) : (
          <form onSubmit={handleExcluir} className="mt-3 space-y-4">
            <p className="text-sm text-stone-600">
              Apaga definitivamente seu cadastro e todos os dados ligados a ele: propriedades, talhões e
              análises de calagem e adubação. Essa ação não pode ser desfeita.
            </p>

            {erro ? (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle size={16} className="shrink-0" />
                {erro}
              </div>
            ) : null}

            <div className="space-y-1">
              <label htmlFor="senha-exclusao" className="text-sm font-semibold text-stone-700">
                Confirme com sua senha
              </label>
              <input
                id="senha-exclusao"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition-all focus:border-red-400 focus:bg-white"
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-stone-600">
              <input
                type="checkbox"
                checked={confirmado}
                onChange={(e) => setConfirmado(e.target.checked)}
                className="mt-0.5"
              />
              Entendo que meus dados serão apagados permanentemente.
            </label>

            <button
              type="submit"
              disabled={!confirmado || !senha || excluindo}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-red-700 disabled:opacity-50"
            >
              {excluindo ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Excluir minha conta
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
