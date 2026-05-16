/**
 * Rutas de autenticación: registro, login y perfil propio.
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { register, login, getMe } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

// POST /api/auth/register
router.post('/register', [
  body('name').notEmpty().withMessage('El nombre es requerido.'),
  body('email').isEmail().withMessage('Correo inválido.'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.'),
  body('currentSemester').optional().isInt({ min: 1, max: 10 }).withMessage('Semestre inválido.'),
  validate,
], register);

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().withMessage('Correo inválido.'),
  body('password').notEmpty().withMessage('La contraseña es requerida.'),
  validate,
], login);

// GET /api/auth/me  (ruta protegida)
router.get('/me', verifyToken, getMe);

module.exports = router;
