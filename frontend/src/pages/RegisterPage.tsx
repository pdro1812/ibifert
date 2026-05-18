import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Leaf, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// ─── Schema ──────────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cpf: z.string().min(11, 'CPF inválido'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Mínimo de 6 caracteres'),
  cidade: z.string().min(2, 'Cidade é obrigatória'),
  estado: z.string().length(2, 'Use a sigla do estado (Ex: RS)'),
  telefone: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof RegisterSchema>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export function RegisterPage() {
  // Nota: Ajuste o nome da função ('cadastrar') conforme o que estiver no seu AuthContext
  const { cadastrar } = useAuth(); 
  const navigate = useNavigate();
  const location = useLocation();
  const [apiError, setApiError] = useState<string | null>(null);

  // Redirecionamento após sucesso
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { 
      nome: '', 
      cpf: '', 
      email: '', 
      senha: '', 
      cidade: '', 
      estado: '', 
      telefone: '' 
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setApiError(null);
    try {
      await cadastrar(data);

      // Lida com redirecionamento de análise pendente caso o usuário tenha chegado aqui por lá
      const pendente = sessionStorage.getItem('analisePendente');
      if (pendente) {
        sessionStorage.removeItem('analisePendente');
        navigate('/dashboard/nova-analise', { replace: true });
        return;
      }

      navigate(from, { replace: true });
    } catch (error) {
      setApiError('Ocorreu um erro ao criar a conta. Verifique os dados e tente novamente.');
    }
  };

  return (
    <div className="w-full max-w-md my-8">
      {/* Card */}
      <div className="rounded-2xl border border-stone-100 bg-white p-8 shadow-xl">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-green-600 shadow-lg">
            <Leaf className="text-white" size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-800">Criar Conta</h1>
            <p className="text-sm text-stone-500">Junte-se à Ibiferti</p>
          </div>
        </div>

        {/* API-level error */}
        {apiError ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={16} className="shrink-0" />
            {apiError}
          </div>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          
          {/* Nome */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-stone-700">Nome Completo</label>
            <input
              type="text"
              autoComplete="name"
              {...register('nome')}
              className={`w-full rounded-xl border px-4 py-3 outline-none transition-all ${
                errors.nome
                  ? 'border-red-400 bg-red-50'
                  : 'border-stone-200 bg-stone-50 focus:border-green-500 focus:bg-white'
              }`}
            />
            {errors.nome ? (
              <span className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle size={11} /> {errors.nome.message}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* CPF */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-stone-700">CPF</label>
              <input
                type="text"
                placeholder="Apenas números"
                {...register('cpf')}
                className={`w-full rounded-xl border px-4 py-3 outline-none transition-all ${
                  errors.cpf
                    ? 'border-red-400 bg-red-50'
                    : 'border-stone-200 bg-stone-50 focus:border-green-500 focus:bg-white'
                }`}
              />
              {errors.cpf ? (
                <span className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle size={11} /> {errors.cpf.message}
                </span>
              ) : null}
            </div>

            {/* Telefone */}
            <div className="space-y-1">
              <label className="text-sm font-semibold text-stone-700">Telefone <span className="text-stone-400 font-normal">(Opcional)</span></label>
              <input
                type="tel"
                autoComplete="tel"
                {...register('telefone')}
                className={`w-full rounded-xl border px-4 py-3 outline-none transition-all ${
                  errors.telefone
                    ? 'border-red-400 bg-red-50'
                    : 'border-stone-200 bg-stone-50 focus:border-green-500 focus:bg-white'
                }`}
              />
              {errors.telefone ? (
                <span className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle size={11} /> {errors.telefone.message}
                </span>
              ) : null}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-stone-700">E-mail</label>
            <input
              type="email"
              autoComplete="email"
              {...register('email')}
              className={`w-full rounded-xl border px-4 py-3 outline-none transition-all ${
                errors.email
                  ? 'border-red-400 bg-red-50'
                  : 'border-stone-200 bg-stone-50 focus:border-green-500 focus:bg-white'
              }`}
            />
            {errors.email ? (
              <span className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle size={11} /> {errors.email.message}
              </span>
            ) : null}
          </div>

          {/* Senha */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-stone-700">Senha</label>
            <input
              type="password"
              autoComplete="new-password"
              {...register('senha')}
              className={`w-full rounded-xl border px-4 py-3 outline-none transition-all ${
                errors.senha
                  ? 'border-red-400 bg-red-50'
                  : 'border-stone-200 bg-stone-50 focus:border-green-500 focus:bg-white'
              }`}
            />
            {errors.senha ? (
              <span className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle size={11} /> {errors.senha.message}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Cidade */}
            <div className="col-span-2 space-y-1">
              <label className="text-sm font-semibold text-stone-700">Cidade</label>
              <input
                type="text"
                {...register('cidade')}
                className={`w-full rounded-xl border px-4 py-3 outline-none transition-all ${
                  errors.cidade
                    ? 'border-red-400 bg-red-50'
                    : 'border-stone-200 bg-stone-50 focus:border-green-500 focus:bg-white'
                }`}
              />
              {errors.cidade ? (
                <span className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle size={11} /> {errors.cidade.message}
                </span>
              ) : null}
            </div>

            {/* Estado */}
            <div className="col-span-1 space-y-1">
              <label className="text-sm font-semibold text-stone-700">UF</label>
              <input
                type="text"
                placeholder="RS"
                maxLength={2}
                {...register('estado')}
                className={`w-full rounded-xl border px-4 py-3 outline-none transition-all uppercase ${
                  errors.estado
                    ? 'border-red-400 bg-red-50'
                    : 'border-stone-200 bg-stone-50 focus:border-green-500 focus:bg-white'
                }`}
              />
              {errors.estado ? (
                <span className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle size={11} /> {errors.estado.message}
                </span>
              ) : null}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-4 font-bold text-white shadow-lg transition-all hover:bg-green-700 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Criando conta...
              </>
            ) : (
              'Criar Minha Conta'
            )}
          </button>
        </form>
      </div>

      {/* Login link */}
      <p className="mt-4 pb-8 text-center text-sm text-stone-500">
        Já possui uma conta?{' '}
        <Link to="/login" className="font-semibold text-green-600 hover:underline">
          Fazer login
        </Link>
      </p>
    </div>
  );
}