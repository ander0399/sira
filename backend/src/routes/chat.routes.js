/**
 * Rutas del chatbot ChatSIRA.
 * Todas requieren autenticación JWT.
 */

const express = require('express');
const { body } = require('express-validator');
const multer  = require('multer');
const router  = express.Router();

const { sendMessage, getChatHistory, getChatSessions } = require('../controllers/chat.controller');
const { verifyToken, requireMoodleUser } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB máximo
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Solo se permiten imágenes (JPG, PNG, GIF, WebP).'));
  },
});

router.use(verifyToken, requireMoodleUser);

// POST /api/chat/message   → enviar mensaje a ChatSIRA (imagen opcional)
router.post('/message', upload.single('image'), [
  body('message').notEmpty().trim().withMessage('El mensaje no puede estar vacío.'),
  body('sessionId').optional({ nullable: true }).isUUID().withMessage('SessionId inválido.'),
  validate,
], sendMessage);

// GET /api/chat/history    → historial de mensajes
router.get('/history', getChatHistory);

// GET /api/chat/sessions   → sesiones de chat del usuario
router.get('/sessions', getChatSessions);

module.exports = router;
