/**
 * Controller de chat: maneja los mensajes con ChatSIRA.
 * Enriquece el contexto del estudiante/docente con datos en vivo de Moodle
 * (cursos, calificaciones) antes de llamar al motor de recomendaciones.
 */

const { v4: uuidv4 } = require('uuid');
const { ChatMessage } = require('../models');
const { processChat } = require('../services/recommendation.service');
const { isGroqAvailable } = require('../services/groq.service');
const moodleService = require('../services/moodle.service');

/**
 * POST /api/chat/message
 * Recibe un mensaje y retorna la respuesta de SIRA con contexto Moodle enriquecido.
 */
const sendMessage = async (req, res) => {
  try {
    const { message, sessionId, courseId } = req.body;
    const { moodleUserId, fullName, role } = req.user;
    const moodleToken = req.headers['x-moodle-token'];

    const activeSessionId = sessionId || uuidv4();

    // Historial de la sesión actual (máx 10 mensajes)
    const chatHistory = await ChatMessage.findAll({
      where: { moodleUserId, sessionId: activeSessionId },
      order: [['createdAt', 'ASC']],
      limit: 10,
    });

    // Enriquecer contexto con cursos Moodle si el token está disponible
    let courses = [];
    let grades  = [];

    let enrolledStudents = [];

    if (moodleToken) {
      try {
        courses = await moodleService.getUserCourses(moodleUserId, moodleToken);
        courses = Array.isArray(courses) ? courses : [];

        // Prioridad: curso desde el que se abrió el plugin; fallback: primer curso con bajo progreso
        const targetCourseId = courseId ? parseInt(courseId) : null;
        const targetCourse   = targetCourseId
          ? courses.find(c => c.id === targetCourseId)
          : courses.find(c => c.progress !== null && c.progress < 40);

        if (targetCourse) {
          const gradesRaw = await moodleService.getUserGrades(targetCourse.id, moodleUserId, moodleToken);
          grades = moodleService.normalizeGrades(gradesRaw, targetCourse.id, targetCourse.fullname);

          // Para docentes: obtener lista de estudiantes inscritos en el curso activo
          if (role === 'teacher') {
            try {
              const rawEnrolled = await moodleService.getEnrolledUsers(targetCourse.id, moodleToken);
              enrolledStudents = (Array.isArray(rawEnrolled) ? rawEnrolled : [])
                .filter(u => u.roles?.some(r => r.shortname === 'student'))
                .map(u => ({
                  id: u.id,
                  name: u.fullname,
                  email: u.email || null,
                  lastAccess: u.lastaccess
                    ? new Date(u.lastaccess * 1000).toLocaleDateString('es-CO')
                    : null,
                }))
                .slice(0, 40);
            } catch (e) {
              console.warn('No se pudo obtener estudiantes inscritos:', e.message);
            }
          }
        }
      } catch (moodleError) {
        // No bloquear el chat si Moodle no responde
        console.warn('No se pudo enriquecer contexto desde Moodle:', moodleError.message);
      }
    }

    const studentContext = {
      profile: { name: fullName, moodleUserId, role },
      courses,
      grades,
      activeCourseId: courseId ? parseInt(courseId) : null,
      enrolledStudents,
      chatHistory: chatHistory.map(m => ({ role: m.role, content: m.content })),
    };

    // Guardar mensaje del usuario
    await ChatMessage.create({
      moodleUserId,
      role: 'user',
      content: message,
      sessionId: activeSessionId,
    });

    const { response, source } = await processChat(message, studentContext);

    // Guardar respuesta de SIRA
    await ChatMessage.create({
      moodleUserId,
      role: 'assistant',
      content: response,
      sessionId: activeSessionId,
      source,
    });

    res.json({
      message: response,
      sessionId: activeSessionId,
      source,
      aiAvailable: isGroqAvailable(),
    });
  } catch (error) {
    console.error('Error en sendMessage:', error.message);
    res.status(500).json({ message: 'Error al procesar el mensaje.' });
  }
};

/**
 * GET /api/chat/history
 * Retorna el historial de conversaciones del usuario.
 */
const getChatHistory = async (req, res) => {
  try {
    const { sessionId, limit = 50 } = req.query;
    const where = { moodleUserId: req.user.moodleUserId };
    if (sessionId) where.sessionId = sessionId;

    const messages = await ChatMessage.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
    });

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Error en getChatHistory:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/**
 * GET /api/chat/sessions
 * Retorna las sesiones de chat distintas del usuario.
 */
const getChatSessions = async (req, res) => {
  try {
    const sessions = await ChatMessage.findAll({
      where: { moodleUserId: req.user.moodleUserId, role: 'user' },
      attributes: ['sessionId', 'createdAt'],
      group: ['sessionId', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    res.json({ sessions });
  } catch (error) {
    console.error('Error en getChatSessions:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

module.exports = { sendMessage, getChatHistory, getChatSessions };
