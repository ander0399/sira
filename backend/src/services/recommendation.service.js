/**
 * Servicio orquestador de recomendaciones y chat SIRA.
 * Combina el motor de reglas con Gemini para generar respuestas híbridas.
 *
 * Contexto de entrada esperado:
 *   studentContext = {
 *     profile:     { name, moodleUserId, role },
 *     courses:     [{ id, fullname, shortname, progress }],
 *     grades:      [{ courseId, courseName, items: [{ name, percentage }] }], // opcional
 *     chatHistory: [{ role, content }],
 *   }
 */

const { generateRecommendations, isExerciseRequest, isOffTopic, getExerciseRedirectResponse, getOffTopicResponse, isAcademicDistress, getDistressResponse } = require('./rules.service');
const { buildSystemPrompt, buildTeacherSystemPrompt, retrieveContext } = require('./rag.service');
const { sendToGemini, isGeminiAvailable } = require('./gemini.service');
const { getOrBuildIndex, searchIndex } = require('./courseIndex.service');
const { Recommendation } = require('../models');

/**
 * Procesa un mensaje de chat y genera la respuesta de SIRA.
 * Soporta rol 'student' y 'teacher' — cada uno usa un prompt distinto.
 *
 * @param {string} userMessage
 * @param {Object} studentContext - { profile, courses, grades, chatHistory }
 * @returns {{ response: string, source: string }}
 */
const processChat = async (userMessage, studentContext, imageData = null) => {
  const { profile, activeCourseId, moodleToken } = studentContext;

  // ── Nivel 1: filtros locales (0 tokens) ─────────────────────────────────

  // Detector de angustia académica — respuesta empática antes que nada
  if (profile.role === 'student' && isAcademicDistress(userMessage)) {
    return { response: getDistressResponse(studentContext), source: 'rules' };
  }

  // No resolver ejercicios directamente
  if (profile.role === 'student' && isExerciseRequest(userMessage)) {
    return { response: getExerciseRedirectResponse(), source: 'rules' };
  }

  // Fuera del scope académico
  if (profile.role === 'student' && isOffTopic(userMessage)) {
    return { response: getOffTopicResponse(), source: 'rules' };
  }

  // ── Nivel 2: búsqueda en material del curso (0 tokens) ──────────────────
  let courseContext = '';

  if (profile.role === 'student' && activeCourseId && moodleToken) {
    try {
      const index = await getOrBuildIndex(activeCourseId, moodleToken);
      const { pageSnippets, citedResources, found } = searchIndex(index, userMessage);

      if (found) {
        // Si encontramos contenido textual en Páginas → responder directamente
        if (pageSnippets) {
          courseContext = `\n\nMATERIAL DEL CURSO (úsalo como fuente principal para responder):\n${pageSnippets}`;
        }
        // Siempre adjuntar recursos citables si existen
        if (citedResources) {
          courseContext += `\n\nRECURSOS RELACIONADOS EN EL CURSO:\n${citedResources}`;
        }
      }
    } catch {
      // Si el índice falla, continúa normalmente
    }
  }

  // ── Nivel 3: LLM con contexto enriquecido ────────────────────────────────
  const systemPrompt = profile.role === 'teacher'
    ? buildTeacherSystemPrompt(studentContext)
    : buildSystemPrompt(studentContext);

  if (isGeminiAvailable()) {
    // RAG del KB solo para materias NO cubiertas por el índice del curso
    const ragContext = profile.role === 'student'
      ? retrieveContext(userMessage, studentContext.courses || [])
      : '';

    const enrichedPrompt = [
      systemPrompt,
      courseContext,
      ragContext ? `\nCONTEXTO ADICIONAL DEL KB:\n${ragContext}` : '',
    ].filter(Boolean).join('');

    const aiResponse = await sendToGemini(
      enrichedPrompt,
      studentContext.chatHistory || [],
      userMessage,
      { imageData }
    );

    if (aiResponse) return { response: aiResponse, source: courseContext ? 'course+gemini' : 'gemini' };
  }

  // ── Nivel 4: fallback de reglas (0 tokens) ───────────────────────────────
  return generateRulesBasedChatResponse(userMessage, studentContext);
};

