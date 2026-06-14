import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../services/api';
import Spinner from '../components/shared/Spinner';

function StatCard({ label, value, icon, color = 'bg-white' }) {
  return (
    <div className={`${color} rounded-2xl border border-gray-100 p-5 shadow-sm`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-3xl font-bold text-secondary">{value ?? '—'}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function RoleBadge({ role }) {
  return role === 'teacher' ? (
    <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-700">Docente</span>
  ) : (
    <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">Estudiante</span>
  );
}

export default function AdminDashboard() {
  const user = useSelector((s) => s.auth.user);

  const [stats,          setStats]          = useState(null);
  const [users,          setUsers]          = useState([]);
  const [teachersReport, setTeachersReport] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [usersLoading,   setUsersLoading]   = useState(false);
  const [activeTab,      setActiveTab]      = useState('users');
  const [roleFilter,     setRoleFilter]     = useState('');
  const [search,         setSearch]         = useState('');
  const [page,           setPage]           = useState(1);
  const [total,          setTotal]          = useState(0);

  const displayName = user?.name?.split(' ')[0] || 'Admin';
  const PAGE_SIZE = 15;

  useEffect(() => {
    const init = async () => {
      try {
        const [statsRes, teachersRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/teachers/report'),
        ]);
        setStats(statsRes.data);
        setTeachersReport(teachersRes.data.teachers || []);
      } catch (err) {
        console.error('Error cargando panel admin:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      setUsersLoading(true);
      try {
        const params = new URLSearchParams({ page, limit: PAGE_SIZE });
        if (roleFilter) params.set('role', roleFilter);
        if (search)     params.set('search', search);
        const { data } = await api.get(`/admin/users?${params}`);
        setUsers(data.users || []);
        setTotal(data.total || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setUsersLoading(false);
      }
    };
    fetchUsers();
  }, [page, roleFilter, search]);

  if (loading) {
    return <div className="flex justify-center mt-20"><Spinner size="lg" /></div>;
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="bg-gradient-to-r from-secondary to-secondary-light rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">Panel de Administración</h1>
        <p className="text-white/70 text-sm">Bienvenido, {displayName} — gestión y monitoreo de SIRA · UFPS</p>
      </div>

      {/* Estadísticas globales */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Estudiantes"      value={stats.totalStudents}      icon="🎓" />
          <StatCard label="Docentes"         value={stats.totalTeachers}      icon="👨‍🏫" />
          <StatCard label="Mensajes en chat" value={stats.totalMessages}      icon="💬" color="bg-blue-50" />
          <StatCard label="Recomendaciones"  value={stats.totalRecommendations} icon="✨" color="bg-purple-50" />
          <StatCard label="Activos (7 días)" value={stats.activeUsers}        icon="🟢" color="bg-green-50" />
        </div>
      )}

      {/* Pestañas */}
      <div className="border-b border-gray-200 flex gap-1">
        {[
          ['users',    '👥 Usuarios'],
          ['teachers', '📋 Reporte Docentes'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition ${
              activeTab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Pestaña: Usuarios ── */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:border-primary"
            />
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            >
              <option value="">Todos los roles</option>
              <option value="student">Estudiantes</option>
              <option value="teacher">Docentes</option>
            </select>
            <span className="text-xs text-gray-400 shrink-0">{total} registro{total !== 1 ? 's' : ''}</span>
            {usersLoading && <Spinner size="sm" />}
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="pb-3 px-3">Nombre</th>
                  <th className="pb-3 px-3">Correo</th>
                  <th className="pb-3 px-3">Rol</th>
                  <th className="pb-3 px-3">Último acceso</th>
                  <th className="pb-3 px-3">Registro</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400">
                      {usersLoading ? '' : 'No se encontraron usuarios.'}
                    </td>
                  </tr>
                ) : users.map((u) => (
                  <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50 transition">
                    <td className="py-3 px-3 font-medium text-secondary">{u.fullName}</td>
                    <td className="py-3 px-3 text-gray-500">{u.email || '—'}</td>
                    <td className="py-3 px-3"><RoleBadge role={u.role} /></td>
                    <td className="py-3 px-3 text-gray-400 text-xs">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('es-CO') : '—'}
                    </td>
                    <td className="py-3 px-3 text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex gap-2 justify-end pt-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
              >
                ‹ Anterior
              </button>
              <span className="px-3 py-1 text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
              >
                Siguiente ›
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Pestaña: Reporte Docentes ── */}
      {activeTab === 'teachers' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-secondary mb-4">📋 Actividad de Docentes en SIRA</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="pb-3 px-3">Docente</th>
                  <th className="pb-3 px-3">Correo</th>
                  <th className="pb-3 px-3 text-center">Mensajes en chat</th>
                  <th className="pb-3 px-3">Último acceso</th>
                  <th className="pb-3 px-3">Vinculado desde</th>
                </tr>
              </thead>
              <tbody>
                {teachersReport.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400">
                      No hay docentes registrados en SIRA.
                    </td>
                  </tr>
                ) : teachersReport.map((t) => (
                  <tr key={t.moodleUserId} className="border-t border-gray-50 hover:bg-gray-50 transition">
                    <td className="py-3 px-3 font-medium text-secondary">{t.fullName}</td>
                    <td className="py-3 px-3 text-gray-500">{t.email || '—'}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-semibold ${t.chatMessages > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                        {t.chatMessages}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-400 text-xs">
                      {t.lastLogin ? new Date(t.lastLogin).toLocaleDateString('es-CO') : '—'}
                    </td>
                    <td className="py-3 px-3 text-gray-400 text-xs">
                      {t.joinedAt ? new Date(t.joinedAt).toLocaleDateString('es-CO') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
