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
      navigate(user.role === 'teacher' ? '/teacher' : '/dashboard', { replace: true });
    }
    return () => dispatch(clearError());
  }, [token, user, navigate, dispatch]);

  const handleAdminSubmit = (e) => {
    e.preventDefault();
    dispatch(adminLogin(adminForm));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo de marca */}
        <div className="flex justify-center mb-8">
          <img src="/chat.jpeg" alt="ChatSIRA — UFPS" className="w-64 object-contain drop-shadow-lg" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* ── Auto-login desde plugin Moodle ── */}
          {isAutoLogin ? (
            <div className="p-10 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-secondary text-sm font-medium">Conectando con Moodle...</p>
              {error && (
                <p className="text-red-600 text-xs text-center mt-2">{error}</p>
              )}
            </div>
          ) : (
            <div className="p-8">
              {/* Encabezado del formulario */}
              <div className="flex items-center gap-3 mb-6">
                <img src="/logo.jpeg" alt="SIRA" className="w-11 h-11 rounded-xl object-cover shrink-0 shadow" />
                <div>
                  <h2 className="text-secondary font-bold text-lg leading-tight">Panel Administrativo</h2>
                  <p className="text-gray-400 text-xs">Acceso exclusivo para administradores</p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-5">
                  {error}
                </div>
              )}

              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <Input
                  label="Correo electrónico"
                  name="email"
                  type="email"
                  placeholder="admin@sira.ufps.edu.co"
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
                <Button type="submit" className="w-full mt-2" loading={loading}>
                  Ingresar al sistema
                </Button>
              </form>
            </div>
          )}
        </div>

        <p className="text-white/50 text-xs text-center mt-5">
          Estudiantes y docentes acceden desde el bloque SIRA en Moodle UFPS
        </p>
        <p className="text-white/30 text-xs text-center mt-1">
          SIRA v2.0 · Ingeniería de Sistemas — UFPS
        </p>
      </div>
    </div>
  );
}
