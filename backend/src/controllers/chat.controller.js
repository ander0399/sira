/**
 * Controller de chat: maneja los mensajes del estudiante con ChatSIRA,
 * persiste la conversación y orquesta la respuesta (reglas o Groq).
 */

const { v4: uuidv4 } = require('uuid');
const { ChatMessage, StudentProfile, StudentSubject, User } = require('../models');
const { processChat } = require('../services/recommendation.service');
const { isGroqAvailable } = require('../services/groq.service');

/**
 * POST /api/chat/message
 * Recibe un mensaje del estudiante y retorna la respuesta de SIRA.
 */
const sendMessage = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const userId = req.user.id;

    // Usar sessionId existente o crear uno nuevo para la conversación
    const activeSessionId = sessionId || uuidv4();

    // Obtener historial de la sesión actual (máx 10 mensajes para contexto)
    const chatHistory = await ChatMessage.findAll({
      where: { userId, sessionId: activeSessionId },
      order: [['createdAt', 'ASC']],
      limit: 10,
    });

    // Obtener perfil y materias del estudiante para personalizar la respuesta
    const user = await User.findByPk(userId, { attributes: ['name'] });
    const profile = await StudentProfile.findOne({
      where: { userId },
      include: [{ association: 'subjects', include: [{ association: 'subject' }] }],
    });

    const studentContext = {
      profile: {
        name: user?.name,
        currentSemester: profile?.currentSemester || 1,
        gpa: profile?.gpa || 0,
        learningStyle: profile?.learningStyle || 'visual',
      },
      subjects: profile?.subjects || [],
      chatHistory: chatHistory.map(m => ({ role: m.role, content: m.content })),
    };

    // Guardar el mensaje del usuario en la BD
    await ChatMessage.create({
      userId,
      role: 'user',
      content: message,
      sessionId: activeSessionId,
    });

    // Procesar y generar respuesta (reglas o Groq)
    const { response, source } = await processChat(message, studentContext);

    // Guardar la respuesta de SIRA en la BD
    await ChatMessage.create({
      userId,
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
 * Retorna el historial de conversaciones del estudiante.
 */
const getChatHistory = async (req, res) => {
  try {
    const { sessionId, limit = 50 } = req.query;
    const where = { userId: req.user.id };
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
 * Retorna las sesiones de chat distintas del usuario (para el historial).
 */
const getChatSessions = async (req, res) => {
  try {
    const sessions = await ChatMessage.findAll({
      where: { userId: req.user.id, role: 'user' },
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
