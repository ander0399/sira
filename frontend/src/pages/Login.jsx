/**
 * Página de login de SIRA.
 * Formulario con email y contraseña, conectado a Redux authSlice.
 */
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser, clearError } from '../store/slices/authSlice';
import Button from '../components/shared/Button';
import Input  from '../components/shared/Input';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, token } = useSelector((s) => s.auth);

  const [form, setForm] = useState({ email: '', password: '' });

  /* Si ya hay sesión activa, redirigir al dashboard */
  useEffect(() => {
    if (token) navigate('/dashboard', { replace: true });
    return () => dispatch(clearError());
  }, [token, navigate, dispatch]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser(form));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary to-secondary-light flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/chat.jpeg" alt="ChatSIRA" className="w-48 object-contain mb-4 rounded-xl" />
          <p className="text-white/60 text-sm text-center">
            Ingeniería de Sistemas — Universidad Francisco de Paula Santander
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-secondary mb-1">Bienvenido</h1>
          <p className="text-gray-500 text-sm mb-6">Inicia sesión para acceder a tu asistente académico.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo electrónico"
              name="email"
              type="email"
              placeholder="tu@correo.ufps.edu.co"
              value={form.email}
              onChange={handleChange}
              required
            />
            <Input
              label="Contraseña"
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
            <Button type="submit" className="w-full" loading={loading}>
              Iniciar sesión
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
