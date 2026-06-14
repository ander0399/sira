/**
 * Motor de reglas académicas de SIRA.
 * Analiza los cursos y calificaciones Moodle del estudiante y genera
 * recomendaciones basadas en reglas predefinidas.
 *
 * Contexto de entrada esperado:
 *   studentContext = {
 *     profile:  { name, moodleUserId, role },
 *     courses:  [{ id, fullname, shortname, progress }],
 *     grades:   [{ courseId, courseName, items: [{ name, percentage }] }], // opcional
 *   }
 */

const knowledgeBase = require('../data/knowledge');

// BD antes que ESTR_DATOS para evitar que 'dato' en ESTR_DATOS capture cursos de BD
const KB_KEYWORDS = {
  BD:        ['base de dato', 'bases de dato', 'sql', 'base datos'],
  FUND_PROG: ['fundamentos', 'introduccion', 'fund prog', 'algoritmos basicos'],
  POO:       ['orientad', 'poo', 'programacion orientada'],
  ESTR_DATOS:['estructur', 'algoritmos y estructura', 'estr datos'],
};

/** Elimina acentos para comparación robusta de nombres de cursos Moodle. */
const normalize = (str) =>
  str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Detecta qué clave del KB corresponde al nombre completo de un curso Moodle.
 * @param {string} courseName
 * @returns {string|null}
 */
const detectKBKey = (courseName) => {
  const normalized = normalize(courseName);
  for (const [key, keywords] of Object.entries(KB_KEYWORDS)) {
    if (keywords.some(kw => normalized.includes(normalize(kw)))) return key;
  }
  return null;
};

/**
 * Genera recomendaciones para un estudiante según sus cursos y calificaciones Moodle.
 * @param {Object} studentContext - { profile, courses, grades }
 * @returns {Array}
 */
const generateRecommendations = (studentContext) => {
  const { profile, courses = [], grades = [] } = studentContext;
  const recommendations = [];

  const lowProgressCourses  = courses.filter(c => c.progress !== null && c.progress !== undefined && c.progress < 40);
  const goodProgressCourses = courses.filter(c => c.progress !== null && c.progress !== undefined && c.progress >= 75);

  // ── Regla 1: Cursos con progreso bajo ────────────────────────────────────
  lowProgressCourses.forEach(course => {
    const kbKey = detectKBKey(course.fullname);
    const kb = kbKey ? knowledgeBase[kbKey] : null;

    recommendations.push({
      type: 'alerta',
      title: `Bajo progreso en ${course.fullname}`,
      description: `Tu avance es del ${course.progress}%. ${knowledgeBase.GENERAL.alertMessages.highRiskSubject}${kb ? ` Temas clave: ${kb.topics.slice(0, 3).join(', ')}.` : ''}`,
      moodleCourseId: course.id,
      moodleCourseName: course.fullname,
      source: 'rules',
    });

    if (kb) {
      recommendations.push({
        type: 'recurso',
        title: `Recursos recomendados para ${course.fullname}`,
        description: `Para reforzar este curso: ${kb.resources.map(r => r.title).join(', ')}.`,
        moodleCourseId: course.id,
        moodleCourseName: course.fullname,
        metadata: { resources: kb.resources },
        source: 'rules',
      });
    }
  });

  // ── Regla 2: Calificaciones bajas (< 60%) en un curso ────────────────────
  grades.forEach(gradeEntry => {
    const lowGradeItems = gradeEntry.items.filter(i => i.percentage !== null && i.percentage < 60);
    if (lowGradeItems.length === 0) return;

    const kbKey = detectKBKey(gradeEntry.courseName);
    const kb = kbKey ? knowledgeBase[kbKey] : null;

    recommendations.push({
      type: 'alerta',
      title: `Calificaciones bajas en ${gradeEntry.courseName}`,
      description: `Tienes ${lowGradeItems.length} actividad(es) con menos del 60%: ${lowGradeItems.map(i => `${i.name} (${i.percentage}%)`).join(', ')}.${kb ? ` Errores comunes: ${kb.commonMistakes[0]}.` : ''}`,
      moodleCourseId: gradeEntry.courseId,
      moodleCourseName: gradeEntry.courseName,
      source: 'rules',
    });

    if (kb) {
      recommendations.push({
        type: 'estrategia',
        title: `Estrategias para mejorar en ${gradeEntry.courseName}`,
        description: kb.studyStrategies.slice(0, 3).join(' | '),
        moodleCourseId: gradeEntry.courseId,
        moodleCourseName: gradeEntry.courseName,
        source: 'rules',
      });
    }
  });

  // ── Regla 3: Varios cursos en bajo progreso → alerta de carga académica ──
  if (lowProgressCourses.length >= 2) {
    recommendations.push({
      type: 'estrategia',
      title: 'Gestiona tu carga académica',
      description: `Tienes ${lowProgressCourses.length} cursos con bajo progreso. ${knowledgeBase.GENERAL.studyStrategies.slice(0, 3).join(' | ')}`,
      source: 'rules',
    });
  }

  // ── Regla 4: Cursos con buen progreso → refuerzo positivo ────────────────
  goodProgressCourses.forEach(course => {
    const kbKey = detectKBKey(course.fullname);
    const kb = kbKey ? knowledgeBase[kbKey] : null;
    const nextTopics = kb ? kb.topics.slice(4, 6).join(', ') : '';

    recommendations.push({
      type: 'ruta',
      title: `¡Buen avance en ${course.fullname}!`,
      description: `Llevas un ${course.progress}% de progreso.${nextTopics ? ` Temas que vienen: ${nextTopics}.` : ' ¡Sigue así!'}`,
      moodleCourseId: course.id,
      moodleCourseName: course.fullname,
      source: 'rules',
    });
  });

  // ── Regla 5: Estrategias generales (siempre se incluye una) ──────────────
  recommendations.push({
    type: 'estrategia',
    title: 'Técnicas de estudio recomendadas',
    description: knowledgeBase.GENERAL.studyStrategies.slice(0, 3).join(' | '),
    source: 'rules',
  });

  return recommendations;
};

/**
 * Detecta si el mensaje intenta que SIRA resuelva un ejercicio directamente.
 * @param {string} message
 * @returns {boolean}
 */
const isExerciseRequest = (message) => {
  const exerciseKeywords = [
    'resuelve', 'resuelva', 'dame la respuesta', 'hazme el ejercicio',
    'escríbeme el código', 'dame el código completo', 'haz la tarea',
    'dame la solución', 'completa el ejercicio', 'termina el código',
    'cuál es la respuesta del', 'dime la respuesta',
  ];
  return exerciseKeywords.some(kw => message.toLowerCase().includes(kw));
};

/**
 * Respuesta de redirección cuando se detecta solicitud de respuesta directa.
 * @returns {string}
 */
const getExerciseRedirectResponse = () => {
  return `Entiendo que quieres ayuda con ese ejercicio 😊, pero mi rol es guiarte para que lo resuelvas tú mismo — ¡así aprenderás mucho más!

Puedo ayudarte con:
• **Explicación conceptual** del tema relacionado
• **Pasos metodológicos** para abordar el problema
• **Ejemplos similares** (no idénticos) que te sirvan de referencia
• **Recursos y bibliografía** donde profundizar

¿Qué parte del tema te genera más duda? Cuéntame y te oriento paso a paso. 🎯`;
};

module.exports = {
  generateRecommendations,
  isExerciseRequest,
  getExerciseRedirectResponse,
  detectKBKey,
};
