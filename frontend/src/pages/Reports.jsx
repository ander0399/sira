/**
 * Página de reportes básicos.
 * Muestra las recomendaciones recibidas con opción de dar feedback (estrelllas).
 */
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRecommendations, markAsRead, submitFeedback } from '../store/slices/recommendationSlice';
import api from '../services/api';
import Spinner    from '../components/shared/Spinner';
import StarRating from '../components/shared/StarRating';
import Button     from '../components/shared/Button';
import { RECOMMENDATION_TYPES } from '../utils/constants';

export default function Reports() {
  const dispatch = useDispatch();
  const { list: recommendations, loading } = useSelector((s) => s.recommendations);

  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [feedbackForms, setFeedbackForms]     = useState({});  // { recId: { rating, comment } }
  const [activeFilter, setActiveFilter]       = useState('all');

  useEffect(() => {
    dispatch(fetchRecommendations());
    api.get('/feedback/summary').then(({ data }) => setFeedbackSummary(data.summary)).catch(() => {});
  }, [dispatch]);

  const handleMarkRead = (id) => dispatch(markAsRead(id));

  const handleFeedbackChange = (recId, field, value) => {
    setFeedbackForms(prev => ({ ...prev, [recId]: { ...prev[recId], [field]: value } }));
  };

  const handleSubmitFeedback = (recId) => {
    const fb = feedbackForms[recId];
    if (!fb?.rating) return;
    dispatch(submitFeedback({ recommendationId: recId, rating: fb.rating, comment: fb.comment || '' }));
    setFeedbackForms(prev => { const n = {...prev}; delete n[recId]; return n; });
  };

  const filteredRecs = activeFilter === 'all'
    ? recommendations
    : recommendations.filter(r => r.type === activeFilter);

  if (loading && recommendations.length === 0) {
    return <div className="flex justify-center mt-20"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-secondary">Reportes y Recomendaciones</h1>

      {/* Resumen de feedback */}
      {feedbackSummary && feedbackSummary.total > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total feedback',    value: feedbackSummary.total },
            { label: 'Calificación media', value: `${feedbackSummary.avgRating} ★` },
            { label: 'Útiles',             value: feedbackSummary.helpful },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-primary">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros por tipo */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${activeFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Todas ({recommendations.length})
        </button>
        {Object.entries(RECOMMENDATION_TYPES).map(([type, { label, icon }]) => {
          const count = recommendations.filter(r => r.type === type).length;
          if (count === 0) return null;
          return (
            <button key={type} onClick={() => setActiveFilter(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${activeFilter === type ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {icon} {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Lista de recomendaciones */}
      {filteredRecs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500">No hay recomendaciones de este tipo aún.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecs.map((rec) => {
            const typeInfo = RECOMMENDATION_TYPES[rec.type] || { icon: '📌', label: rec.type };
            const fb = feedbackForms[rec.id];
            const hasFeedback = !!rec.feedback;

            return (
              <div key={rec.id} className={`bg-white rounded-2xl border shadow-sm p-5 transition ${rec.isRead ? 'border-gray-100 opacity-80' : 'border-primary/20'}`}>
                {/* Cabecera */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{typeInfo.icon}</span>
                    <div>
                      <p className="font-bold text-secondary">{rec.title}</p>
                      <p className="text-xs text-gray-400">{typeInfo.label} · {new Date(rec.createdAt).toLocaleDateString('es-CO')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {rec.source === 'groq' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">IA</span>
                    )}
                    {!rec.isRead && (
                      <span className="w-2 h-2 bg-primary rounded-full" title="No leída" />
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4 leading-relaxed">{rec.description}</p>

                {/* Recursos (si los hay) */}
                {rec.metadata?.resources?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {rec.metadata.resources.map((r, i) => (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-100 transition">
                        🔗 {r.title}
                      </a>
                    ))}
                  </div>
                )}

                {/* Feedback */}
                <div className="border-t border-gray-50 pt-3">
                  {hasFeedback ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <StarRating value={rec.feedback.rating} readOnly />
                      <span>{rec.feedback.comment || 'Sin comentario'}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400">¿Te fue útil esta recomendación?</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <StarRating value={fb?.rating || 0} onChange={(v) => handleFeedbackChange(rec.id, 'rating', v)} />
                        <input type="text" placeholder="Comentario opcional"
                          value={fb?.comment || ''}
                          onChange={e => handleFeedbackChange(rec.id, 'comment', e.target.value)}
                          className="flex-1 min-w-32 text-xs px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40" />
                        <Button size="sm" onClick={() => handleSubmitFeedback(rec.id)} disabled={!fb?.rating}>
                          Enviar
                        </Button>
                        {!rec.isRead && (
                          <Button size="sm" variant="ghost" onClick={() => handleMarkRead(rec.id)}>
                            Marcar leída
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
