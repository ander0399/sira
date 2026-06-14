/**
 * Middleware de autenticación JWT para SIRA.
 * Soporta dos tipos de token: 'admin' (credenciales propias) y 'moodle' (SSO).
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Verifica el JWT en el header Authorization y añade req.user al request.
 * - Admin: req.user = { type:'admin', id, email, role:'admin' }
 * - Moodle: req.user = { type:'moodle', moodleUserId, role:'student'|'teacher', fullName, email }
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token de acceso requerido.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token inválido o expirado.' });
  }
};

/**
 * Permite acceso solo a Admin SIRA.
 * Debe usarse después de verifyToken.
 */
const requireAdmin = (req, res, next) => {
  if (req.user.type !== 'admin' || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso restringido: se requiere rol de administrador.' });
  }
  next();
};

/**
 * Permite acceso solo a usuarios autenticados vía Moodle (estudiantes o docentes).
 * Debe usarse después de verifyToken.
 */
const requireMoodleUser = (req, res, next) => {
  if (req.user.type !== 'moodle') {
    return res.status(403).json({ message: 'Acceso restringido: se requiere autenticación Moodle.' });
  }
  next();
};

/**
 * Permite acceso solo a docentes autenticados vía Moodle.
 * Debe usarse después de verifyToken.
 */
const requireTeacher = (req, res, next) => {
  if (req.user.type !== 'moodle' || req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Acceso restringido: se requiere rol de docente.' });
  }
  next();
};

module.exports = { verifyToken, requireAdmin, requireMoodleUser, requireTeacher };
