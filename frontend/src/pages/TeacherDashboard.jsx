/**
 * Dashboard del docente en SIRA.
 * Muestra: resumen de cursos, estadísticas de uso y estudiantes en riesgo.
 * Usa el endpoint /api/teacher/dashboard y /api/teacher/courses/:id/at-risk.
 */
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Spinner from '../components/shared/Spinner';
import Button  from '../components/shared/Button';

/* Tarjeta de estadística */
function StatCard({ label, value, icon, color = 'bg-white' }) {
  return (
    <div className={`${color} rounded-2xl border border-gray-100 p-5 shadow-sm`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-3xl font-bold text-secondary">{value ?? '—'}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}

/* Fila de estudiante en riesgo */
function AtRiskRow({ student }) {
  return (
    <tr className="border-t border-gray-50 hover:bg-gray-50 transition">
      <td className="py-3 px-4 text-sm font-medium text-secondary">{student.fullname}</td>
      <td className="py-3 px-4 text-sm text-gray-500">{student.email || '—'}</td>
      <td className="py-3 px-4">
        {student.progressPercent !== null ? (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${student.progressPercent < 40 ? 'bg-red-400' : 'bg-yellow-400'}`}
                style={{ width: `${student.progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-gray-600">{student.progressPercent}%</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">Sin datos</span>
        )}
      </td>
      <td className="py-3 px-4 text-xs text-red-600">{student.riskReason}</td>
    </tr>
  );
}

export default function TeacherDashboard() {
  const navigate  = useNavigate();
  const user      = useSelector((s) => s.auth.user);

  const [stats,       setStats]       = useState(null);
  const [courses,     setCourses]     = useState([]);
  const [atRisk,      setAtRisk]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [atRiskCourse, setAtRiskCourse] = useState(null);
  const [atRiskLoading, setAtRiskLoading] = useState(false);
  const [error,       setError]       = useState(null);

  const displayName = user?.fullName?.split(' ')[0] || 'Docente';

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await api.get('/teacher/dashboard');
        setStats(data.stats);
        setCourses(data.courses || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Error al cargar el dashboard.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const loadAtRisk = async (courseId, courseName) => {
    setAtRiskCourse(courseName);
    setAtRiskLoading(true);
    setAtRisk([]);
    try {
      const { data } = await api.get(`/teacher/courses/${courseId}/at-risk`);
      setAtRisk(data.atRiskStudents || []);
    } catch {
      setAtRisk([]);
    } finally {
      setAtRiskLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center mt-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">

      {/* Saludo */}
      <div className="bg-gradient-to-r from-secondary to-secondary-light rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">Panel Docente — ¡Hola, {displayName}!</h1>
        <p className="text-white/70 text-sm">Aquí tienes el resumen de actividad académica en SIRA.</p>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-4 text-sm">
          ⚠️ {error} — Asegúrate de que el token Moodle esté vigente (header x-moodle-token).
        </div>
      )}

      {/* Estadísticas SIRA */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Tus cursos"             value={stats.totalCourses}        icon="📚" />
          <StatCard label="Cursos con bajo prog."  value={stats.atRiskCourses}       icon="⚠️" color="bg-red-50" />
          <StatCard label="Recomendaciones SIRA"   value={stats.totalRecommendations} icon="✨" />
          <StatCard label="Estudiantes en SIRA"    value={stats.totalSiraStudents}    icon="🎓" />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">

        {/* Lista de cursos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-secondary mb-4">📋 Mis cursos</h2>
          {courses.length === 0 ? (
            <p className="text-gray-400 text-sm">No se encontraron cursos en Moodle.</p>
          ) : (
            <ul className="space-y-3">
              {courses.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-secondary truncate">{c.fullname}</p>
                    <p className="text-xs text-gray-400">{c.shortname}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadAtRisk(c.id, c.fullname)}
                  >
                    En riesgo
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Estudiantes en riesgo del curso seleccionado */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-secondary mb-4">
            ⚠️ Estudiantes en riesgo
            {atRiskCourse && <span className="text-xs font-normal text-gray-400 ml-2">— {atRiskCourse}</span>}
          </h2>

          {!atRiskCourse && (
            <p className="text-gray-400 text-sm">Selecciona un curso para ver sus estudiantes en riesgo.</p>
          )}

          {atRiskLoading && <Spinner size="sm" />}

          {!atRiskLoading && atRiskCourse && atRisk.length === 0 && (
            <p className="text-green-600 text-sm">✅ No hay estudiantes en riesgo en este curso.</p>
          )}

          {atRisk.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase">
                    <th className="pb-2 px-4">Estudiante</th>
                    <th className="pb-2 px-4">Correo</th>
                    <th className="pb-2 px-4">Progreso</th>
                    <th className="pb-2 px-4">Razón</th>
                  </tr>
                </thead>
                <tbody>
                  {atRisk.map((s) => <AtRiskRow key={s.moodleUserId} student={s} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Acceso rápido al chat */}
      <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5 flex items-center justify-between">
        <div>
          <p className="font-semibold text-blue-800">Consulta a ChatSIRA</p>
          <p className="text-sm text-blue-600 mt-0.5">
            Analiza el rendimiento de tus cursos con ayuda de la IA.
          </p>
        </div>
        <Button onClick={() => navigate('/chat')}>Ir al chat</Button>
      </div>
    </div>
  );
}