/**
 * Genera respuesta de chat por reglas cuando Gemini no está disponible.
 * @param {string} message
 * @param {Object} context - { profile, courses, grades }
 * @returns {{ response: string, source: string }}
 */
const generateRulesBasedChatResponse = (message, context) => {
  const { profile, courses = [], grades = [] } = context;
  const msgLower = message.toLowerCase();

  if (profile.role === 'teacher') {
    return {
      response: `Hola, **${profile.name}**. Soy SIRA, tu asistente de análisis académico.\n\nActualmente tienes **${courses.length} curso(s)** en Moodle. Para obtener recomendaciones detalladas sobre el rendimiento de tus estudiantes, la IA avanzada no está disponible en este momento.\n\n¿Qué aspecto del rendimiento de tus cursos te gustaría analizar?`,
      source: 'rules',
    };
  }

  // Saludos — estudiante
  if (['hola', 'hi', 'buenos', 'buenas', 'hey'].some(w => msgLower.includes(w))) {
    return {
      response: `¡Hola! 👋 Soy **SIRA**, tu asistente académico de Ingeniería de Sistemas - UFPS.\n\nEstás inscrito en **${courses.length} curso(s)** en Moodle. Estoy aquí para ayudarte con orientación sobre tus materias.\n\n¿En qué puedo orientarte hoy?`,
      source: 'rules',
    };
  }

  // Consulta sobre progreso o notas
  if (['progreso', 'notas', 'como voy', 'calificacion'].some(w => msgLower.includes(w))) {
    const lowCourses = courses.filter(c => c.progress !== null && c.progress < 40);
    const lowGradeCourses = grades.filter(g => g.items.some(i => i.percentage !== null && i.percentage < 60));

    if (lowCourses.length > 0 || lowGradeCourses.length > 0) {
      const problems = [
        ...lowCourses.map(c => `${c.fullname} (progreso: ${c.progress}%)`),
        ...lowGradeCourses.map(g => `${g.courseName} (calificaciones bajas)`),
      ];
      return {
        response: `Según tu perfil en Moodle, necesitas atención en: **${problems.join(', ')}**.\n\n¿Quieres estrategias para alguno de estos cursos en particular?`,
        source: 'rules',
      };
    }
    return {
      response: `Tu progreso en Moodle se ve bien. Tienes **${courses.length} curso(s)** activos. ¿Hay algún tema específico en que quieras refuerzo?`,
      source: 'rules',
    };
  }

  // Respuesta genérica sin Gemini
  return {
    response: `Entiendo tu consulta sobre **"${message}"**.\n\nActualmente estoy operando en modo básico (Gemini no disponible). Puedo orientarte sobre:\n• Estrategias de estudio para tus cursos actuales\n• Recursos y materiales de apoyo por materia\n• Tu progreso y calificaciones en Moodle\n\n¿Sobre cuál de estos temas quieres orientación? 📚`,
    source: 'rules',
  };
};

/**
 * Genera y persiste recomendaciones para un estudiante Moodle.
 * Reemplaza las recomendaciones anteriores con las recién calculadas,
 * garantizando que siempre reflejan el estado académico actual.
 *
 * @param {number} moodleUserId
 * @param {Object} studentContext - { courses, grades }
 * @returns {Array}
 */
const generateAndSaveRecommendations = async (moodleUserId, studentContext) => {
  const rawRecommendations = generateRecommendations(studentContext);

  // Eliminar las recomendaciones previas del estudiante para evitar acumulación
  await Recommendation.destroy({ where: { moodleUserId } });

  const toCreate = rawRecommendations.map(rec => ({
    moodleUserId,
    type:             rec.type,
    title:            rec.title,
    description:      rec.description,
    moodleCourseId:   rec.moodleCourseId   ?? null,
    moodleCourseName: rec.moodleCourseName ?? null,
    source:           rec.source           ?? 'rules',
    metadata:         rec.metadata         ?? {},
  }));

  if (toCreate.length === 0) return [];
  return Recommendation.bulkCreate(toCreate);
};

module.exports = { processChat, generateAndSaveRecommendations };
