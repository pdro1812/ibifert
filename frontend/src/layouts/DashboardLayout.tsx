import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  LogOut,
  User,
  Users,
  BarChart3,
  Home,
  Database,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';

// Itens específicos do Painel (que não estão no menu superior)
const PRODUTOR_SIDEBAR_ITEMS = [
  { to: '/dashboard', icon: Home, label: 'Propriedades', end: true },
  { to: '/dashboard/nova-analise', icon: FlaskConical, label: 'Inserção Rápida' },
  { to: '/historico', icon: Database, label: 'Histórico' },
];

const ADMIN_SIDEBAR_ITEMS = [
  { to: '/admin', icon: BarChart3, label: 'Visão Geral', end: true },
  { to: '/admin/usuarios', icon: Users, label: 'Usuários' },
  { to: '/admin/analises', icon: Database, label: 'Amostras' },
];

/**
 * Persistent shell for all authenticated pages.
 * Renders a shared Navbar at the top and a sidebar for dashboard-specific links.
 */
export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isAdmin = user?.role === 'ADMIN';
  const sidebarItems = isAdmin ? ADMIN_SIDEBAR_ITEMS : PRODUTOR_SIDEBAR_ITEMS;

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6F0]">
      {/* ── Top Navigation (Shared) ─────────────────────────────────── */}
      <Navbar />

      <div className="flex flex-1">
        {/* ── Sidebar (desktop) ─────────────────────────────────────────── */}
        <aside className="hidden w-64 flex-col border-r border-stone-200 bg-white shadow-sm md:flex">
          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {sidebarItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-green-50 text-green-700'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* User info + logout */}
          <div className="border-t border-stone-100 p-4">
            <div className="flex items-center gap-3 rounded-xl p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100">
                <User size={16} className="text-stone-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-stone-800">
                  {user?.nome ?? '—'}
                </p>
                <p className="truncate text-xs text-stone-400">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
            >
              <LogOut size={18} /> Sair
            </button>
          </div>
        </aside>

        {/* ── Mobile context bar (opcional, já temos o Navbar) ──────────── */}
        {/* Podemos simplificar ou manter um bar de contexto se necessário */}

        {/* ── Main content ──────────────────────────────────────────────── */}
        <main className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex flex-grow items-start justify-center p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
