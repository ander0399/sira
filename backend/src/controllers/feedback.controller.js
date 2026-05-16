/**
 * Controller de feedback: permite al estudiante calificar las recomendaciones recibidas.
 */

const { Feedback, Recommendation } = require('../models');

/**
 * POST /api/feedback
 * Registra la calificación del estudiante sobre una recomendación.
 */
const submitFeedback = async (req, res) => {
  try {
    const { recommendationId, rating, comment } = req.body;

    const recommendation = await Recommendation.findOne({
      where: { id: recommendationId, userId: req.user.id },
    });

    if (!recommendation) {
      return res.status(404).json({ message: 'Recomendación no encontrada.' });
    }

    // Verificar si ya existe feedback para esta recomendación
    const existing = await Feedback.findOne({
      where: { userId: req.user.id, recommendationId },
    });

    if (existing) {
      await existing.update({ rating, comment, wasHelpful: rating >= 4 });
      return res.json({ message: 'Feedback actualizado.', feedback: existing });
    }

    const feedback = await Feedback.create({
      userId: req.user.id,
      recommendationId,
      rating,
      comment: comment || null,
      wasHelpful: rating >= 4,
    });

    res.status(201).json({ message: 'Feedback registrado. ¡Gracias!', feedback });
  } catch (error) {
    console.error('Error en submitFeedback:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/**
 * GET /api/feedback/summary
 * Retorna un resumen del feedback del estudiante (para el reporte básico).
 */
const getFeedbackSummary = async (req, res) => {
  try {
    const feedbacks = await Feedback.findAll({
      where: { userId: req.user.id },
      include: [{ association: 'recommendation', attributes: ['title', 'type'] }],
    });

    const total = feedbacks.length;
    const avgRating = total > 0
      ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / total).toFixed(2)
      : 0;
    const helpful = feedbacks.filter(f => f.wasHelpful).length;

    res.json({ summary: { total, avgRating, helpful, feedbacks } });
  } catch (error) {
    console.error('Error en getFeedbackSummary:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

module.exports = { submitFeedback, getFeedbackSummary };
