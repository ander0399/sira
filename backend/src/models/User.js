/**
 * Modelo User — representa a los usuarios del sistema (estudiantes y administradores).
 * La contraseña se almacena hasheada con bcrypt.
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
  // 'student' para estudiantes de IS-UFPS, 'admin' para administradores
  role: {
    type: DataTypes.ENUM('student', 'admin'),
    defaultValue: 'student',
  },
}, {
  tableName: 'users',
  timestamps: true,
});

module.exports = User;
