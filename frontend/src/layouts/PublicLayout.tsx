import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

/**
 * Wraps public-facing routes (/, /login, /monitoramento).
 * Renders the top navigation bar and a centered content area.
 */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6F0] text-stone-800">
      <Navbar />

      <main className="flex flex-grow items-center justify-center p-4 md:p-8">
        {/* Each public page renders here */}
        <Outlet />
      </main>
    </div>
  );
}
