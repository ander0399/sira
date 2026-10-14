/**
 * Servicio RAG (Retrieval-Augmented Generation).
 * Construye el contexto académico desde datos Moodle e inyecta al LLM.
 *
 * Contexto de entrada esperado (estudiante):
 *   studentContext = {
 *     profile:       { name, moodleUserId, role },
 *     courses:       [{ id, fullname, shortname, progress }],
 *     grades:        [{ courseId, courseName, items: [{ name, percentage }] }], // opcional
 *     activeCourseId: number | null,  // curso desde donde se abrió el plugin Moodle
 *     chatHistory:   [{ role, content }],
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
  const { profile, courses = [], grades = [], activeCourseId } = studentContext;

  // Curso desde el que el estudiante abrió el plugin — enfoca las respuestas en él
  const activeCourse = activeCourseId
    ? courses.find(c => c.id === activeCourseId) ?? null
    : null;

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

  const activeCourseNote = activeCourse
    ? `\nCURSO ACTIVO (desde donde el estudiante abrió SIRA):
- ${activeCourse.fullname}${activeCourse.progress !== null ? ` — progreso: ${activeCourse.progress}%` : ''}
Cuando el estudiante haga preguntas sin especificar materia, enfoca tu respuesta en este curso.`
    : '';

  return `Eres SIRA (Sistema Inteligente de Recomendación Académica) de la Universidad Francisco de Paula Santander (UFPS), Cúcuta. Eres un asistente académico amigable, empático y orientado al aprendizaje activo para estudiantes de Ingeniería de Sistemas.

PERFIL DEL ESTUDIANTE ACTUAL:
- Nombre: ${profile.name || 'Estudiante'}
- ID Moodle: ${profile.moodleUserId}
- Cursos activos en Moodle:
${courseSummary}
- Cursos con bajo progreso: ${atRiskCourses || 'Ninguno'}
${gradesSummary}${activeCourseNote}

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
  const { profile, courses = [], enrolledStudents = [], activeCourseId } = teacherContext;

  const activeCourse = activeCourseId
    ? courses.find(c => c.id === activeCourseId) ?? null
    : null;

  const courseSummary = courses.length > 0
    ? courses.map(c => `  • ${c.fullname} (${c.shortname})`).join('\n')
    : '  Sin cursos asignados.';

  let studentsSection = '';
  if (activeCourse && enrolledStudents.length > 0) {
    const shown = enrolledStudents.slice(0, 25);
    const extra = enrolledStudents.length - shown.length;
    studentsSection = `
ESTUDIANTES INSCRITOS EN "${activeCourse.fullname}" (${enrolledStudents.length} estudiante${enrolledStudents.length !== 1 ? 's' : ''}):
${shown.map(s => `  • ${s.name}${s.lastAccess ? ` — último acceso: ${s.lastAccess}` : ' — sin acceso registrado'}`).join('\n')}${extra > 0 ? `\n  ... y ${extra} más.` : ''}`;
  } else if (activeCourse) {
    studentsSection = `\nCURSO ACTIVO: ${activeCourse.fullname}`;
  }

  return `Eres SIRA (Sistema Inteligente de Recomendación Académica), asistente de análisis académico para docentes de la Universidad Francisco de Paula Santander (UFPS).

DOCENTE ACTUAL:
- Nombre: ${profile.name || 'Docente'}
- ID Moodle: ${profile.moodleUserId}
- Cursos a cargo:
${courseSummary}
${studentsSection}

CAPACIDADES EN ESTE CONTEXTO:
- Identificar estudiantes con bajo progreso o calificaciones en riesgo
- Generar reportes estructurados y descargables sobre el rendimiento del curso
- Sugerir estrategias de intervención pedagógica temprana
- Analizar patrones de participación y actividad

INSTRUCCIONES DE COMPORTAMIENTO:
1. Responde en español, con un tono profesional y analítico.
2. Cuando el docente pida un reporte, genéralo con secciones claras: título, fecha, resumen, datos, recomendaciones.
3. Usa listas y estructura de tabla en texto plano cuando presentes datos de varios estudiantes.
4. Sugiere estrategias pedagógicas concretas y basadas en los datos disponibles.
5. Si tienes la lista de estudiantes, úsala para personalizar el análisis.
6. Si te piden datos que no están disponibles (ej. notas individuales de actividades), indícalo claramente.
7. Los reportes pueden ser extensos — no hay límite de palabras cuando se solicita un reporte formal.`;
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

/**
 * Construye el prompt de sistema para el administrador de SIRA.
 * Sin restricciones pedagógicas — acceso completo a datos del sistema para reportería.
 * @param {Object} adminContext - { stats, topTopics, recsByType }
 * @returns {string}
 */
const buildAdminSystemPrompt = (adminContext) => {
  const { stats, topTopics = {}, recsByType = [] } = adminContext;

  const topicsSection = Object.entries(topTopics)
    .sort(([, a], [, b]) => b - a)
    .map(([topic, count]) => `  • ${topic}: ${count} consulta${count !== 1 ? 's' : ''}`)
    .join('\n') || '  Sin datos suficientes.';

  const recsSection = recsByType.length > 0
    ? recsByType.map(r => `  • ${r.type}: ${r.count}`).join('\n')
    : '  Sin recomendaciones generadas aún.';

  return `Eres SIRA Analytics, el asistente de análisis y administración del Sistema Inteligente de Recomendación Académica (SIRA) de la Universidad Francisco de Paula Santander (UFPS).

ESTADO ACTUAL DEL SISTEMA (datos en tiempo real desde la base de datos):
- Estudiantes registrados: ${stats.totalStudents}
- Docentes registrados: ${stats.totalTeachers}
- Total mensajes en chat: ${stats.totalMessages}
- Recomendaciones generadas: ${stats.totalRecommendations}
- Usuarios activos (últimos 7 días): ${stats.activeUsers}

TEMAS MÁS CONSULTADOS (análisis de últimos 200 mensajes de estudiantes):
${topicsSection}

RECOMENDACIONES GENERADAS POR TIPO:
${recsSection}

TU FUNCIÓN:
1. Eres el asistente analítico exclusivo para el administrador de SIRA.
2. Puedes generar reportes completos sobre cualquier aspecto del sistema.
3. No tienes restricciones pedagógicas — responde cualquier consulta técnica o académica.
4. También sirves como entorno de prueba del motor de IA de SIRA.
5. Responde en español, con tono analítico y profesional.
6. Usa listas o tablas en texto plano cuando sean útiles para estructurar reportes.
7. Si te piden datos no disponibles en SIRA (ej. notas individuales o cursos específicos de Moodle sin sesión activa), indícalo e informa qué sí está disponible.`;
};

module.exports = { buildSystemPrompt, buildTeacherSystemPrompt, retrieveContext, buildAdminSystemPrompt };
