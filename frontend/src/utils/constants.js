/**
 * Constantes globales del frontend de SIRA.
 */

export const LEARNING_STYLES = [
  { value: 'visual',      label: 'Visual' },
  { value: 'auditivo',    label: 'Auditivo' },
  { value: 'kinestesico', label: 'Kinestésico' },
  { value: 'lectura',     label: 'Lectura/Escritura' },
];

export const SUBJECT_STATUS = {
  en_curso:  { label: 'En curso',  color: 'bg-blue-100 text-blue-700' },
  aprobada:  { label: 'Aprobada',  color: 'bg-green-100 text-green-700' },
  reprobada: { label: 'Reprobada', color: 'bg-red-100 text-red-700' },
  pendiente: { label: 'Pendiente', color: 'bg-gray-100 text-gray-600' },
};

export const RECOMMENDATION_TYPES = {
  recurso:   { label: 'Recurso',    icon: '📚' },
  estrategia:{ label: 'Estrategia', icon: '🎯' },
  ruta:      { label: 'Ruta',       icon: '🗺️' },
  alerta:    { label: 'Alerta',     icon: '⚠️' },
  refuerzo:  { label: 'Refuerzo',   icon: '💪' },
};

export const SEMESTERS = Array.from({ length: 10 }, (_, i) => ({
  value: i + 1,
  label: `Semestre ${i + 1}`,
}));
