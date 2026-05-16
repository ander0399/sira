/**
 * Motor de reglas académicas de SIRA.
 * Analiza el perfil del estudiante y genera recomendaciones basadas en reglas
 * predefinidas. Funciona sin necesidad de API de IA externa.
 */

const knowledgeBase = require('../data/knowledge');

/**
 * Genera recomendaciones para un estudiante según su perfil académico.
 * @param {Object} profile  - Perfil del estudiante (StudentProfile + subjects)
 * @param {Array}  subjects - Historial de materias del estudiante
 * @returns {Array} Lista de recomendaciones con tipo, título y descripción
 */
const generateRecommendations = (profile, subjects) => {
  const recommendations = [];

  // Materias en curso
  const inProgress = subjects.filter(s => s.status === 'en_curso');
  // Materias reprobadas
  const failed = subjects.filter(s => s.status === 'reprobada');
  // Materias del área de programación en riesgo
  const highRiskInProgress = inProgress.filter(s => s.subject && s.subject.isHighRisk);

  // ── Regla 1: Promedio bajo ────────────────────────────────────────────────
  if (profile.gpa < 3.2 && profile.gpa > 0) {
    recommendations.push({
      type: 'alerta',
      title: 'Tu promedio requiere atención',
      description: knowledgeBase.GENERAL.alertMessages.lowGpa,
      source: 'rules',
    });

    recommendations.push({
      type: 'estrategia',
      title: 'Técnicas de estudio para mejorar tu promedio',
      description: `Con un promedio de ${profile.gpa}, aquí hay estrategias clave: ${knowledgeBase.GENERAL.studyStrategies.slice(0, 3).join(' | ')}`,
      source: 'rules',
    });
  }

  // ── Regla 2: Materia de alto riesgo en curso ──────────────────────────────
  highRiskInProgress.forEach(studentSubject => {
    const subjectCode = studentSubject.subject.code;
    const kb = knowledgeBase[subjectCode];

    if (kb) {
      recommendations.push({
        type: 'alerta',
        title: `Atención: ${studentSubject.subject.name} es una materia de alta dificultad`,
        description: `${knowledgeBase.GENERAL.alertMessages.highRiskSubject} Errores frecuentes en esta materia: ${kb.commonMistakes.slice(0, 2).join('; ')}.`,
        subjectCode,
        source: 'rules',
      });

      recommendations.push({
        type: 'recurso',
        title: `Recursos recomendados para ${studentSubject.subject.name}`,
        description: `Recursos para reforzar: ${kb.resources.map(r => r.title).join(', ')}.`,
        subjectCode,
        metadata: { resources: kb.resources },
        source: 'rules',
      });
    }
  });

  // ── Regla 3: Materia reprobada que debe repetir ───────────────────────────
  failed.forEach(studentSubject => {
    const subjectCode = studentSubject.subject?.code;
    const kb = knowledgeBase[subjectCode];

    recommendations.push({
      type: 'refuerzo',
      title: `Plan de refuerzo: ${studentSubject.subject?.name}`,
      description: `${knowledgeBase.GENERAL.alertMessages.repeatingSubject}${kb ? ` Temas clave a trabajar: ${kb.topics.slice(0, 3).join(', ')}.` : ''}`,
      subjectCode,
      source: 'rules',
    });
  });

  // ── Regla 4: Estilo de aprendizaje visual ────────────────────────────────
  if (profile.learningStyle === 'visual') {
    recommendations.push({
      type: 'estrategia',
      title: 'Recursos visuales para tu estilo de aprendizaje',
      description: 'Como aprendiz visual, te beneficiarás de: VisuAlgo para algoritmos (https://visualgo.net), diagramas de flujo para lógica, y videos en YouTube antes de leer texto.',
      source: 'rules',
    });
  }

  // ── Regla 5: Ruta de aprendizaje para el semestre siguiente ──────────────
  if (profile.currentSemester <= 3) {
    const nextSemester = profile.currentSemester + 1;
    recommendations.push({
      type: 'ruta',
      title: `Planifica tu semestre ${nextSemester}`,
      description: `Para prepararte para el semestre ${nextSemester}, asegúrate de dominar bien los fundamentos actuales antes de avanzar a materias más complejas.`,
      source: 'rules',
    });
  }

  return recommendations;
};

/**
 * Detecta si el mensaje del usuario intenta que SIRA resuelva un ejercicio directamente.
 * Implementa la restricción pedagógica del anteproyecto.
 * @param {string} message - Mensaje del estudiante
 * @returns {boolean}
 */
const isExerciseRequest = (message) => {
  const exerciseKeywords = [
    'resuelve', 'resuelva', 'dame la respuesta', 'hazme el ejercicio',
    'escríbeme el código', 'dame el código completo', 'haz la tarea',
    'dame la solución', 'completa el ejercicio', 'termina el código',
    'cuál es la respuesta del', 'dime la respuesta',
  ];

  const lowerMessage = message.toLowerCase();
  return exerciseKeywords.some(keyword => lowerMessage.includes(keyword));
};

/**
 * Genera la respuesta de redirección cuando se detecta un intento de obtener respuestas directas.
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
};
