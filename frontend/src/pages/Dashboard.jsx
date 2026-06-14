/**
 * Dashboard principal del estudiante.
 * Muestra cursos activos de Moodle con progreso, recomendaciones recientes
 * y accesos rápidos a las funciones de SIRA.
 */
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchCourses }          from '../store/slices/moodleSlice';
import { fetchRecommendations, generateRecommendations } from '../store/slices/recommendationSlice';
import Spinner from '../components/shared/Spinner';
import Button  from '../components/shared/Button';
import { RECOMMENDATION_TYPES } from '../utils/constants';

/* Barra de progreso de un curso Moodle */
function CourseProgressBar({ course }) {
  const pct = course.progress ?? null;
  const color = pct === null ? 'bg-gray-300' : pct < 40 ? 'bg-red-400' : pct < 75 ? 'bg-yellow-400' : 'bg-green-400';

  return (
    <li className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-secondary font-medium truncate pr-2">{course.fullname}</span>
        <span className="text-gray-500 text-xs shrink-0">{pct !== null ? `${pct}%` : 'Sin datos'}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct ?? 0}%` }} />
      </div>
    </li>
  );
}

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const user    = useSelector((s) => s.auth.user);
  const courses = useSelector((s) => s.moodle.courses);
  const moodleLoading = useSelector((s) => s.moodle.loading);
  const moodleError   = useSelector((s) => s.moodle.error);
  const recommendations = useSelector((s) => s.recommendations.list);
  const recLoading      = useSelector((s) => s.recommendations.loading);

  useEffect(() => {
    dispatch(fetchCourses());
    dispatch(fetchRecommendations());
  }, [dispatch]);

  const handleGenerateRecs = () => dispatch(generateRecommendations());

  const displayName = user?.fullName?.split(' ')[0] || user?.name?.split(' ')[0] || 'Bienvenido';
  const lowProgress = courses.filter(c => c.progress !== null && c.progress !== undefined && c.progress < 40);
  const unreadRecs  = recommendations.filter(r => !r.isRead);

  return (
    <div className="space-y-6">

      {/* Saludo */}
      <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">¡Hola, {displayName}! 👋</h1>
        <p className="text-white/80 text-sm">Bienvenido a SIRA — tu asistente académico inteligente.</p>
        <div className="flex gap-4 mt-4 flex-wrap">
          <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
            <div className="text-xl font-bold">{courses.length}</div>
            <div className="text-xs text-white/80">Cursos activos</div>
          </div>
          <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
            <div className="text-xl font-bold">{lowProgress.length}</div>
            <div className="text-xs text-white/80">En riesgo</div>
          </div>
          <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
            <div className="text-xl font-bold">{unreadRecs.length}</div>
            <div className="text-xs text-white/80">Recomendaciones</div>
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Chatear con SIRA', icon: '💬', to: '/chat',    color: 'bg-blue-50 hover:bg-blue-100 text-blue-700' },
          { label: 'Mis Reportes',     icon: '📊', to: '/reports', color: 'bg-purple-50 hover:bg-purple-100 text-purple-700' },
          { label: 'Generar Recomend.', icon: '✨', onClick: handleGenerateRecs, color: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700' },
        ].map(({ label, icon, to, onClick, color }) => (
          <button
            key={label}
            onClick={to ? () => navigate(to) : onClick}
            className={`${color} rounded-xl p-4 flex flex-col items-center gap-2 font-medium text-sm transition cursor-pointer`}
          >
            <span className="text-2xl">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* Cursos Moodle */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-secondary mb-4 flex items-center gap-2">
            📚 Mis cursos en Moodle
            {moodleLoading && <Spinner size="sm" />}
          </h2>
          {moodleError && (
            <div className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3 mb-3">
              ⚠️ {moodleError}. Revisa que el token Moodle esté vigente.
            </div>
          )}
          {!moodleLoading && courses.length === 0 && !moodleError && (
            <p className="text-gray-400 text-sm">No se encontraron cursos en Moodle.</p>
          )}
          <ul className="space-y-4">
            {courses.map((c) => <CourseProgressBar key={c.id} course={c} />)}
          </ul>
          {lowProgress.length > 0 && (
            <div className="mt-4 bg-red-50 rounded-lg p-3">
              <p className="text-xs text-red-600 font-semibold">
                ⚠️ Cursos con progreso bajo (&lt;40%): {lowProgress.map(c => c.fullname).join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Recomendaciones recientes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-secondary flex items-center gap-2">
              ✨ Recomendaciones
            </h2>
            {recLoading && <Spinner size="sm" />}
          </div>
          {recommendations.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm mb-3">Aún no tienes recomendaciones.</p>
              <Button size="sm" onClick={handleGenerateRecs} loading={recLoading}>
                Generar ahora
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {recommendations.slice(0, 4).map((rec) => (
                <li key={rec.id} className={`flex items-start gap-3 text-sm p-2 rounded-lg ${rec.isRead ? 'opacity-60' : 'bg-gray-50'}`}>
                  <span className="text-xl shrink-0">{RECOMMENDATION_TYPES[rec.type]?.icon || '📌'}</span>
                  <div>
                    <p className="font-medium text-secondary">{rec.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{rec.description}</p>
                    {rec.moodleCourseName && (
                      <span className="text-xs text-primary/70 mt-1 inline-block">{rec.moodleCourseName}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
