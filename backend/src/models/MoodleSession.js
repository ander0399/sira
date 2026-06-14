/**
 * Modelo MoodleSession — registra los usuarios de Moodle que acceden a SIRA.
 * La autenticación de estudiantes y docentes es delegada a Moodle vía SSO.
 * Este modelo almacena su info básica y el token activo para llamadas REST.
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MoodleSession = sequelize.define('MoodleSession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // ID del usuario dentro de Moodle (único por instancia Moodle)
  moodleUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
  moodleUsername: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  fullName: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  // Rol dentro de SIRA, determinado por Moodle al autenticar
  role: {
    type: DataTypes.ENUM('student', 'teacher'),
    allowNull: false,
  },
  // Token Moodle activo (para llamadas REST posteriores)
  moodleToken: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  lastLogin: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'moodle_sessions',
  timestamps: true,
});

module.exports = MoodleSession;
