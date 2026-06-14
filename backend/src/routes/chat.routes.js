/**
 * Rutas del chatbot ChatSIRA.
 * Todas requieren autenticación JWT.
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { sendMessage, getChatHistory, getChatSessions } = require('../controllers/chat.controller');
const { verifyToken, requireMoodleUser } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(verifyToken, requireMoodleUser);

// POST /api/chat/message   → enviar mensaje a ChatSIRA
router.post('/message', [
  body('message').notEmpty().trim().withMessage('El mensaje no puede estar vacío.'),
  body('sessionId').optional().isUUID().withMessage('SessionId inválido.'),
  validate,
], sendMessage);

// GET /api/chat/history    → historial de mensajes
router.get('/history', getChatHistory);

// GET /api/chat/sessions   → sesiones de chat del usuario
router.get('/sessions', getChatSessions);

module.exports = router;
