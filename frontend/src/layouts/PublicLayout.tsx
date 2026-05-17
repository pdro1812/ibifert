import { Link, Outlet } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Wraps public-facing routes (/, /login, /monitoramento).
 * Renders the top navigation bar and a centered content area.
 */
export function PublicLayout() {
  const { isLoggedIn, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6F0] text-stone-800">
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white shadow-sm">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-8">
          <Link to="/" className="flex items-center gap-3">
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
              to="/validacao"
              className="text-sm font-semibold text-stone-600 transition-colors hover:text-green-600"
            >
              Validação Agronômica
            </Link>
            <Link
              to="/monitoramento"
              className="text-sm font-semibold text-stone-600 transition-colors hover:text-green-600"
            >
              Monitoramento Regional
            </Link>
             <Link
              to="/historico"

              className="text-sm font-semibold text-stone-600 transition-colors hover:text-green-600"
            >
              Historico
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-sm font-semibold text-stone-700 transition-colors hover:text-green-600"
                >
                  Painel
                </Link>
                <button
                  onClick={logout}
                  className="text-sm font-semibold text-red-500 transition-colors hover:text-red-700"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-stone-600 transition-colors hover:text-green-600"
                >
                  Entrar
                </Link>
                <Link
                  to="/RegisterPage"
                  className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-stone-800"
                >
                  Criar Conta
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-grow items-center justify-center p-4 md:p-8">
        {/* Each public page renders here */}
        <Outlet />
      </main>
    </div>
  );
}