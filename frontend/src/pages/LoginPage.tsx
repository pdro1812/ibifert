import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Leaf, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// ─── Schema ──────────────────────────────────────────────────────────────────

const LoginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Mínimo de 6 caracteres'),
});

type LoginFormValues = z.infer<typeof LoginSchema>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [apiError, setApiError] = useState<string | null>(null);

  // Redirect to the page the user was trying to access, or dashboard
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: 'teste@email.com', senha: '123456' },
  });

  const onSubmit = async ({ email, senha }: LoginFormValues) => {
    setApiError(null);
    try {
      await login(email, senha);

      // Handle pending analysis redirect saved before auth
      const pendente = sessionStorage.getItem('analisePendente');
      if (pendente) {
        sessionStorage.removeItem('analisePendente');
        navigate('/dashboard/nova-analise', { replace: true });
        return;
      }

      navigate(from, { replace: true });
    } catch {
      setApiError('Credenciais inválidas. Tente novamente.');
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div className="rounded-2xl border border-stone-100 bg-white p-8 shadow-xl">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-green-600 shadow-lg">
            <Leaf className="text-white" size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-800">Acesso ao Produtor</h1>
            <p className="text-sm text-stone-500">Entre na sua conta Ibiferti</p>
          </div>
        </div>

        {/* API-level error */}
        {apiError ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={16} className="shrink-0" />
            {apiError}
          </div>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
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

          {/* Password */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-stone-700">Senha</label>
            <input
              type="password"
              autoComplete="current-password"
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-4 font-bold text-white shadow-lg transition-all hover:bg-green-700 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Entrando...
              </>
            ) : (
              'Entrar na Plataforma'
            )}
          </button>
        </form>
      </div>

      {/* Register link */}
      <p className="mt-4 text-center text-sm text-stone-500">
        Ainda não tem conta?{' '}
        <Link to="/cadastro" className="font-semibold text-green-600 hover:underline">
          Criar conta grátis
        </Link>
      </p>
    </div>
  );
}