/**
 * Barra lateral de navegación.
 * En desktop siempre visible; en mobile se oculta/muestra con el botón del header.
 */
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', icon: '🏠', label: 'Inicio' },
  { to: '/chat',      icon: '💬', label: 'ChatSIRA' },
  { to: '/profile',   icon: '📋', label: 'Mi Perfil' },
  { to: '/reports',   icon: '📊', label: 'Reportes' },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-16 left-0 z-20 h-[calc(100vh-4rem)] w-60
          bg-secondary text-white flex flex-col
          transition-transform duration-300
          md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo completo */}
        <div className="p-4 border-b border-white/10 flex justify-center">
          <img
            src="/chat.jpeg"
            alt="ChatSIRA"
            className="w-36 object-contain rounded-lg"
          />
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span className="text-lg">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer del sidebar */}
        <div className="p-4 border-t border-white/10 text-xs text-white/40 text-center">
          UFPS — Ingeniería de Sistemas
        </div>
      </aside>
    </>
  );
}
