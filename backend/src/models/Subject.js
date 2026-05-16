/**
 * Modelo Subject — catálogo de asignaturas del plan de estudios de IS-UFPS.
 * Incluye las 4 materias críticas del área de programación y sus relaciones.
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subject = sequelize.define('Subject', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // Código único de la materia (ej: 'FUND_PROG', 'POO', 'ESTR_DATOS', 'BD')
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  // Semestre sugerido del plan de estudios
  semester: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 10 },
  },
  credits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
  },
  // Área académica para agrupar materias relacionadas
  area: {
    type: DataTypes.ENUM('programacion', 'matematicas', 'sistemas', 'redes', 'gestion', 'humanidades'),
    defaultValue: 'programacion',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // IDs de las materias que son prerrequisito (JSON array)
  prerequisites: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  // Nota mínima aprobatoria en escala colombiana
  passingGrade: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 3.0,
  },
  // Si es una materia de alto riesgo (alta tasa de reprobación histórica)
  isHighRisk: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'subjects',
  timestamps: true,
});

module.exports = Subject;
