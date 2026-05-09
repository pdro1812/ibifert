import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Wraps private routes. If the user is not authenticated, redirects to /login
 * while preserving the intended destination in `location.state.from`.
 *
 * Usage:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<DashboardPage />} />
 *   </Route>
 */
export function ProtectedRoute() {
  const { isLoggedIn, isLoading } = useAuth();
  const location = useLocation();

  // Wait for localStorage rehydration before decid
  // ing
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F6F0]">
        <span className="text-sm text-stone-400">Carregando...</span>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}