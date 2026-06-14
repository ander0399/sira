/**
 * Modelo User — representa únicamente a los administradores del sistema SIRA.
 * Estudiantes y docentes se autentican vía Moodle SSO (ver MoodleSession).
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('admin'),
    defaultValue: 'admin',
  },
}, {
  tableName: 'users',
  timestamps: true,
});

module.exports = User;
