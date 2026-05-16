/**
 * Middleware de validación: comprueba los errores generados por express-validator
 * y retorna 400 con la lista de errores si los hay.
 */

const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Datos inválidos en la solicitud.',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

module.exports = { validate };
