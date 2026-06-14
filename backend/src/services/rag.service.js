/**
 * Servicio RAG (Retrieval-Augmented Generation).
 * Construye el contexto académico desde datos Moodle e inyecta al LLM.
 *
 * Contexto de entrada esperado (estudiante):
 *   studentContext = {
 *     profile:  { name, moodleUserId, role },
 *     courses:  [{ id, fullname, shortname, progress }],
 *     grades:   [{ courseId, courseName, items: [{ name, percentage }] }], // opcional
 *     chatHistory: [{ role, content }],
 *   }
 */

const knowledgeBase = require('../data/knowledge');
const { detectKBKey } = require('./rules.service');

/**
 * Construye el prompt de sistema para estudiantes autenticados vía Moodle.
 * @param {Object} studentContext
 * @returns {string}
 */
const buildSystemPrompt = (studentContext) => {
  const { profile, courses = [], grades = [] } = studentContext;

  const courseSummary = courses.length > 0
    ? courses.map(c => {
        const prog = c.progress !== null && c.progress !== undefined
          ? `${c.progress}% completado`
          : 'sin dato de progreso';
        return `  • ${c.fullname} (${prog})`;
      }).join('\n')
    : '  No hay cursos registrados en Moodle.';

  const atRiskCourses = courses
    .filter(c => c.progress !== null && c.progress < 40)
    .map(c => `${c.fullname} (${c.progress}%)`)
    .join(', ');

  // Resumen de calificaciones si están disponibles
  let gradesSummary = '';
  if (grades.length > 0) {
    gradesSummary = '\nCALIFICACIONES DISPONIBLES:\n' + grades.map(g => {
      const items = g.items
        .filter(i => i.percentage !== null)
        .map(i => `    - ${i.name}: ${i.percentage}%`)
        .join('\n');
      return `  [${g.courseName}]\n${items || '    Sin calificaciones aún'}`;
    }).join('\n');
  }

  // Conocimiento específico de las materias en curso
  const relevantKnowledge = courses
    .map(c => {
      const kbKey = detectKBKey(c.fullname);
      if (!kbKey) return '';
      const kb = knowledgeBase[kbKey];
      return `
[Materia: ${kb.name}]
Temas principales: ${kb.topics.slice(0, 4).join(', ')}
Errores comunes: ${kb.commonMistakes.slice(0, 2).join('; ')}
Estrategias recomendadas: ${kb.studyStrategies.slice(0, 2).join('; ')}`;
    })
    .filter(Boolean)
    .join('\n');

  return `Eres SIRA (Sistema Inteligente de Recomendación Académica) de la Universidad Francisco de Paula Santander (UFPS), Cúcuta. Eres un asistente académico amigable, empático y orientado al aprendizaje activo para estudiantes de Ingeniería de Sistemas.

PERFIL DEL ESTUDIANTE ACTUAL:
- Nombre: ${profile.name || 'Estudiante'}
- ID Moodle: ${profile.moodleUserId}
- Cursos activos en Moodle:
${courseSummary}
- Cursos con bajo progreso: ${atRiskCourses || 'Ninguno'}
${gradesSummary}

CONOCIMIENTO ACADÉMICO DISPONIBLE:
${relevantKnowledge || 'Sin materias del área de programación detectadas.'}

INSTRUCCIONES DE COMPORTAMIENTO:
1. Siempre responde en español, de manera clara, amigable y motivadora.
2. Personaliza tus respuestas según los cursos, el progreso y las calificaciones del estudiante en Moodle.
3. NUNCA resuelvas ejercicios o tareas directamente. Explica conceptos, metodología y da ejemplos similares (no idénticos).
4. Si el estudiante muestra bajo progreso o calificaciones bajas, sé empático y ofrece estrategias concretas.
5. Cuando des recursos, verifica que sean gratuitos y accesibles.
6. Mantén las respuestas concisas pero completas (máximo 300 palabras por respuesta).
7. Usa emojis con moderación para hacer la conversación más amena.
8. Enfócate en las materias del área de programación: Fundamentos, POO, Estructuras de Datos y Bases de Datos.`;
};

/**
 * Construye el prompt de sistema para docentes autenticados vía Moodle.
 * El docente usa SIRA como herramienta de análisis de sus estudiantes.
 * @param {Object} teacherContext - { profile, courses }
 * @returns {string}
 */
const buildTeacherSystemPrompt = (teacherContext) => {
  const { profile, courses = [] } = teacherContext;

  const courseSummary = courses.length > 0
    ? courses.map(c => `  • ${c.fullname} (${c.shortname})`).join('\n')
    : '  Sin cursos asignados.';

  return `Eres SIRA (Sistema Inteligente de Recomendación Académica), asistente de análisis académico para docentes de la Universidad Francisco de Paula Santander (UFPS).

DOCENTE ACTUAL:
- Nombre: ${profile.name || 'Docente'}
- ID Moodle: ${profile.moodleUserId}
- Cursos a cargo:
${courseSummary}

ROL DEL DOCENTE EN SIRA:
- Identificar estudiantes con bajo progreso o calificaciones en riesgo
- Generar estrategias de intervención temprana
- Consultar recomendaciones generadas para sus estudiantes
- Analizar patrones de rendimiento en sus cursos

INSTRUCCIONES DE COMPORTAMIENTO:
1. Responde en español, con un tono profesional y analítico.
2. Ayuda al docente a interpretar datos académicos de Moodle.
3. Sugiere estrategias pedagógicas de intervención para estudiantes en riesgo.
4. No compartas información personal de estudiantes más allá del contexto académico.
5. Enfócate en acciones concretas y basadas en datos.
6. Mantén las respuestas estructuradas y concisas (máximo 400 palabras).`;
};

/**
 * Recupera contexto relevante del knowledge base según la consulta y cursos activos.
 * @param {string} query
 * @param {Array}  courses - Cursos del estudiante desde Moodle
 * @returns {string}
 */
const retrieveContext = (query, courses = []) => {
  const queryLower = query.toLowerCase();
  const relevantSections = [];

  const keywordMap = {
    FUND_PROG:  ['programacion', 'algoritmo', 'variable', 'ciclo', 'funcion', 'python', 'c++', 'fundamentos'],
    POO:        ['objeto', 'clase', 'herencia', 'polimorfismo', 'encapsulamiento', 'java', 'poo', 'orientado'],
    ESTR_DATOS: ['arbol', 'lista', 'pila', 'cola', 'grafo', 'hash', 'bfs', 'dfs', 'estructura', 'complejidad', 'big o'],
    BD:         ['sql', 'base de datos', 'tabla', 'join', 'consulta', 'normalizacion', 'relacional', 'postgresql'],
  };

  const activeCourseKeys = courses.map(c => detectKBKey(c.fullname)).filter(Boolean);

  Object.entries(keywordMap).forEach(([code, keywords]) => {
    // Normalizar query para comparación sin acentos
    const normalizedQuery = queryLower.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const matchesQuery   = keywords.some(kw => normalizedQuery.includes(kw));
    const matchesCourses = activeCourseKeys.includes(code);

    if ((matchesQuery || matchesCourses) && knowledgeBase[code]) {
      const kb = knowledgeBase[code];
      relevantSections.push(
        `[${kb.name}] Temas: ${kb.topics.slice(0, 3).join(', ')}. Estrategias: ${kb.studyStrategies.slice(0, 2).join('; ')}.`
      );
    }
  });

  return relevantSections.join('\n');
};

module.exports = { buildSystemPrompt, buildTeacherSystemPrompt, retrieveContext };
