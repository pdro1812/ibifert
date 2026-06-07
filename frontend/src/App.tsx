import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicLayout } from './layouts/PublicLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

// Pages
import { CalculadoraPage } from './pages/CalculadoraPage';
import { MonitoramentoPage } from './pages/MonitoramentoPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { FazendasPage } from './pages/FazendasPage';
import { NovaAnalisePage } from './pages/NovaAnalisePage';
import { HistoricoAnalisesPage } from './pages/HistoricoAnalisesPage';
import { TalhaoDetalhesPage } from './pages/TalhaoDetalhesPage';
import { ValidacaoAgronomicaPage } from './pages/ValidacaoAgronomicaPage';
import { StandaloneValidationPage } from './pages/StandaloneValidationPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminAnalisesPage } from './pages/AdminAnalisesPage';


/**
 * App root — only providers and route declarations live here.
 * No UI state, no business logic.
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Public routes (PublicLayout wraps all) ─────────────────── */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<CalculadoraPage />} />
            <Route path="/monitoramento" element={<MonitoramentoPage />} />
            <Route path="/validacao" element={<ValidacaoAgronomicaPage />} />
            <Route path="/validacao-sql" element={<StandaloneValidationPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/RegisterPage" element={<RegisterPage />} />
          </Route>

          {/* ── Protected routes (must be authenticated) ──────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<FazendasPage />} />
              <Route path="/dashboard/talhao/:id" element={<TalhaoDetalhesPage />} />
              <Route path="/dashboard/nova-analise" element={<NovaAnalisePage />} />
              
              {/* O histórico só é visível para PRODUTORES aqui. Admin usa a tela de Usuários */}
              <Route element={<ProtectedRoute roles={['PRODUTOR']} />}>
                <Route path="/historico" element={<HistoricoAnalisesPage />} />
              </Route>
            </Route>
          </Route>

          {/* ── Admin Routes ── */}
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/usuarios" element={<AdminUsersPage />} />
              <Route path="/admin/analises" element={<AdminAnalisesPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
