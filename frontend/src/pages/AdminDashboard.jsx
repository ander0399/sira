import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../services/api';
import Spinner from '../components/shared/Spinner';
import MessageBubble from '../components/chat/MessageBubble';
import ChatInput from '../components/chat/ChatInput';

const downloadAsText = (content, prefix = 'reporte-admin-sira') => {
  const date = new Date().toISOString().split('T')[0];
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `${prefix}-${date}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

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

function HealthCard({ service, status, extra }) {
  const map = {
    ok:           { dot: '🟢', label: 'Operativo',      color: 'text-green-600'  },
    unavailable:  { dot: '🟡', label: 'No disponible',  color: 'text-yellow-600' },
    unconfigured: { dot: '🟡', label: 'No configurado', color: 'text-yellow-600' },
    unreachable:  { dot: '🔴', label: 'Sin respuesta',  color: 'text-red-600'    },
    error:        { dot: '🔴', label: 'Error',           color: 'text-red-600'    },
  };
  const { dot, label, color } = map[status] || { dot: '⚪', label: status, color: 'text-gray-500' };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <p className="font-semibold text-secondary text-sm">{service}</p>
        <span className="text-xl">{dot}</span>
      </div>
      <p className={`text-sm font-medium ${color}`}>{label}</p>
      {extra && <p className="text-xs text-gray-400 mt-1 truncate">{extra}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const user = useSelector((s) => s.auth.user);

  // Stats + usuarios + docentes
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

  // Chat admin
  const adminChatRef = useRef(null);
  const ADMIN_WELCOME = {
    role: 'assistant',
    content: 'Hola. Soy **SIRA Analytics**, tu asistente de análisis y administración.\n\nTengo acceso a los datos del sistema en tiempo real y puedo:\n• Generar reportes de uso (estudiantes, docentes, actividad)\n• Analizar los temas más consultados por estudiantes\n• Resumir recomendaciones generadas\n• Responder cualquier consulta técnica o académica\n• Servir como entorno de prueba del motor de IA\n\n¿Qué necesitas?',
    createdAt: new Date().toISOString(),
  };
  const [adminMessages, setAdminMessages] = useState([ADMIN_WELCOME]);
  const [adminTyping,   setAdminTyping]   = useState(false);

  // Sistema
  const [health,        setHealth]        = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthVersion, setHealthVersion] = useState(0);

  // Administradores
  const [admins,          setAdmins]          = useState([]);
  const [adminsLoading,   setAdminsLoading]   = useState(false);
  const [adminForm,       setAdminForm]       = useState({ name: '', email: '', password: '' });
  const [adminFormError,  setAdminFormError]  = useState('');
  const [adminFormSaving, setAdminFormSaving] = useState(false);
  const [showAdminForm,   setShowAdminForm]   = useState(false);

  const displayName = user?.name?.split(' ')[0] || 'Admin';
  const PAGE_SIZE = 15;

  // Carga inicial: stats + reporte docentes
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

  // Lista de usuarios con filtros y paginación
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

  // Carga perezosa según pestaña
  useEffect(() => {
    if (activeTab === 'sistema') {
      const fetchHealth = async () => {
        setHealthLoading(true);
        try {
          const { data } = await api.get('/admin/system-health');
          setHealth(data);
        } catch (err) {
          console.error('Error cargando salud del sistema:', err);
        } finally {
          setHealthLoading(false);
        }
      };
      fetchHealth();
    }
    if (activeTab === 'admins' && admins.length === 0) {
      const fetchAdmins = async () => {
        setAdminsLoading(true);
        try {
          const { data } = await api.get('/admin/admins');
          setAdmins(data.admins || []);
        } catch (err) {
          console.error('Error cargando administradores:', err);
        } finally {
          setAdminsLoading(false);
        }
      };
      fetchAdmins();
    }
  }, [activeTab, healthVersion]);

  const handleAdminChat = async (text) => {
    // Historial ANTES del mensaje nuevo (sendToGroq agrega el mensaje actual por separado)
    const history = adminMessages
      .slice(1)       // omitir bienvenida
      .slice(-10)     // máx 10 turnos previos
      .map(({ role, content }) => ({ role, content }));

    setAdminMessages((prev) => [
      ...prev,
      { role: 'user', content: text, createdAt: new Date().toISOString() },
    ]);
    setAdminTyping(true);

    try {
      const { data } = await api.post('/admin/chat', { message: text, history });
      setAdminMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message, source: data.source, createdAt: new Date().toISOString() },
      ]);
    } catch (err) {
      setAdminMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error al procesar el mensaje. Verifica la conexión con el backend.', createdAt: new Date().toISOString() },
      ]);
    } finally {
      setAdminTyping(false);
    }
  };

  // Scroll automático en el chat admin
  useEffect(() => {
    adminChatRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [adminMessages, adminTyping]);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setAdminFormError('');
    setAdminFormSaving(true);
    try {
      const { data } = await api.post('/admin/admins', adminForm);
      setAdmins((prev) => [...prev, data.admin]);
      setAdminForm({ name: '', email: '', password: '' });
      setShowAdminForm(false);
    } catch (err) {
      setAdminFormError(err.response?.data?.message || 'Error al crear administrador.');
    } finally {
      setAdminFormSaving(false);
    }
  };

  const handleDeleteAdmin = async (id) => {
    if (!window.confirm('¿Eliminar este administrador? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/admin/admins/${id}`);
      setAdmins((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar administrador.');
    }
  };

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
          <StatCard label="Estudiantes"      value={stats.totalStudents}        icon="🎓" />
          <StatCard label="Docentes"         value={stats.totalTeachers}        icon="👨‍🏫" />
          <StatCard label="Mensajes en chat" value={stats.totalMessages}        icon="💬" color="bg-blue-50" />
          <StatCard label="Recomendaciones"  value={stats.totalRecommendations} icon="✨" color="bg-purple-50" />
          <StatCard label="Activos (7 días)" value={stats.activeUsers}          icon="🟢" color="bg-green-50" />
        </div>
      )}

      {/* Pestañas */}
      <div className="border-b border-gray-200 flex gap-1 flex-wrap">
        {[
          ['users',    '👥 Usuarios'],
          ['teachers', '📋 Reporte Docentes'],
          ['chat',     '💬 Chat'],
          ['sistema',  '🔧 Sistema'],
          ['admins',   '🛡️ Administradores'],
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
          {totalPages > 1 && (
            <div className="flex gap-2 justify-end pt-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
              >
                ‹ Anterior
              </button>
              <span className="px-3 py-1 text-sm text-gray-500">{page} / {totalPages}</span>
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

      {/* ── Pestaña: Chat ── */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 22rem)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <img src="/logo.jpeg" alt="SIRA" className="w-8 h-8 rounded-full object-cover shadow" />
              <div>
                <p className="font-bold text-secondary text-sm">SIRA Analytics</p>
                <p className="text-xs text-gray-400">Asistente de análisis y reportería · Panel Admin</p>
              </div>
            </div>
            <button
              onClick={() => setAdminMessages([ADMIN_WELCOME])}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-gray-500"
            >
              + Nueva sesión
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {adminMessages.map((msg, idx) => (
              <MessageBubble
                key={idx}
                message={msg}
                onDownload={(content) => downloadAsText(content)}
              />
            ))}
            {adminTyping && (
              <div className="flex gap-2 items-center text-gray-400 text-sm px-2">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse delay-75">●</span>
                <span className="animate-pulse delay-150">●</span>
              </div>
            )}
            <div ref={adminChatRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0">
            <ChatInput onSend={handleAdminChat} disabled={adminTyping} />
          </div>
        </div>
      )}

      {/* ── Pestaña: Sistema ── */}
      {activeTab === 'sistema' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-secondary">🔧 Estado del Sistema</h2>
            <div className="flex items-center gap-3">
              {health && (
                <p className="text-xs text-gray-400">
                  Actualizado: {new Date(health.timestamp).toLocaleTimeString('es-CO')}
                </p>
              )}
              <button
                onClick={() => setHealthVersion((v) => v + 1)}
                disabled={healthLoading}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition disabled:opacity-40"
              >
                {healthLoading ? 'Verificando...' : 'Actualizar'}
              </button>
            </div>
          </div>
          {healthLoading ? (
            <div className="flex justify-center py-10"><Spinner size="lg" /></div>
          ) : health ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <HealthCard service="PostgreSQL"     status={health.services.database.status} />
              <HealthCard service="Groq (IA)"      status={health.services.groq.status} />
              <HealthCard service="Moodle (UFPS)"  status={health.services.moodle.status} extra={health.services.moodle.url} />
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-10">
              No se pudo cargar el estado del sistema.
            </p>
          )}
        </div>
      )}

      {/* ── Pestaña: Administradores ── */}
      {activeTab === 'admins' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-secondary">🛡️ Administradores del Sistema</h2>
            <button
              onClick={() => { setShowAdminForm((v) => !v); setAdminFormError(''); }}
              className="text-sm px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition"
            >
              {showAdminForm ? 'Cancelar' : '+ Nuevo admin'}
            </button>
          </div>

          {showAdminForm && (
            <form onSubmit={handleCreateAdmin} className="bg-gray-50 rounded-2xl border border-gray-100 p-5 space-y-3">
              <p className="text-sm font-semibold text-secondary">Crear nuevo administrador</p>
              {adminFormError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{adminFormError}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text" placeholder="Nombre completo" required
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
                <input
                  type="email" placeholder="Correo electrónico" required
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
                <input
                  type="password" placeholder="Contraseña (mín. 8 caracteres)" required
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <button
                type="submit" disabled={adminFormSaving}
                className="text-sm px-5 py-2 rounded-lg bg-secondary text-white hover:bg-secondary/90 transition disabled:opacity-50"
              >
                {adminFormSaving ? 'Guardando...' : 'Crear administrador'}
              </button>
            </form>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            {adminsLoading ? (
              <div className="flex justify-center py-10"><Spinner size="lg" /></div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                    <th className="pb-3 px-3">Nombre</th>
                    <th className="pb-3 px-3">Correo</th>
                    <th className="pb-3 px-3">Creado</th>
                    <th className="pb-3 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-gray-400">
                        No hay administradores registrados.
                      </td>
                    </tr>
                  ) : admins.map((a) => (
                    <tr key={a.id} className="border-t border-gray-50 hover:bg-gray-50 transition">
                      <td className="py-3 px-3 font-medium text-secondary">{a.name}</td>
                      <td className="py-3 px-3 text-gray-500">{a.email}</td>
                      <td className="py-3 px-3 text-gray-400 text-xs">
                        {new Date(a.createdAt).toLocaleDateString('es-CO')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {a.id === user?.id ? (
                          <span className="text-xs text-gray-400 italic">Tú</span>
                        ) : (
                          <button
                            onClick={() => handleDeleteAdmin(a.id)}
                            className="text-xs px-3 py-1 rounded-lg text-red-600 border border-red-200 hover:bg-red-50 transition"
                          >
                            Eliminar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
