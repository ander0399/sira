/**
 * Ruta protegida.
 * - Sin allowedRoles: solo verifica que haya sesión activa.
 * - Con allowedRoles: además verifica que el rol del usuario esté en la lista;
 *   si no, redirige a la página de inicio del rol que sí tiene.
 */
import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute({ allowedRoles }) {
  const { token, user } = useSelector((s) => s.auth);

  if (!token) return <Navigate to="/login" replace />;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const home = user.role === 'teacher' ? '/teacher'
               : user.role === 'admin'   ? '/admin'
               : '/dashboard';
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}
