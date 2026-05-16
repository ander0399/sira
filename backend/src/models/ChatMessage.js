/**
 * Modelo ChatMessage — historial de conversaciones del estudiante con ChatSIRA.
 * Cada mensaje pertenece a una sesión identificada por sessionId.
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChatMessage = sequelize.define('ChatMessage', {
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
  // 'user' para mensajes del estudiante, 'assistant' para respuestas de SIRA
  role: {
    type: DataTypes.ENUM('user', 'assistant'),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  // UUID que agrupa los mensajes de una sesión de chat continua
  sessionId: {
    type: DataTypes.STRING(36),
    allowNull: false,
  },
  // Fuente de la respuesta: motor de reglas, Groq, o combinación
  source: {
    type: DataTypes.ENUM('rules', 'groq', 'hybrid'),
    allowNull: true,
  },
}, {
  tableName: 'chat_messages',
  timestamps: true,
});

module.exports = ChatMessage;
