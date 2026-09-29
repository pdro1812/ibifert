import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2, MessageSquareWarning, Send } from 'lucide-react';

import { FeedbackSchema, type EntradaFeedback } from '../schemas/feedbackSchema';
import { postFeedback } from '../services/api';
import { ibgeService } from '../services/ibge';
import type { Estado, Municipio } from '../services/ibge';

export function FeedbackPage() {
  const [estados, setEstados] = useState<Estado[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erroApi, setErroApi] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<EntradaFeedback>({
    resolver: zodResolver(FeedbackSchema),
  });

  const ufSelecionada = useWatch({ control, name: 'uf' });

  useEffect(() => { ibgeService.getEstados().then(setEstados); }, []);
  useEffect(() => {
    if (ufSelecionada) ibgeService.getMunicipios(ufSelecionada).then(setMunicipios);
  }, [ufSelecionada]);

  const onSubmit = async (dados: EntradaFeedback) => {
    setLoading(true);
    setErroApi(null);
    try {
      await postFeedback(dados);
      setEnviado(true);
      reset();
      setMunicipios([]);
    } catch {
      setErroApi('Não foi possível enviar seu feedback agora. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg">
      <div className="rounded-2xl border border-stone-100 bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-green-600 shadow-lg">
            <MessageSquareWarning className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-stone-800">Reportar um problema</h1>
            <p className="text-sm text-stone-500">
              Encontrou algo estranho usando o Ibiferti? Conta pra gente aqui — não precisa estar logado.
            </p>
          </div>
        </div>

        {enviado ? (
          <div className="space-y-4 rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-green-600 shadow-sm">
              <CheckCircle2 size={26} />
            </div>
            <div>
              <p className="font-bold text-green-800">Recebemos seu feedback!</p>
              <p className="mt-1 text-sm text-green-700">Obrigado por ajudar a melhorar o sistema.</p>
            </div>
            <button
              type="button"
              onClick={() => setEnviado(false)}
              className="text-sm font-semibold text-green-700 underline hover:text-green-800"
            >
              Enviar outro feedback
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-600">Nome *</label>
              <input
                type="text"
                placeholder="Seu nome"
                {...register('nome')}
                className={`w-full rounded-xl border px-4 py-3 shadow-sm outline-none transition-all ${
                  errors.nome ? 'border-red-400 bg-red-50' : 'border-stone-200 bg-white focus:border-green-500'
                }`}
              />
              {errors.nome ? (
                <span className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle size={11} /> {errors.nome.message}
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-600">Telefone *</label>
                <input
                  type="tel"
                  placeholder="(00) 00000-0000"
                  {...register('telefone')}
                  className={`w-full rounded-xl border px-4 py-3 shadow-sm outline-none transition-all ${
                    errors.telefone ? 'border-red-400 bg-red-50' : 'border-stone-200 bg-white focus:border-green-500'
                  }`}
                />
                {errors.telefone ? (
                  <span className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle size={11} /> {errors.telefone.message}
                  </span>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="flex justify-between text-xs font-semibold text-stone-600">
                  E-mail <span className="font-normal text-stone-400">Opcional</span>
                </label>
                <input
                  type="email"
                  placeholder="voce@email.com"
                  {...register('email')}
                  className={`w-full rounded-xl border px-4 py-3 shadow-sm outline-none transition-all ${
                    errors.email ? 'border-red-400 bg-red-50' : 'border-stone-200 bg-white focus:border-green-500'
                  }`}
                />
                {errors.email ? (
                  <span className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle size={11} /> {errors.email.message}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-600">Estado *</label>
                <select
                  {...register('uf', {
                    onChange: (e) => { if (!e.target.value) setMunicipios([]); },
                  })}
                  className={`w-full rounded-xl border px-4 py-3 shadow-sm outline-none transition-all ${
                    errors.uf ? 'border-red-400 bg-red-50' : 'border-stone-200 bg-white focus:border-green-500'
                  }`}
                >
                  <option value="">UF</option>
                  {estados.map((estado) => (
                    <option key={estado.id} value={estado.sigla}>{estado.sigla}</option>
                  ))}
                </select>
                {errors.uf ? (
                  <span className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle size={11} /> {errors.uf.message}
                  </span>
                ) : null}
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-stone-600">Cidade *</label>
                <input
                  list="lista-municipios-feedback"
                  placeholder={ufSelecionada ? 'Digite para buscar...' : 'Selecione o Estado'}
                  disabled={!ufSelecionada || municipios.length === 0}
                  autoComplete="off"
                  {...register('cidade')}
                  className={`w-full rounded-xl border px-4 py-3 shadow-sm outline-none transition-all disabled:opacity-50 ${
                    errors.cidade ? 'border-red-400 bg-red-50' : 'border-stone-200 bg-white focus:border-green-500'
                  }`}
                />
                <datalist id="lista-municipios-feedback">
                  {municipios.map((m) => <option key={m.id} value={m.nome} />)}
                </datalist>
                {errors.cidade ? (
                  <span className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle size={11} /> {errors.cidade.message}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-600">O que aconteceu? *</label>
              <textarea
                rows={5}
                placeholder="Descreva o problema, dúvida ou sugestão..."
                {...register('descricao')}
                className={`w-full rounded-xl border px-4 py-3 shadow-sm outline-none transition-all ${
                  errors.descricao ? 'border-red-400 bg-red-50' : 'border-stone-200 bg-white focus:border-green-500'
                }`}
              />
              {errors.descricao ? (
                <span className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle size={11} /> {errors.descricao.message}
                </span>
              ) : null}
            </div>

            {erroApi ? (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle size={16} className="shrink-0" /> {erroApi}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-4 font-semibold text-white shadow-lg transition-all hover:bg-stone-800 disabled:bg-stone-300"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Enviando...
                </>
              ) : (
                <>Enviar <Send size={16} /></>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
