/**
 * Componente raíz de SIRA v2.
 * Rutas: login | dashboard (estudiante) | teacher | chat | reports
 * Estudiantes y docentes acceden vía Moodle SSO; admins con email+contraseña.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout      from './components/layout/AppLayout';

import Login            from './pages/Login';
import Dashboard        from './pages/Dashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import Chat             from './pages/Chat';
import Reports          from './pages/Reports';
import Profile          from './pages/Profile';

/* Redirige al dashboard apropiado según el rol del usuario */
function RootRedirect() {
  const user = useSelector((s) => s.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'teacher' ? '/teacher' : '/dashboard'} replace />;
}

/* Protege rutas exclusivas para docentes */
function TeacherOnly() {
  const user = useSelector((s) => s.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'teacher') return <Navigate to="/dashboard" replace />;
  return <TeacherDashboard />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/teacher"   element={<TeacherOnly />} />
            <Route path="/chat"      element={<Chat />} />
            <Route path="/profile"   element={<Profile />} />
            <Route path="/reports"   element={<Reports />} />
          </Route>
        </Route>

        {/* Redirección raíz según rol */}
        <Route path="/"  element={<RootRedirect />} />
        <Route path="*"  element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
