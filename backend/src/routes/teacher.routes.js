/**
 * Rutas del Dashboard Docente SIRA.
 * Todas requieren autenticación Moodle con rol 'teacher'.
 *
 * GET /api/teacher/dashboard                                → resumen general
 * GET /api/teacher/courses/:courseId/students              → estudiantes del curso
 * GET /api/teacher/courses/:courseId/at-risk               → estudiantes en riesgo
 * GET /api/teacher/students/:moodleUserId/recommendations  → recomendaciones de un estudiante
 * GET /api/teacher/students/:moodleUserId/feedback-summary → feedback de un estudiante
 */

const express = require('express');
const router = express.Router();

const {
  getDashboardStats,
  getCourseStudents,
  getAtRiskStudents,
  getStudentRecommendations,
  getStudentFeedbackSummary,
} = require('../controllers/teacher.controller');

const { verifyToken, requireTeacher } = require('../middleware/auth.middleware');

// Todas las rutas requieren JWT SIRA válido con tipo 'moodle' y rol 'teacher'
router.use(verifyToken, requireTeacher);

router.get('/dashboard',                                getDashboardStats);
router.get('/courses/:courseId/students',               getCourseStudents);
router.get('/courses/:courseId/at-risk',                getAtRiskStudents);
router.get('/students/:moodleUserId/recommendations',   getStudentRecommendations);
router.get('/students/:moodleUserId/feedback-summary',  getStudentFeedbackSummary);

module.exports = router;
