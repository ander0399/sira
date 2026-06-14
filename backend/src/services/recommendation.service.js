/**
 * Servicio orquestador de recomendaciones y chat SIRA.
 * Combina el motor de reglas con Groq para generar respuestas híbridas.
 *
 * Contexto de entrada esperado:
 *   studentContext = {
 *     profile:     { name, moodleUserId, role },
 *     courses:     [{ id, fullname, shortname, progress }],
 *     grades:      [{ courseId, courseName, items: [{ name, percentage }] }], // opcional
 *     chatHistory: [{ role, content }],
 *   }
 */

const { generateRecommendations, isExerciseRequest, getExerciseRedirectResponse } = require('./rules.service');
const { buildSystemPrompt, buildTeacherSystemPrompt, retrieveContext } = require('./rag.service');
const { sendToGroq, isGroqAvailable } = require('./groq.service');
const { Recommendation } = require('../models');

/**
 * Procesa un mensaje de chat y genera la respuesta de SIRA.
 * Soporta rol 'student' y 'teacher' — cada uno usa un prompt distinto.
 *
 * @param {string} userMessage
 * @param {Object} studentContext - { profile, courses, grades, chatHistory }
 * @returns {{ response: string, source: string }}
 */
const processChat = async (userMessage, studentContext) => {
  const { profile } = studentContext;

  // Restricción pedagógica: no resolver ejercicios directamente (solo para estudiantes)
  if (profile.role === 'student' && isExerciseRequest(userMessage)) {
    return { response: getExerciseRedirectResponse(), source: 'rules' };
  }

  // Seleccionar prompt según el rol del usuario
  const systemPrompt = profile.role === 'teacher'
    ? buildTeacherSystemPrompt(studentContext)
    : buildSystemPrompt(studentContext);

  if (isGroqAvailable()) {
    const ragContext = profile.role === 'student'
      ? retrieveContext(userMessage, studentContext.courses || [])
      : '';

    const enrichedPrompt = ragContext
      ? `${systemPrompt}\n\nCONTEXTO ADICIONAL RELEVANTE:\n${ragContext}`
      : systemPrompt;

    const aiResponse = await sendToGroq(
      enrichedPrompt,
      studentContext.chatHistory || [],
      userMessage
    );

    if (aiResponse) return { response: aiResponse, source: 'groq' };
  }

  // Fallback: motor de reglas
  return generateRulesBasedChatResponse(userMessage, studentContext);
};

/**
 * Genera respuesta de chat por reglas cuando Groq no está disponible.
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

  // Respuesta genérica sin Groq
  return {
    response: `Entiendo tu consulta sobre **"${message}"**.\n\nActualmente estoy operando en modo básico. Puedo orientarte sobre:\n• Estrategias de estudio para tus cursos actuales\n• Recursos y materiales de apoyo por materia\n• Tu progreso y calificaciones en Moodle\n\n¿Sobre cuál de estos temas quieres orientación? 📚`,
    source: 'rules',
  };
};

/**
 * Genera y persiste recomendaciones para un estudiante Moodle.
 * @param {number} moodleUserId
 * @param {Object} studentContext - { profile, courses, grades }
 * @returns {Array}
 */
const generateAndSaveRecommendations = async (moodleUserId, studentContext) => {
  const rawRecommendations = generateRecommendations(studentContext);

  const toCreate = rawRecommendations.map(rec => ({
    moodleUserId,
    type: rec.type,
    title: rec.title,
    description: rec.description,
    moodleCourseId:   rec.moodleCourseId   || null,
    moodleCourseName: rec.moodleCourseName || null,
    source: rec.source || 'rules',
    metadata: rec.metadata || {},
  }));

  return Recommendation.bulkCreate(toCreate);
};

module.exports = { processChat, generateAndSaveRecommendations };
