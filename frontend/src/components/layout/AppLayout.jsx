/**
 * Layout principal con header + sidebar + contenido.
 * Usado por todas las páginas internas (después del login).
 */
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header  from './Header';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface">
      <Header onMenuClick={() => setSidebarOpen(o => !o)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className={`pt-16 min-h-screen transition-all duration-300 ${sidebarOpen ? 'ml-60' : 'ml-0'}`}>
        <div className="p-4 md:p-6 max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
