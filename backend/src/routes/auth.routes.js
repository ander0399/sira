/**
 * Rutas de autenticación SIRA.
 * - POST /moodle      → login SSO para estudiantes y docentes
 * - POST /admin/login → login con email+contraseña para Admin SIRA
 * - GET  /me          → perfil del usuario autenticado
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { moodleLogin, adminLogin, getMe } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

// POST /api/auth/moodle — autenticación vía token Moodle (estudiantes/docentes)
router.post('/moodle', [
  body('moodleToken').notEmpty().withMessage('El token de Moodle es requerido.'),
  validate,
], moodleLogin);

// POST /api/auth/admin/login — autenticación Admin SIRA
router.post('/admin/login', [
  body('email').isEmail().withMessage('Correo inválido.'),
  body('password').notEmpty().withMessage('La contraseña es requerida.'),
  validate,
], adminLogin);

// GET /api/auth/me — perfil del usuario autenticado
router.get('/me', verifyToken, getMe);

module.exports = router;
