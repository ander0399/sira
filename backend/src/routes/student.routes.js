/**
 * Rutas del perfil estudiantil: perfil académico y historial de materias.
 * Todas requieren autenticación JWT.
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { getProfile, updateProfile, getSubjects, addSubject, getSubjectCatalog } = require('../controllers/student.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(verifyToken); // todas las rutas de student requieren auth

// GET  /api/student/profile
router.get('/profile', getProfile);

// PUT  /api/student/profile
router.put('/profile', [
  body('currentSemester').optional().isInt({ min: 1, max: 10 }).withMessage('Semestre inválido.'),
  body('gpa').optional().isFloat({ min: 0, max: 5 }).withMessage('Promedio inválido.'),
  body('learningStyle').optional().isIn(['visual', 'auditivo', 'kinestesico', 'lectura']),
  validate,
], updateProfile);

// GET  /api/student/subjects          → historial del estudiante
router.get('/subjects', getSubjects);

// GET  /api/student/subjects/catalog  → catálogo completo IS-UFPS
router.get('/subjects/catalog', getSubjectCatalog);

// POST /api/student/subjects          → registrar/actualizar materia en historial
router.post('/subjects', [
  body('subjectId').isInt().withMessage('ID de materia inválido.'),
  body('status').isIn(['en_curso', 'aprobada', 'reprobada', 'pendiente']).withMessage('Estado inválido.'),
  body('grade').optional().isFloat({ min: 0, max: 5 }).withMessage('Nota inválida.'),
  validate,
], addSubject);

module.exports = router;
