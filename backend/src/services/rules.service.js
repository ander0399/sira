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
  const msg = message.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const exercisePatterns = [
    // Solicitudes directas de solución
    'resuelve', 'resuelva', 'dame la respuesta', 'dame la solucion',
    'hazme el ejercicio', 'haz el ejercicio', 'haz la tarea', 'hazme la tarea',
    'completa el ejercicio', 'termina el codigo', 'termina el ejercicio',
    'cuál es la respuesta', 'cual es la respuesta', 'dime la respuesta',
    'dime el resultado', 'cual es el resultado',
    // Solicitudes de código completo
    'escribeme el codigo', 'escribe el codigo', 'dame el codigo completo',
    'dame el codigo', 'hazme el codigo', 'haz el codigo',
    'escribe el programa', 'hazme el programa', 'crea el programa',
    'escribe la funcion', 'escribe la clase', 'implementa el',
    'codifica el', 'programa que', 'codigo para',
    // Solicitudes de tarea/parcial
    'resuelveme', 'haz por mi', 'hazlo por mi', 'respondeme el',
    'resuelve el parcial', 'resuelve el taller', 'resuelve el quiz',
    'desarrolla el ejercicio', 'desarrolla la actividad',
  ];
  return exercisePatterns.some(kw => msg.includes(kw));
};

// Materias y temas permitidos en SIRA
const PERMITTED_SUBJECTS = [
  'programacion', 'algoritmo', 'variable', 'ciclo', 'funcion', 'python', 'c++', 'java',
  'fundamentos', 'codigo', 'pseudocodigo', 'diagrama de flujo', 'compilar', 'depurar',
  'objeto', 'clase', 'herencia', 'polimorfismo', 'encapsulamiento', 'abstraccion', 'poo',
  'interfaz', 'constructor', 'metodo', 'atributo', 'instancia', 'sobrecarga',
  'arbol', 'lista', 'pila', 'cola', 'grafo', 'hash', 'bfs', 'dfs', 'estructura',
  'complejidad', 'big o', 'ordenamiento', 'busqueda', 'recursion', 'nodo',
  'sql', 'base de dato', 'tabla', 'join', 'consulta', 'normalizacion', 'relacional',
  'postgresql', 'mysql', 'er', 'entidad', 'relacion', 'clave', 'indice', 'trigger',
  'ingenieria', 'sistemas', 'semestre', 'materia', 'nota', 'progreso', 'calificacion',
  'estudiar', 'aprender', 'entender', 'explicar', 'concepto', 'ejercicio', 'practica',
  'tarea', 'parcial', 'taller', 'proyecto', 'recurso', 'bibliograf',
];

const OFF_TOPIC_TRIGGERS = [
  'receta', 'cocina', 'comida', 'deporte', 'futbol', 'pelicula', 'musica', 'cancion',
  'chiste', 'broma', 'historia de amor', 'politica', 'religion', 'noticias',
  'medicina', 'salud', 'enfermedad', 'quimica', 'fisica', 'biologia', 'matematica',
  'calculo', 'algebra', 'geometria', 'estadistica',
  'translate', 'traducir al', 'redactar carta', 'escribeme un poema', 'escribe un cuento',
];

/**
 * Detecta si el mensaje está fuera del alcance académico de SIRA.
 * @param {string} message
 * @returns {boolean}
 */
const isOffTopic = (message) => {
  const msg = message.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const hasOffTrigger = OFF_TOPIC_TRIGGERS.some(kw => msg.includes(kw));
  if (!hasOffTrigger) return false;
  // Si tiene alguna palabra permitida también, no bloquear
  const hasPermitted = PERMITTED_SUBJECTS.some(kw => msg.includes(kw));
  return !hasPermitted;
};

/**
 * Respuesta de redirección cuando se detecta solicitud de respuesta directa.
 * @returns {string}
 */
const getExerciseRedirectResponse = () => {
  return `Entiendo que quieres ayuda con ese ejercicio, pero mi rol es guiarte para que lo resuelvas tú mismo — ¡así aprenderás mucho más!

Puedo ayudarte con:
• **Explicación conceptual** del tema relacionado
• **Pasos metodológicos** para abordar el problema
• **Ejemplos similares** (no idénticos) que te sirvan de referencia
• **Recursos y bibliografía** donde profundizar

¿Qué parte del tema te genera más duda? Cuéntame y te oriento paso a paso.`;
};

/**
 * Respuesta cuando el tema está fuera del scope de SIRA.
 * @returns {string}
 */
const getOffTopicResponse = () => {
  return `Ese tema está fuera de mi alcance. Soy SIRA, un asistente académico especializado exclusivamente en las materias de Ingeniería de Sistemas de la UFPS:

• **Fundamentos de Programación**
• **Programación Orientada a Objetos (POO)**
• **Estructuras de Datos y Algoritmos**
• **Bases de Datos**

¿Tienes alguna duda sobre alguna de estas materias? Con gusto te oriento.`;
};

module.exports = {
  generateRecommendations,
  isExerciseRequest,
  isOffTopic,
  getExerciseRedirectResponse,
  getOffTopicResponse,
  detectKBKey,
};
