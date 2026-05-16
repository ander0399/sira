/**
 * Componente raíz de SIRA.
 * Define el árbol de rutas: rutas públicas (login, register)
 * y rutas protegidas (dashboard, chat, perfil, reportes).
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout      from './components/layout/AppLayout';

import Login     from './pages/Login';
import Register  from './pages/Register';
import Dashboard from './pages/Dashboard';
import Chat      from './pages/Chat';
import Profile   from './pages/Profile';
import Reports   from './pages/Reports';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Rutas protegidas — requieren sesión activa */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chat"      element={<Chat />} />
            <Route path="/profile"   element={<Profile />} />
            <Route path="/reports"   element={<Reports />} />
          </Route>
        </Route>

        {/* Redirigir raíz al dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
