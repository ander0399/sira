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
 * Normaliza la respuesta de gradereport_user_get_grades_table al formato interno:
 * [{ courseId, courseName, items: [{ name, percentage }] }]
 */
const normalizeGrades = (gradesResponse, courseId, courseName) => {
  try {
    const table = gradesResponse?.tables?.[0];
    if (!table) return [];

    const items = (table.tabledata || [])
      .filter(row => row.itemname && row.grade)
      .map(row => {
        const rawGrade = row.grade?.content || '';
        // Formato típico Moodle: "75,00 / 100,00" o "75.00 / 100.00"
        const parts = rawGrade.replace(',', '.').split('/').map(s => parseFloat(s.trim()));
        const gradeVal = parts[0] || null;
        const maxVal   = parts[1] || 100;
        const percentage = (gradeVal !== null && maxVal > 0)
          ? Math.round((gradeVal / maxVal) * 100)
          : null;
        return {
          name: row.itemname?.content?.replace(/<[^>]+>/g, '').trim() || 'Actividad',
          percentage,
        };
      })
      .filter(i => i.percentage !== null);

    return [{ courseId, courseName, items }];
  } catch {
    return [];
  }
};

/**
 * POST /api/chat/message
 * Recibe un mensaje y retorna la respuesta de SIRA con contexto Moodle enriquecido.
 */
const sendMessage = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
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

    if (moodleToken) {
      try {
        courses = await moodleService.getUserCourses(moodleUserId, moodleToken);
        courses = Array.isArray(courses) ? courses : [];

        // Obtener calificaciones del primer curso con bajo progreso (si existe)
        const lowCourse = courses.find(c => c.progress !== null && c.progress < 40);
        if (lowCourse) {
          const gradesRaw = await moodleService.getUserGrades(lowCourse.id, moodleUserId, moodleToken);
          grades = normalizeGrades(gradesRaw, lowCourse.id, lowCourse.fullname);
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
