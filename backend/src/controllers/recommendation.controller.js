/**
 * Controller de recomendaciones: genera, lista y marca como leídas
 * las recomendaciones académicas del estudiante.
 * Los datos académicos se obtienen de Moodle, no de la BD interna.
 */

const { Recommendation } = require('../models');
const { generateAndSaveRecommendations } = require('../services/recommendation.service');
const moodleService = require('../services/moodle.service');

/**
 * GET /api/recommendations
 * Retorna las recomendaciones activas del estudiante autenticado.
 */
const getRecommendations = async (req, res) => {
  try {
    const recommendations = await Recommendation.findAll({
      where: { moodleUserId: req.user.moodleUserId },
      include: [{ association: 'feedback', attributes: ['rating', 'wasHelpful', 'comment'] }],
      order: [['createdAt', 'DESC']],
    });

    res.json({ recommendations });
  } catch (error) {
    console.error('Error en getRecommendations:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/**
 * POST /api/recommendations/generate
 * Genera nuevas recomendaciones consultando el perfil académico del estudiante en Moodle.
 */
const generateRecommendations = async (req, res) => {
  try {
    const { moodleUserId, fullName } = req.user;
    const moodleToken = req.headers['x-moodle-token'];

    if (!moodleToken) {
      return res.status(400).json({ message: 'Se requiere el token Moodle en el header x-moodle-token.' });
    }

    // Obtener cursos del estudiante desde Moodle
    const courses = await moodleService.getUserCourses(moodleUserId, moodleToken);

    const studentContext = {
      moodleUserId,
      fullName,
      courses: courses || [],
    };

    const recommendations = await generateAndSaveRecommendations(moodleUserId, studentContext);

    res.status(201).json({
      message: `${recommendations.length} recomendaciones generadas.`,
      recommendations,
    });
  } catch (error) {
    console.error('Error en generateRecommendations:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/**
 * PATCH /api/recommendations/:id/read
 * Marca una recomendación como leída.
 */
const markAsRead = async (req, res) => {
  try {
    const recommendation = await Recommendation.findOne({
      where: { id: req.params.id, moodleUserId: req.user.moodleUserId },
    });

    if (!recommendation) {
      return res.status(404).json({ message: 'Recomendación no encontrada.' });
    }

    await recommendation.update({ isRead: true });
    res.json({ message: 'Recomendación marcada como leída.' });
  } catch (error) {
    console.error('Error en markAsRead:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

module.exports = { getRecommendations, generateRecommendations, markAsRead };
