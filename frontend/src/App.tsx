import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicLayout } from './layouts/PublicLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

// Pages
import { CalculadoraPage } from './pages/CalculadoraPage';
import { AdubacaoPage } from './pages/AdubacaoPage';
import { CalculadoraCompletaPage } from './pages/CalculadoraCompletaPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { MonitoramentoPage } from './pages/MonitoramentoPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { FazendasPage } from './pages/FazendasPage';
import { NovaAnalisePage } from './pages/NovaAnalisePage';
import { HistoricoAnalisesPage } from './pages/HistoricoAnalisesPage';
import { TalhaoDetalhesPage } from './pages/TalhaoDetalhesPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminAnalisesPage } from './pages/AdminAnalisesPage';
import { AdminFeedbackPage } from './pages/AdminFeedbackPage';


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
            <Route path="/" element={<CalculadoraCompletaPage />} />
            <Route path="/calculadora-completa" element={<CalculadoraCompletaPage />} />
            {/* Telas antigas, mantidas como backup (sem link na navbar) */}
            <Route path="/calagem" element={<CalculadoraPage />} />
            <Route path="/adubacao" element={<AdubacaoPage />} />
            <Route path="/monitoramento" element={<MonitoramentoPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
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
              <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
