/**
 * Modelo StudentProfile — perfil académico del estudiante.
 * Almacena semestre actual, promedio acumulado y estilo de aprendizaje declarado.
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StudentProfile = sequelize.define('StudentProfile', {
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
  // Semestre que está cursando actualmente (1 al 10)
  currentSemester: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: { min: 1, max: 10 },
  },
  // Promedio acumulado (0.0 a 5.0, escala colombiana)
  gpa: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.0,
    validate: { min: 0.0, max: 5.0 },
  },
  // Estilo de aprendizaje declarado por el estudiante
  learningStyle: {
    type: DataTypes.ENUM('visual', 'auditivo', 'kinestesico', 'lectura'),
    defaultValue: 'visual',
  },
  // Código del estudiante en la UFPS (opcional)
  studentCode: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
}, {
  tableName: 'student_profiles',
  timestamps: true,
});

module.exports = StudentProfile;
