/**
 * Rutas para consumo de datos Moodle en tiempo real.
 * Todas requieren autenticación Moodle (token SIRA + token Moodle en header).
 */

const express = require('express');
const router = express.Router();

const { getCourses, getGrades, getCourseContents } = require('../controllers/moodle.controller');
const { verifyToken, requireMoodleUser } = require('../middleware/auth.middleware');

// Todas las rutas requieren JWT SIRA válido con tipo 'moodle'
router.use(verifyToken, requireMoodleUser);

// GET /api/moodle/courses — cursos del usuario autenticado
router.get('/courses', getCourses);

// GET /api/moodle/grades/:courseId — calificaciones en un curso
router.get('/grades/:courseId', getGrades);

// GET /api/moodle/courses/:courseId/contents — contenidos del curso
router.get('/courses/:courseId/contents', getCourseContents);

module.exports = router;
