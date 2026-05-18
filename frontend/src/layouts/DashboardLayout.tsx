import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  Leaf,
  LayoutDashboard,
  LogOut,
  Map,
  User,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Propriedades', end: true },
  { to: '/dashboard/nova-analise', icon: FlaskConical, label: 'Inserção Rápida' },
  { to: '/monitoramento', icon: Map, label: 'Monitoramento' },
  { to: '/validacao', icon: CheckCircle2, label: 'Validação' },
];

/**
 * Persistent shell for all authenticated pages.
 * Renders a sidebar on desktop and a top bar on mobile.
 */
export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-[#F4F6F0]">
      {/* ── Sidebar (desktop) ─────────────────────────────────────────── */}
      <aside className="hidden w-64 flex-col border-r border-stone-200 bg-white shadow-sm md:flex">
        {/* Logo */}
        <NavLink
          to="/"
          className="flex h-20 items-center gap-3 border-b border-stone-100 px-6"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-green-600 shadow">
            <Leaf className="text-white" size={18} />
          </div>
          <span className="text-lg font-bold tracking-tight text-stone-800">Ibiferti</span>
        </NavLink>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
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

      {/* ── Mobile top bar ────────────────────────────────────────────── */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-stone-200 bg-white px-4 shadow-sm md:hidden">
        <NavLink to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-400 to-green-600">
            <Leaf className="text-white" size={14} />
          </div>
          <span className="font-bold text-stone-800">Ibiferti</span>
        </NavLink>
        <button onClick={handleLogout} className="text-red-500">
          <LogOut size={20} />
        </button>
      </div>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col pt-16 md:pt-0">
        <div className="flex flex-grow items-start justify-center p-4 md:p-8">
          {/* Each dashboard page renders here */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}