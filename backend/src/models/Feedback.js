/**
 * Modelo Feedback — calificación y comentario del estudiante sobre una recomendación.
 * Permite al sistema aprender qué recomendaciones son útiles.
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Feedback = sequelize.define('Feedback', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  recommendationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'recommendations', key: 'id' },
  },
  // Calificación de 1 a 5 estrellas
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 },
  },
  // Comentario opcional del estudiante
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Si la recomendación fue útil (simplificación del rating para análisis)
  wasHelpful: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
}, {
  tableName: 'feedback',
  timestamps: true,
});

module.exports = Feedback;
