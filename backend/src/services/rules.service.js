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

/** Devuelve N elementos distintos seleccionados aleatoriamente del array. */
const pickRandom = (arr, n) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
};

/**
 * Clasifica el estado académico del estudiante en un curso combinando
 * su porcentaje de progreso Moodle y sus calificaciones reales.
 *
 * Niveles:
 *   en_riesgo      — necesita intervención inmediata
 *   necesita_mejora — rendimiento por debajo del promedio esperado
 *   en_buen_camino  — avance aceptable
 *   destacado       — rendimiento sobresaliente
 *   sin_datos       — ni progreso ni calificaciones disponibles
 *
 * @param {{ progress: number|null }} course
 * @param {{ items: Array<{ name, percentage }> }|null} gradeEntry
 * @returns {{ level: string, effectiveProgress: number|null, avgGrade: number|null, worstItems: Array }}
 */
const classifyStudentStatus = (course, gradeEntry) => {
  const progress = (course.progress !== null && course.progress !== undefined)
    ? course.progress
    : null;

  const gradedItems = gradeEntry?.items?.filter(i => i.percentage !== null) ?? [];
  const avgGrade = gradedItems.length > 0
    ? Math.round(gradedItems.reduce((sum, i) => sum + i.percentage, 0) / gradedItems.length)
    : null;

  // Activities failing below 60%, sorted worst first
  const worstItems = gradedItems
    .filter(i => i.percentage < 60)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 3);

  // Use Moodle completion progress when available; fall back to grade average as proxy
  const effectiveProgress = progress !== null ? progress : avgGrade;

  if (effectiveProgress === null) {
    return { level: 'sin_datos', effectiveProgress: null, avgGrade: null, worstItems: [] };
  }

  let level;
  if (effectiveProgress < 45 || (avgGrade !== null && avgGrade < 50)) {
    level = 'en_riesgo';
  } else if (effectiveProgress < 65 || (avgGrade !== null && avgGrade < 70)) {
    level = 'necesita_mejora';
  } else if (effectiveProgress < 85) {
    level = 'en_buen_camino';
  } else {
    level = 'destacado';
  }

  return { level, effectiveProgress, avgGrade, worstItems };
};

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
 * Clasifica cada curso individualmente (en_riesgo / necesita_mejora / en_buen_camino /
 * destacado / sin_datos) y produce recomendaciones específicas al estado real del estudiante.
 *
 * @param {Object} studentContext - { courses, grades }
 * @returns {Array}
 */
