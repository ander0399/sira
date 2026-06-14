/**
 * Rutas de recomendaciones académicas.
 * Todas requieren autenticación JWT.
 */

const express = require('express');
const router = express.Router();

const { getRecommendations, generateRecommendations, markAsRead } = require('../controllers/recommendation.controller');
const { verifyToken, requireMoodleUser } = require('../middleware/auth.middleware');

router.use(verifyToken, requireMoodleUser);

// GET  /api/recommendations           → listar recomendaciones del estudiante
router.get('/', getRecommendations);

// POST /api/recommendations/generate  → generar nuevas recomendaciones
router.post('/generate', generateRecommendations);

// PATCH /api/recommendations/:id/read → marcar como leída
router.patch('/:id/read', markAsRead);

module.exports = router;
