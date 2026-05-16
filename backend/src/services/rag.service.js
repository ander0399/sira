/**
 * Servicio RAG (Retrieval-Augmented Generation).
 * Construye el contexto académico del estudiante que se inyecta al LLM
 * para que sus respuestas sean relevantes y personalizadas.
 */

const knowledgeBase = require('../data/knowledge');

/**
 * Construye el prompt de sistema que define el comportamiento de SIRA
 * e inyecta el contexto académico del estudiante.
 * @param {Object} studentContext - Perfil y materias del estudiante
 * @returns {string} System prompt para el LLM
 */
const buildSystemPrompt = (studentContext) => {
  const { profile, subjects } = studentContext;

  // Materias en curso con sus códigos
  const inProgressSubjects = subjects
    .filter(s => s.status === 'en_curso')
    .map(s => s.subject?.name)
    .filter(Boolean)
    .join(', ');

  // Materias con bajo rendimiento o reprobadas
  const atRiskSubjects = subjects
    .filter(s => s.status === 'reprobada' || (s.grade !== null && s.grade < 3.2))
    .map(s => `${s.subject?.name} (nota: ${s.grade ?? 'reprobada'})`)
    .filter(Boolean)
    .join(', ');

  // Contexto de las materias en curso para el RAG
  const relevantKnowledge = subjects
    .filter(s => s.status === 'en_curso' && s.subject?.code)
    .map(s => {
      const kb = knowledgeBase[s.subject.code];
      if (!kb) return '';
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
- Semestre actual: ${profile.currentSemester}
- Promedio acumulado: ${profile.gpa}
- Estilo de aprendizaje: ${profile.learningStyle}
- Materias en curso: ${inProgressSubjects || 'No registradas'}
- Materias en riesgo: ${atRiskSubjects || 'Ninguna'}

CONOCIMIENTO ACADÉMICO DISPONIBLE:
${relevantKnowledge || 'Sin materias específicas en curso.'}

INSTRUCCIONES DE COMPORTAMIENTO:
1. Siempre responde en español, de manera clara, amigable y motivadora.
2. Personaliza tus respuestas según el perfil del estudiante (semestre, promedio, estilo de aprendizaje).
3. NUNCA resuelvas ejercicios o tareas directamente. Si el estudiante pide que lo hagas, explica conceptos, metodología y da ejemplos similares (no idénticos).
4. Si el estudiante muestra señales de frustración o bajo rendimiento, sé empático y ofrece estrategias concretas.
5. Cuando des recursos, verifica que sean gratuitos y accesibles.
6. Mantén las respuestas concisas pero completas (máximo 300 palabras por respuesta).
7. Usa emojis con moderación para hacer la conversación más amena.
8. Enfócate en las materias del área de programación: Fundamentos, POO, Estructuras de Datos y Bases de Datos.`;
};

/**
 * Recupera el contexto relevante de la base de conocimiento según la consulta del usuario.
 * @param {string} query - Pregunta o mensaje del estudiante
 * @param {Array}  activeSubjectCodes - Códigos de materias en curso del estudiante
 * @returns {string} Fragmento de conocimiento relevante
 */
const retrieveContext = (query, activeSubjectCodes = []) => {
  const queryLower = query.toLowerCase();
  const relevantSections = [];

  // Mapeo de palabras clave a materias
  const keywordMap = {
    FUND_PROG: ['programacion', 'algoritmo', 'variable', 'ciclo', 'función', 'python', 'c++', 'fundamentos'],
    POO: ['objeto', 'clase', 'herencia', 'polimorfismo', 'encapsulamiento', 'java', 'poo', 'orientado'],
    ESTR_DATOS: ['árbol', 'lista', 'pila', 'cola', 'grafo', 'hash', 'bfs', 'dfs', 'estructura', 'complejidad', 'big o'],
    BD: ['sql', 'base de datos', 'tabla', 'join', 'consulta', 'normalización', 'relacional', 'postgresql'],
  };

  Object.entries(keywordMap).forEach(([code, keywords]) => {
    const isRelevant = keywords.some(kw => queryLower.includes(kw)) || activeSubjectCodes.includes(code);
    if (isRelevant && knowledgeBase[code]) {
      const kb = knowledgeBase[code];
      relevantSections.push(`[${kb.name}] Temas: ${kb.topics.slice(0, 3).join(', ')}. Estrategias: ${kb.studyStrategies.slice(0, 2).join('; ')}.`);
    }
  });

  return relevantSections.join('\n');
};

module.exports = { buildSystemPrompt, retrieveContext };
