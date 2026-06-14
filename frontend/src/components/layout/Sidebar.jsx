/**
 * Barra lateral de navegación.
 * Los items se adaptan al rol del usuario (estudiante, docente, admin).
 * En desktop siempre visible; en mobile se oculta con el botón del header.
 */
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';

const STUDENT_NAV = [
  { to: '/dashboard', icon: '🏠', label: 'Inicio' },
  { to: '/chat',      icon: '💬', label: 'ChatSIRA' },
  { to: '/profile',   icon: '👤', label: 'Mi Perfil' },
  { to: '/reports',   icon: '📊', label: 'Reportes' },
];

const TEACHER_NAV = [
  { to: '/teacher', icon: '🏫', label: 'Dashboard' },
  { to: '/chat',    icon: '💬', label: 'ChatSIRA' },
];

const ADMIN_NAV = [
  { to: '/admin',   icon: '🛡️', label: 'Panel Admin' },
  { to: '/reports', icon: '📊', label: 'Reportes' },
];

export default function Sidebar({ isOpen, onClose }) {
  const user = useSelector((s) => s.auth.user);

  const navItems = user?.role === 'teacher'
    ? TEACHER_NAV
    : user?.role === 'admin'
      ? ADMIN_NAV
      : STUDENT_NAV;

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 md:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed top-16 left-0 z-20 h-[calc(100vh-4rem)] w-60
          bg-primary text-white flex flex-col
          transition-transform duration-300
          md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/20 flex items-center gap-3">
          <img src="/logo.jpeg" alt="SIRA" className="w-9 h-9 rounded-lg object-cover shrink-0 shadow" />
          <div>
            <p className="text-white font-bold text-sm leading-tight">SIRA</p>
            <p className="text-white/60 text-xs">
              {user?.role === 'teacher' ? 'Panel Docente' : user?.role === 'admin' ? 'Administrador' : 'Estudiante'}
            </p>
          </div>
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
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span className="text-lg">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/20 text-xs text-white/40 text-center">
          UFPS — Ingeniería de Sistemas
        </div>
      </aside>
    </>
  );
}
