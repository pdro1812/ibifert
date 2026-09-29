import { useEffect, useState } from 'react';
import { Calendar, Loader2, Mail, MapPin, MessageSquareWarning, Phone, Search } from 'lucide-react';
import { getFeedbacksAdmin, type FeedbackItem } from '../services/api';

export function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    getFeedbacksAdmin()
      .then(setFeedbacks)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filtrados = feedbacks.filter((f) =>
    f.nome.toLowerCase().includes(busca.toLowerCase()) ||
    f.cidade.toLowerCase().includes(busca.toLowerCase()) ||
    f.descricao.toLowerCase().includes(busca.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-stone-800">
            <MessageSquareWarning className="text-green-600" size={22} />
            Feedback e Problemas Reportados
          </h1>
          <p className="text-stone-500">
            {feedbacks.length} {feedbacks.length === 1 ? 'mensagem recebida' : 'mensagens recebidas'}, de usuários logados ou não.
          </p>
        </div>

        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            type="text"
            placeholder="Nome, cidade ou descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-green-500"
          />
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-white p-12 text-center text-stone-400">
          {feedbacks.length === 0 ? 'Nenhum feedback recebido ainda.' : 'Nenhum resultado para essa busca.'}
        </div>
      ) : (
        <div className="space-y-4">
          {filtrados.map((f) => (
            <div key={f.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-stone-800">{f.nome}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                    <span className="flex items-center gap-1">
                      <Phone size={12} /> {f.telefone}
                    </span>
                    {f.email ? (
                      <span className="flex items-center gap-1">
                        <Mail size={12} /> {f.email}
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1">
                      <MapPin size={12} /> {f.cidade} / {f.uf}
                    </span>
                  </div>
                </div>
                <span className="flex items-center gap-1 whitespace-nowrap text-xs text-stone-400">
                  <Calendar size={12} />
                  {new Date(f.criado_em).toLocaleString('pt-BR')}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap rounded-xl bg-stone-50 p-3 text-sm text-stone-700">
                {f.descricao}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
