/**
 * Modelo Recommendation — recomendaciones académicas generadas para el estudiante.
 * Vinculada al usuario de Moodle mediante moodleUserId (no FK interna).
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Recommendation = sequelize.define('Recommendation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // ID del usuario en Moodle — vinculación externa, sin FK a tabla interna
  moodleUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
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
  // Curso de Moodle relacionado (nullable: puede ser recomendación general)
  moodleCourseId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  moodleCourseName: {
    type: DataTypes.STRING(300),
    allowNull: true,
  },
  source: {
    type: DataTypes.ENUM('rules', 'groq', 'hybrid'),
    defaultValue: 'rules',
  },
  // Datos adicionales en JSON (links, pasos, ejemplos)
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'recommendations',
  timestamps: true,
});

module.exports = Recommendation;
