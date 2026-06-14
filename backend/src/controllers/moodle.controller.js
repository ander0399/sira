/**
 * Controller Moodle: expone datos académicos del estudiante/docente
 * consultando directamente la REST API de Moodle con el token del usuario.
 */

const moodleService = require('../services/moodle.service');

/**
 * Extrae el token Moodle del header x-moodle-token.
 * El frontend lo envía junto al JWT SIRA para cada llamada que requiera datos en vivo.
 */
const getMoodleToken = (req) => req.headers['x-moodle-token'];

/**
 * GET /api/moodle/courses
 * Retorna los cursos en que está inscrito el usuario autenticado.
 */
const getCourses = async (req, res) => {
  try {
    const token = getMoodleToken(req);
    if (!token) {
      return res.status(400).json({ message: 'Se requiere el token Moodle en el header x-moodle-token.' });
    }

    const courses = await moodleService.getUserCourses(req.user.moodleUserId, token);
    res.json({ courses });
  } catch (error) {
    console.error('Error en getCourses:', error.message);
    res.status(500).json({ message: 'Error al obtener cursos de Moodle.' });
  }
};

/**
 * GET /api/moodle/grades/:courseId
 * Retorna las calificaciones del usuario en un curso específico.
 */
const getGrades = async (req, res) => {
  try {
    const token = getMoodleToken(req);
    if (!token) {
      return res.status(400).json({ message: 'Se requiere el token Moodle en el header x-moodle-token.' });
    }

    const grades = await moodleService.getUserGrades(
      parseInt(req.params.courseId),
      req.user.moodleUserId,
      token
    );
    res.json({ grades });
  } catch (error) {
    console.error('Error en getGrades:', error.message);
    res.status(500).json({ message: 'Error al obtener calificaciones de Moodle.' });
  }
};

/**
 * GET /api/moodle/courses/:courseId/contents
 * Retorna los contenidos (temas, recursos) de un curso.
 */
const getCourseContents = async (req, res) => {
  try {
    const token = getMoodleToken(req);
    if (!token) {
      return res.status(400).json({ message: 'Se requiere el token Moodle en el header x-moodle-token.' });
    }

    const contents = await moodleService.getCourseContents(parseInt(req.params.courseId), token);
    res.json({ contents });
  } catch (error) {
    console.error('Error en getCourseContents:', error.message);
    res.status(500).json({ message: 'Error al obtener contenidos del curso.' });
  }
};

module.exports = { getCourses, getGrades, getCourseContents };
