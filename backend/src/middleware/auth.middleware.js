/**
 * Middleware de autenticación JWT.
 * Verifica el token en el header Authorization antes de permitir acceso a rutas protegidas.
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Verifica que el request incluya un JWT válido.
 * Añade req.user con { id, email, role } para los controllers siguientes.
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // formato: "Bearer <token>"

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
 * Verifica que el usuario autenticado tenga rol de administrador.
 * Se usa después de verifyToken.
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso restringido: se requiere rol de administrador.' });
  }
  next();
};

module.exports = { verifyToken, requireAdmin };
