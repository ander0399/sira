/**
 * Modelo Recommendation — recomendaciones académicas generadas para el estudiante.
 * Pueden venir del motor de reglas, de Groq o de una combinación (hybrid).
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Recommendation = sequelize.define('Recommendation', {
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
  // Tipo de recomendación generada
  type: {
    type: DataTypes.ENUM('recurso', 'estrategia', 'ruta', 'alerta', 'refuerzo'),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  // Materia relacionada (nullable: puede ser una recomendación general)
  subjectId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'subjects', key: 'id' },
  },
  // Qué generó la recomendación
  source: {
    type: DataTypes.ENUM('rules', 'groq', 'hybrid'),
    defaultValue: 'rules',
  },
  // Datos adicionales en JSON (ej: links, pasos, ejemplos)
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  // Si el estudiante ya vio la recomendación
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'recommendations',
  timestamps: true,
});

module.exports = Recommendation;
