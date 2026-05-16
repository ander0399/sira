/**
 * Controller de recomendaciones: genera, lista y marca como leídas
 * las recomendaciones académicas del estudiante.
 */

const { Recommendation, StudentProfile, StudentSubject, Subject } = require('../models');
const { generateAndSaveRecommendations } = require('../services/recommendation.service');

/**
 * GET /api/recommendations
 * Retorna las recomendaciones activas del estudiante autenticado.
 */
const getRecommendations = async (req, res) => {
  try {
    const recommendations = await Recommendation.findAll({
      where: { userId: req.user.id },
      include: [{ association: 'subject', attributes: ['name', 'code'] }],
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
 * Genera nuevas recomendaciones para el estudiante basadas en su perfil actual.
 */
const generateRecommendations = async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({
      where: { userId: req.user.id },
      include: [{ association: 'subjects', include: [{ association: 'subject' }] }],
    });

    if (!profile) {
      return res.status(404).json({ message: 'Perfil académico no encontrado.' });
    }

    const recommendations = await generateAndSaveRecommendations(
      req.user.id,
      profile,
      profile.subjects || []
    );

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
      where: { id: req.params.id, userId: req.user.id },
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
