/**
 * Página de registro de nuevo estudiante.
 * Captura datos básicos + perfil académico inicial (semestre, estilo de aprendizaje).
 */
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser, clearError } from '../store/slices/authSlice';
import Button from '../components/shared/Button';
import Input  from '../components/shared/Input';
import { LEARNING_STYLES, SEMESTERS } from '../utils/constants';

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, token } = useSelector((s) => s.auth);

  const [form, setForm] = useState({
    name:            '',
    email:           '',
    password:        '',
    confirmPassword: '',
    currentSemester: 1,
    learningStyle:   'visual',
    studentCode:     '',
  });
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (token) navigate('/dashboard', { replace: true });
    return () => dispatch(clearError());
  }, [token, navigate, dispatch]);

  const handleChange = (e) => {
    setLocalError('');
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }
    const { confirmPassword, ...payload } = form;
    dispatch(registerUser(payload));
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary to-secondary-light flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/chat.jpeg" alt="ChatSIRA" className="w-40 object-contain rounded-xl" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-secondary mb-1">Crear cuenta</h1>
          <p className="text-gray-500 text-sm mb-6">Ingresa tus datos para comenzar a usar SIRA.</p>

          {displayError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Datos personales */}
            <Input label="Nombre completo" name="name" placeholder="Ej: Carlos Andrés Pérez"
              value={form.name} onChange={handleChange} required />

            <Input label="Correo electrónico" name="email" type="email" placeholder="tu@correo.ufps.edu.co"
              value={form.email} onChange={handleChange} required />

            <div className="grid grid-cols-2 gap-4">
              <Input label="Contraseña" name="password" type="password" placeholder="Mín. 6 caracteres"
                value={form.password} onChange={handleChange} required />
              <Input label="Confirmar contraseña" name="confirmPassword" type="password" placeholder="Repite la contraseña"
                value={form.confirmPassword} onChange={handleChange} required />
            </div>

            {/* Datos académicos */}
            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-secondary mb-3">Perfil académico</p>
              <div className="grid grid-cols-2 gap-4">
                {/* Semestre */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-secondary">Semestre actual</label>
                  <select name="currentSemester" value={form.currentSemester} onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm">
                    {SEMESTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>

                {/* Estilo de aprendizaje */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-secondary">Estilo de aprendizaje</label>
                  <select name="learningStyle" value={form.learningStyle} onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm">
                    {LEARNING_STYLES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <Input label="Código estudiantil (opcional)" name="studentCode" placeholder="Ej: 1151651"
                  value={form.studentCode} onChange={handleChange} />
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" loading={loading}>
              Crear cuenta
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
