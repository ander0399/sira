/**
 * Dashboard principal del estudiante.
 * Muestra resumen del perfil, recomendaciones activas y acceso rápido al chat.
 */
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchProfile }          from '../store/slices/profileSlice';
import { fetchRecommendations, generateRecommendations } from '../store/slices/recommendationSlice';
import Spinner  from '../components/shared/Spinner';
import Button   from '../components/shared/Button';
import { RECOMMENDATION_TYPES, SUBJECT_STATUS } from '../utils/constants';

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user    = useSelector((s) => s.auth.user);
  const profile = useSelector((s) => s.profile.data);
  const profileLoading = useSelector((s) => s.profile.loading);
  const recommendations = useSelector((s) => s.recommendations.list);
  const recLoading      = useSelector((s) => s.recommendations.loading);

  useEffect(() => {
    dispatch(fetchProfile());
    dispatch(fetchRecommendations());
  }, [dispatch]);

  const handleGenerateRecs = () => dispatch(generateRecommendations());

  if (profileLoading) {
    return <div className="flex justify-center mt-20"><Spinner size="lg" /></div>;
  }

  const unreadRecs = recommendations.filter(r => !r.isRead);
  const inProgress = profile?.subjects?.filter(s => s.status === 'en_curso') || [];
  const atRisk     = profile?.subjects?.filter(s => s.status === 'reprobada') || [];

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">
          ¡Hola, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-white/80 text-sm">
          Bienvenido a SIRA — tu asistente académico inteligente.
        </p>
        <div className="flex gap-4 mt-4 flex-wrap">
          <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
            <div className="text-xl font-bold">{profile?.currentSemester || '—'}</div>
            <div className="text-xs text-white/80">Semestre</div>
          </div>
          <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
            <div className="text-xl font-bold">{profile?.gpa || '0.0'}</div>
            <div className="text-xs text-white/80">Promedio</div>
          </div>
          <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
            <div className="text-xl font-bold">{inProgress.length}</div>
            <div className="text-xs text-white/80">En curso</div>
          </div>
          <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
            <div className="text-xl font-bold">{unreadRecs.length}</div>
            <div className="text-xs text-white/80">Recomendaciones</div>
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Chatear con SIRA', icon: '💬', to: '/chat',    color: 'bg-blue-50 hover:bg-blue-100 text-blue-700' },
          { label: 'Mi Perfil',        icon: '📋', to: '/profile', color: 'bg-green-50 hover:bg-green-100 text-green-700' },
          { label: 'Reportes',         icon: '📊', to: '/reports', color: 'bg-purple-50 hover:bg-purple-100 text-purple-700' },
          { label: 'Generar Recomend.', icon: '✨', onClick: handleGenerateRecs, color: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700' },
        ].map(({ label, icon, to, onClick, color }) => (
          <button
            key={label}
            onClick={to ? () => navigate(to) : onClick}
            className={`${color} rounded-xl p-4 flex flex-col items-center gap-2 font-medium text-sm transition`}
          >
            <span className="text-2xl">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Materias en curso */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-secondary mb-4 flex items-center gap-2">
            📚 Materias en curso
          </h2>
          {inProgress.length === 0 ? (
            <p className="text-gray-400 text-sm">No tienes materias registradas en curso.</p>
          ) : (
            <ul className="space-y-2">
              {inProgress.map((ss) => (
                <li key={ss.id} className="flex items-center justify-between text-sm">
                  <span className="text-secondary font-medium">{ss.subject?.name}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${SUBJECT_STATUS.en_curso.color}`}>
                    En curso
                  </span>
                </li>
              ))}
            </ul>
          )}
          {atRisk.length > 0 && (
            <div className="mt-3 bg-red-50 rounded-lg p-3">
              <p className="text-xs text-red-600 font-semibold">⚠️ Materias reprobadas: {atRisk.map(s => s.subject?.name).join(', ')}</p>
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
                  <span className="text-xl flex-shrink-0">{RECOMMENDATION_TYPES[rec.type]?.icon || '📌'}</span>
                  <div>
                    <p className="font-medium text-secondary">{rec.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{rec.description}</p>
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
