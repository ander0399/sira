/**
 * Servicio orquestador de recomendaciones.
 * Combina el motor de reglas con Groq (si está disponible)
 * para generar recomendaciones híbridas o solo basadas en reglas.
 */

const { generateRecommendations, isExerciseRequest, getExerciseRedirectResponse } = require('./rules.service');
const { buildSystemPrompt, retrieveContext } = require('./rag.service');
const { sendToGroq, isGroqAvailable } = require('./groq.service');
const { Recommendation } = require('../models');

/**
 * Procesa un mensaje del chatbot y genera la respuesta de SIRA.
 * @param {string} userMessage     - Mensaje del estudiante
 * @param {Object} studentContext  - { profile, subjects, chatHistory }
 * @returns {{ response: string, source: string }}
 */
const processChat = async (userMessage, studentContext) => {
  // Restricción pedagógica: detectar peticiones de resolución directa de ejercicios
  if (isExerciseRequest(userMessage)) {
    return {
      response: getExerciseRedirectResponse(),
      source: 'rules',
    };
  }

  // Construir el sistema RAG con el perfil del estudiante
  const systemPrompt = buildSystemPrompt(studentContext);

  // Si Groq está disponible, usar el LLM para responder
  if (isGroqAvailable()) {
    const activeSubjectCodes = studentContext.subjects
      .filter(s => s.status === 'en_curso' && s.subject?.code)
      .map(s => s.subject.code);

    // Recuperar contexto relevante del knowledge base para enriquecer la respuesta
    const ragContext = retrieveContext(userMessage, activeSubjectCodes);
    const enrichedPrompt = ragContext
      ? `${systemPrompt}\n\nCONTEXTO ADICIONAL RELEVANTE:\n${ragContext}`
      : systemPrompt;

    const aiResponse = await sendToGroq(
      enrichedPrompt,
      studentContext.chatHistory || [],
      userMessage
    );

    if (aiResponse) {
      return { response: aiResponse, source: 'groq' };
    }
  }

  // Fallback: respuesta del motor de reglas cuando Groq no está disponible
  return generateRulesBasedChatResponse(userMessage, studentContext);
};

/**
 * Genera una respuesta de chat basada únicamente en el motor de reglas.
 * Se activa cuando Groq no está disponible.
 * @param {string} message - Mensaje del estudiante
 * @param {Object} context - Contexto del estudiante
 * @returns {{ response: string, source: string }}
 */
const generateRulesBasedChatResponse = (message, context) => {
  const { profile, subjects } = context;
  const msgLower = message.toLowerCase();

  // Saludos
  if (['hola', 'hi', 'buenos', 'buenas', 'hey'].some(w => msgLower.includes(w))) {
    return {
      response: `¡Hola! 👋 Soy **SIRA**, tu asistente académico de Ingeniería de Sistemas - UFPS.\n\nEstoy aquí para ayudarte con orientación sobre tus materias de programación. Actualmente estás en semestre **${profile.currentSemester}** con un promedio de **${profile.gpa}**.\n\n¿En qué puedo orientarte hoy?`,
      source: 'rules',
    };
  }

  // Consulta sobre promedio
  if (msgLower.includes('promedio') || msgLower.includes('notas')) {
    const status = profile.gpa >= 3.5 ? 'excelente' : profile.gpa >= 3.0 ? 'aprobatorio' : 'que necesita mejorar';
    return {
      response: `Tu promedio acumulado es **${profile.gpa}**, lo que es ${status}. ${profile.gpa < 3.2 ? 'Te recomiendo revisar tus estrategias de estudio. ¿Quieres que te sugiera algunas?' : '¡Sigue así! ¿Hay alguna materia en la que quieras enfocarte más?'}`,
      source: 'rules',
    };
  }

  // Respuesta genérica cuando no hay Groq
  return {
    response: `Entiendo tu consulta sobre **"${message}"**. \n\nActualmente estoy operando en modo básico (sin IA avanzada). Puedo orientarte sobre:\n• Estrategias de estudio para tus materias\n• Recursos y materiales de apoyo\n• Tu perfil académico y recomendaciones\n\n¿Sobre cuál de estos temas quieres que te oriente? 📚`,
    source: 'rules',
  };
};

/**
 * Genera y persiste recomendaciones académicas para un estudiante.
 * @param {number} userId   - ID del usuario
 * @param {Object} profile  - Perfil académico del estudiante
 * @param {Array}  subjects - Historial de materias
 * @returns {Array} Recomendaciones creadas
 */
const generateAndSaveRecommendations = async (userId, profile, subjects) => {
  const rawRecommendations = generateRecommendations(profile, subjects);

  // Buscar el subjectId si la recomendación tiene subjectCode
  const { Subject } = require('../models');
  const allSubjects = await Subject.findAll();
  const subjectMap = Object.fromEntries(allSubjects.map(s => [s.code, s.id]));

  const toCreate = rawRecommendations.map(rec => ({
    userId,
    type: rec.type,
    title: rec.title,
    description: rec.description,
    subjectId: rec.subjectCode ? (subjectMap[rec.subjectCode] || null) : null,
    source: rec.source || 'rules',
    metadata: rec.metadata || {},
  }));

  const created = await Recommendation.bulkCreate(toCreate);
  return created;
};

module.exports = { processChat, generateAndSaveRecommendations };
