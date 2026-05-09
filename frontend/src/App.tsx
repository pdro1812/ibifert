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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/RegisterPage" element={<RegisterPage />} />
            <Route path="/historico" element={<HistoricoAnalisesPage />} />
          </Route>

          {/* ── Protected routes (must be authenticated) ──────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<FazendasPage />} />
              <Route path="/dashboard/nova-analise" element={<NovaAnalisePage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}