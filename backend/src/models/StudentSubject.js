/**
 * Modelo StudentSubject — historial académico del estudiante por materia.
 * Registra la nota y el estado de cada materia cursada o en curso.
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StudentSubject = sequelize.define('StudentSubject', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  studentProfileId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'student_profiles', key: 'id' },
  },
  subjectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'subjects', key: 'id' },
  },
  // Nota obtenida (null si la materia está en curso)
  grade: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    validate: { min: 0.0, max: 5.0 },
  },
  // Estado de la materia para el estudiante
  status: {
    type: DataTypes.ENUM('en_curso', 'aprobada', 'reprobada', 'pendiente'),
    defaultValue: 'pendiente',
  },
  // Semestre en que la cursó (para historial multi-semestre)
  semesterTaken: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Número de veces que ha intentado cursar la materia
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
}, {
  tableName: 'student_subjects',
  timestamps: true,
});

module.exports = StudentSubject;
