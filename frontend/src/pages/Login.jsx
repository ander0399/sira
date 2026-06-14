/**
 * Página de acceso a SIRA.
 * - Acceso directo: muestra formulario de administrador (email + contraseña).
 * - Auto-login: si la URL contiene ?moodleToken=xxx&role=yyy (redireccionado
 *   desde el plugin Moodle block_sira), dispara el login automáticamente.
 *   Estudiantes y docentes SIEMPRE llegan por esta vía desde Moodle.
 */
import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { moodleLogin, adminLogin, clearError } from '../store/slices/authSlice';
import Button from '../components/shared/Button';
import Input  from '../components/shared/Input';

export default function Login() {
  const dispatch       = useDispatch();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const { loading, error, token, user } = useSelector((s) => s.auth);

  const [adminForm, setAdminForm] = useState({ email: '', password: '' });
  const autoLoginFired = useRef(false);
  const isAutoLogin    = !!(searchParams.get('moodleToken') && searchParams.get('role'));

  // Auto-login desde el plugin de Moodle
  useEffect(() => {
    if (autoLoginFired.current) return;
    const urlToken = searchParams.get('moodleToken');
    const urlRole  = searchParams.get('role');
    if (urlToken && ['student', 'teacher'].includes(urlRole)) {
      autoLoginFired.current = true;
      dispatch(moodleLogin({ moodleToken: urlToken, role: urlRole }));
    }
  }, [searchParams, dispatch]);

  useEffect(() => {
    if (token && user) {
      const dest = user.role === 'teacher' ? '/teacher' : user.role === 'admin' ? '/admin' : '/dashboard';
      navigate(dest, { replace: true });
    }
    return () => dispatch(clearError());
  }, [token, user, navigate, dispatch]);

  const handleAdminSubmit = (e) => {
    e.preventDefault();
    dispatch(adminLogin(adminForm));
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Fondo fotografía */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/chat.jpeg)' }}
      />
      {/* Capa oscura sobre la foto */}
      <div className="absolute inset-0 bg-secondary/70" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Cabecera roja */}
          <div className="bg-primary px-7 py-5 flex items-center gap-3">
            <img src="/logo.jpeg" alt="SIRA" className="w-12 h-12 rounded-xl object-cover shadow-md shrink-0" />
            <div>
              <h1 className="text-white font-bold text-xl leading-tight tracking-wide">SIRA 1.0</h1>
              <p className="text-white/70 text-[11px] leading-tight">Sistema Inteligente de Recomendación Académica</p>
            </div>
          </div>

          {/* ── Auto-login desde plugin Moodle ── */}
          {isAutoLogin ? (
            <div className="px-7 py-10 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-secondary text-sm font-medium">Conectando con Moodle...</p>
              {error && <p className="text-red-600 text-xs text-center mt-1">{error}</p>}
            </div>
          ) : (
            <div className="px-7 py-6">
              <p className="text-secondary font-semibold text-sm mb-1">Panel Administrativo</p>
              <p className="text-gray-400 text-xs mb-5">Acceso exclusivo para administradores UFPS</p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <Input
                  label="Correo electrónico"
                  name="email"
                  type="email"
                  placeholder="admin@ufps.edu.co"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  required
                />
                <Input
                  label="Contraseña"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  required
                />
                <Button type="submit" className="w-full" loading={loading}>
                  Iniciar sesión
                </Button>
              </form>
            </div>
          )}

          {/* Pie de card */}
          <div className="px-7 py-3 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-gray-400 text-[11px]">
              Estudiantes y docentes acceden desde el bloque SIRA en Moodle
            </p>
          </div>
        </div>

        {/* Versión fuera de la card */}
        <p className="text-white/40 text-xs text-center mt-4">
          SIRA v1.0 · Ingeniería de Sistemas — UFPS
        </p>
      </div>
    </div>
  );
}
