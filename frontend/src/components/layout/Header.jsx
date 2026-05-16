/**
 * Barra de navegación superior de SIRA.
 * Muestra el logo, nombre del usuario y botón de logout.
 */
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../store/slices/authSlice';

export default function Header({ onMenuClick }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-16 bg-primary shadow-md flex items-center justify-between px-4 md:px-6">
      {/* Logo + título */}
      <div className="flex items-center gap-3">
        {/* Botón menú hamburguesa (solo mobile) */}
        <button
          onClick={onMenuClick}
          className="md:hidden text-white p-1 rounded"
          aria-label="Abrir menú"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <img src="/logo.jpeg" alt="SIRA logo" className="w-9 h-9 rounded-full object-cover" />
        <div className="hidden sm:block">
          <span className="text-white font-bold text-lg tracking-wide">SIRA</span>
          <span className="text-white/70 text-xs ml-2 hidden md:inline">Sistema Inteligente de Recomendación Académica</span>
        </div>
      </div>

      {/* Usuario + logout */}
      <div className="flex items-center gap-3">
        {user && (
          <span className="text-white/90 text-sm hidden sm:block">
            {user.name}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="bg-white/20 hover:bg-white/30 text-white text-sm px-3 py-1.5 rounded-lg transition font-medium"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
