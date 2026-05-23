import { Link, NavLink } from 'react-router-dom';
import { Leaf, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Navbar() {
  const { isLoggedIn, logout, user } = useAuth();

  return (
    <header className="sticky top-0 z-[60] border-b border-stone-200 bg-white shadow-sm">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-green-600 shadow-md">
            <Leaf className="text-white" size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-stone-800">Ibiferti</h1>
        </Link>

        {/* Links Centrais (Desktop) */}
        <nav className="hidden items-center gap-8 md:flex text-stone-600">
          <NavLink
            to="/"
            className={({ isActive }) => 
              `text-sm font-bold transition-all hover:text-green-600 ${isActive ? 'text-green-600' : ''}`
            }
          >
            Calculadora
          </NavLink>
          <NavLink
            to="/validacao"
            className={({ isActive }) => 
              `text-sm font-bold transition-all hover:text-green-600 ${isActive ? 'text-green-600' : ''}`
            }
          >
            Validação Profe
          </NavLink>
          <NavLink
            to="/monitoramento"
            className={({ isActive }) => 
              `text-sm font-bold transition-all hover:text-green-600 ${isActive ? 'text-green-600' : ''}`
            }
          >
            Monitoramento Regional
          </NavLink>
        </nav>

        {/* Auth / Painel */}
        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <Link
                to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'}
                className="hidden md:block text-sm font-bold text-stone-700 bg-stone-100 px-4 py-2 rounded-xl hover:bg-green-50 hover:text-green-700 transition-all"
              >
                Meu Painel
              </Link>
              <button
                onClick={logout}
                className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                title="Sair"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-bold text-stone-600 hover:text-green-600 transition-all px-2"
              >
                Entrar
              </Link>
              <Link
                to="/RegisterPage"
                className="hidden sm:block rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-stone-800"
              >
                Criar Conta
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