const generateRecommendations = (studentContext) => {
  const { courses = [], grades = [] } = studentContext;
  const recommendations = [];

  // Índice rápido: courseId → gradeEntry
  const gradesByCourse = {};
  grades.forEach(g => { gradesByCourse[g.courseId] = g; });

  const atRiskCourses = [];

  // ── Análisis por curso ───────────────────────────────────────────────────
  courses.forEach(course => {
    const gradeEntry = gradesByCourse[course.id] ?? null;
    const { level, effectiveProgress, avgGrade, worstItems } = classifyStudentStatus(course, gradeEntry);
    const kbKey = detectKBKey(course.fullname);
    const kb    = kbKey ? knowledgeBase[kbKey] : null;

    switch (level) {

      case 'en_riesgo': {
        atRiskCourses.push(course);

        // Descripción específica según qué dato tenemos
        let alertDesc = '';
        if (worstItems.length > 0) {
          alertDesc = `Actividades con rendimiento crítico: ${worstItems.map(i => `${i.name} (${i.percentage}%)`).join(', ')}. `;
        }
        if (effectiveProgress !== null) {
          alertDesc += `Avance actual: ${effectiveProgress}%. `;
        }
        alertDesc += kb
          ? `${knowledgeBase.GENERAL.alertMessages.highRiskSubject} Temas críticos a repasar: ${kb.topics.slice(0, 3).join(', ')}.`
          : knowledgeBase.GENERAL.alertMessages.highRiskSubject;

        recommendations.push({
          type: 'alerta',
          title: `Atención urgente: ${course.fullname}`,
          description: alertDesc.trim(),
          moodleCourseId: course.id,
          moodleCourseName: course.fullname,
          source: 'rules',
        });

        if (kb) {
          const mistake = pickRandom(kb.commonMistakes, 1)[0];
          recommendations.push({
            type: 'recurso',
            title: `Recursos para recuperar ${course.fullname}`,
            description: `Error frecuente en esta materia: ${mistake}. Materiales recomendados: ${kb.resources.map(r => r.title).join(', ')}.`,
            moodleCourseId: course.id,
            moodleCourseName: course.fullname,
            metadata: { resources: kb.resources },
            source: 'rules',
          });
        }
        break;
      }

      case 'necesita_mejora': {
        let desc = avgGrade !== null
          ? `Tu promedio es del ${avgGrade}%. `
          : `Llevas un ${effectiveProgress}% de avance. `;

        if (kb) {
          desc += pickRandom(kb.studyStrategies, 1)[0];
          recommendations.push({
            type: 'estrategia',
            title: `Mejora tu rendimiento en ${course.fullname}`,
            description: desc.trim(),
            moodleCourseId: course.id,
            moodleCourseName: course.fullname,
            source: 'rules',
          });
          const resource = pickRandom(kb.resources, 1)[0];
          recommendations.push({
            type: 'recurso',
            title: `Refuerza ${course.fullname}`,
            description: `Material de apoyo recomendado: ${resource.title}. Consulta también: ${kb.resources.filter(r => r.title !== resource.title).map(r => r.title).join(', ')}.`,
            moodleCourseId: course.id,
            moodleCourseName: course.fullname,
            metadata: { resources: kb.resources },
            source: 'rules',
          });
        } else {
          desc += pickRandom(knowledgeBase.GENERAL.studyStrategies, 1)[0];
          recommendations.push({
            type: 'estrategia',
            title: `Refuerza tu estudio en ${course.fullname}`,
            description: desc.trim(),
            moodleCourseId: course.id,
            moodleCourseName: course.fullname,
            source: 'rules',
          });
        }
        break;
      }

      case 'en_buen_camino': {
        const nextTopics = kb ? kb.topics.slice(4, 7).join(', ') : '';
        recommendations.push({
          type: 'ruta',
          title: `Buen ritmo en ${course.fullname}`,
          description: `Llevas un ${effectiveProgress}% de avance.${nextTopics ? ` Próximos temas a dominar: ${nextTopics}.` : ' ¡Mantén el ritmo!'}`,
          moodleCourseId: course.id,
          moodleCourseName: course.fullname,
          source: 'rules',
        });
        break;
      }

      case 'destacado': {
        const advancedTopics = kb ? kb.topics.slice(5).join(', ') : '';
        recommendations.push({
          type: 'ruta',
          title: `¡Excelente desempeño en ${course.fullname}!`,
          description: `Rendimiento sobresaliente: ${effectiveProgress}%.${advancedTopics ? ` Puedes explorar temas avanzados: ${advancedTopics}.` : ' ¡Sigue así!'}`,
          moodleCourseId: course.id,
          moodleCourseName: course.fullname,
          source: 'rules',
        });
        if (kb) {
          const resource = pickRandom(kb.resources, 1)[0];
          recommendations.push({
            type: 'refuerzo',
            title: `Desafío avanzado: ${course.fullname}`,
            description: `Para ir más allá del programa: ${resource.title} — ${resource.url}.`,
            moodleCourseId: course.id,
            moodleCourseName: course.fullname,
            metadata: { resources: [resource] },
            source: 'rules',
          });
        }
        break;
      }

      case 'sin_datos':
      default: {
        // Sin datos de Moodle: sólo incluir si hay KB para ese curso
        if (kb) {
          const strategy = pickRandom(kb.studyStrategies, 1)[0];
          recommendations.push({
            type: 'recurso',
            title: `Comienza con buen pie en ${course.fullname}`,
            description: `${strategy} Recursos disponibles: ${kb.resources.map(r => r.title).join(', ')}.`,
            moodleCourseId: course.id,
            moodleCourseName: course.fullname,
            metadata: { resources: kb.resources },
            source: 'rules',
          });
        }
        break;
      }
    }
  });

  // ── Alerta de carga académica cuando hay 2+ cursos en riesgo ────────────
  if (atRiskCourses.length >= 2) {
    recommendations.push({
      type: 'alerta',
      title: `Carga académica crítica — ${atRiskCourses.length} cursos en riesgo`,
      description: `Requieren atención inmediata: ${atRiskCourses.map(c => c.fullname).join(', ')}. ${pickRandom(knowledgeBase.GENERAL.studyStrategies, 2).join(' ')}`,
      source: 'rules',
    });
  }

  // ── Estrategia general aleatoria (rota para dar variedad) ───────────────
  recommendations.push({
    type: 'estrategia',
    title: 'Técnica de estudio recomendada',
    description: pickRandom(knowledgeBase.GENERAL.studyStrategies, 3).join(' | '),
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
 * Detecta señales de angustia académica en el mensaje del estudiante.
 * Inspirado en la clasificación de riesgo de SET aplicada a mensajes de chat.
 * @param {string} message
 * @returns {boolean}
 */
const isAcademicDistress = (message) => {
  const msg = normalize(message);
  const distressPatterns = [
    'no entiendo nada', 'no entiendo nada de', 'no entiendo absolutamente',
    'voy a perder', 'voy a reprobar', 'ya perdi', 'perdi la materia',
    'me va muy mal', 'me esta yendo muy mal', 'me fue muy mal',
    'llevo todo perdido', 'tengo todo perdido', 'voy perdiendo todo',
    'no se nada', 'no se nada de', 'soy muy malo', 'se me da muy mal',
    'estoy desesperado', 'estoy desesperada', 'ya no se que hacer',
    'quiero abandonar', 'voy a abandonar', 'quiero retirarme',
    'necesito ayuda urgente', 'necesito ayuda ya',
    'me van a echar', 'pierdo el semestre', 'voy a perder el semestre',
  ];
  return distressPatterns.some(p => msg.includes(normalize(p)));
};

/**
 * Genera una respuesta empática cuando se detecta angustia académica.
 * Incluye los cursos con alertas como contexto concreto de apoyo.
 * @param {Object} studentContext - { courses, grades }
 * @returns {string}
 */
const getDistressResponse = (studentContext) => {
  const { courses = [], grades = [] } = studentContext;

  const gradesByCourse = {};
  grades.forEach(g => { gradesByCourse[g.courseId] = g; });

  const atRiskList = courses
    .filter(c => {
      const { level } = classifyStudentStatus(c, gradesByCourse[c.id] ?? null);
      return level === 'en_riesgo' || level === 'necesita_mejora';
    })
    .map(c => `• ${c.fullname}`)
    .join('\n');

  const coursePart = atRiskList
    ? `\n\nViendo tu perfil, los cursos donde puedo ayudarte más ahora mismo son:\n${atRiskList}`
    : '';

  return `Entiendo que estás pasando por un momento difícil, y está bien pedir ayuda — eso ya es un gran paso.

Lo más importante ahora es que no estás solo/a. Muchos estudiantes sienten exactamente lo mismo en algún punto del semestre.${coursePart}

**Lo que puedo hacer por ti ahora mismo:**
• Explicarte cualquier concepto desde cero, sin juzgar
• Darte una ruta clara de temas a repasar según tu situación
• Recomendarte recursos gratuitos específicos para tu materia
• Ayudarte a organizar un plan de estudio por los días que quedan

¿Por cuál materia o tema quieres que empecemos? Cuéntame qué es lo que más te está costando.`;
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
  classifyStudentStatus,
  isExerciseRequest,
  isOffTopic,
  isAcademicDistress,
  getExerciseRedirectResponse,
  getOffTopicResponse,
  getDistressResponse,
  detectKBKey,
};
