/**
 * Ruta protegida: redirige a /login si no hay sesión activa.
 */
import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
  const token = useSelector((s) => s.auth.token);
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
