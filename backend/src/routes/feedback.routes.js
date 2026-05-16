/**
 * Rutas de feedback: calificación de recomendaciones por el estudiante.
 * Todas requieren autenticación JWT.
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { submitFeedback, getFeedbackSummary } = require('../controllers/feedback.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(verifyToken);

// POST /api/feedback         → enviar calificación de una recomendación
router.post('/', [
  body('recommendationId').isInt().withMessage('ID de recomendación inválido.'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('La calificación debe ser entre 1 y 5.'),
  body('comment').optional().isString(),
  validate,
], submitFeedback);

// GET /api/feedback/summary  → resumen del feedback del estudiante
router.get('/summary', getFeedbackSummary);

module.exports = router;
