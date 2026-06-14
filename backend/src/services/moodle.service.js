/**
 * Servicio de integración con la API REST de Moodle.
 * Todas las llamadas usan el token del usuario (no el token de administrador)
 * excepto cuando se requiere acceso a datos globales de la instancia.
 */

const axios = require('axios');
require('dotenv').config();

const MOODLE_URL = process.env.MOODLE_URL;
const REST_ENDPOINT = `${MOODLE_URL}/webservice/rest/server.php`;

/**
 * Realiza una llamada a la REST API de Moodle.
 * @param {string} wsfunction - Nombre de la función Moodle a invocar.
 * @param {object} params - Parámetros adicionales de la función.
 * @param {string} token - Token del usuario o del servicio.
 * @returns {Promise<object>} - Respuesta JSON de Moodle.
 */
const callMoodle = async (wsfunction, params = {}, token) => {
  const response = await axios.get(REST_ENDPOINT, {
    params: {
      wstoken: token,
      wsfunction,
      moodlewsrestformat: 'json',
      ...params,
    },
    timeout: 10000,
  });

  // Moodle retorna { exception, errorcode, message } en caso de error
  if (response.data && response.data.exception) {
    throw new Error(`Moodle error [${response.data.errorcode}]: ${response.data.message}`);
  }

  return response.data;
};

/**
 * Obtiene información del sitio y del usuario autenticado.
 * Equivale a core_webservice_get_site_info.
 * @param {string} token - Token Moodle del usuario.
 */
const getSiteInfo = async (token) => {
  return callMoodle('core_webservice_get_site_info', {}, token);
};

/**
 * Obtiene los cursos en que está inscrito el usuario.
 * @param {number} moodleUserId - ID del usuario en Moodle.
 * @param {string} token - Token Moodle del usuario.
 */
const getUserCourses = async (moodleUserId, token) => {
  return callMoodle('core_enrol_get_users_courses', { userid: moodleUserId }, token);
};

/**
 * Obtiene las calificaciones de un usuario en un curso.
 * @param {number} courseId - ID del curso en Moodle.
 * @param {number} moodleUserId - ID del usuario en Moodle.
 * @param {string} token - Token Moodle del usuario.
 */
const getUserGrades = async (courseId, moodleUserId, token) => {
  return callMoodle('gradereport_user_get_grades_table', {
    courseid: courseId,
    userid: moodleUserId,
  }, token);
};

/**
 * Obtiene los contenidos (temas, recursos, actividades) de un curso.
 * @param {number} courseId - ID del curso en Moodle.
 * @param {string} token - Token Moodle del usuario.
 */
const getCourseContents = async (courseId, token) => {
  return callMoodle('core_course_get_contents', { courseid: courseId }, token);
};

/**
 * Obtiene las entregas de tareas de un estudiante en un curso.
 * @param {number[]} assignmentIds - Lista de IDs de asignaciones.
 * @param {string} token - Token Moodle del usuario o admin.
 */
const getAssignmentSubmissions = async (assignmentIds, token) => {
  const params = {};
  assignmentIds.forEach((id, index) => {
    params[`assignmentids[${index}]`] = id;
  });
  return callMoodle('mod_assign_get_submissions', params, token);
};

/**
 * Obtiene la lista de usuarios inscritos en un curso.
 * Usado por docentes para ver sus estudiantes.
 * Devuelve array con { id, fullname, email, roles, lastcourseaccess, progresspercent }.
 * @param {number} courseId - ID del curso en Moodle.
 * @param {string} token - Token Moodle del docente.
 */
const getEnrolledUsers = async (courseId, token) => {
  return callMoodle('core_enrol_get_enrolled_users', { courseid: courseId }, token);
};

module.exports = {
  getSiteInfo,
  getUserCourses,
  getUserGrades,
  getCourseContents,
  getAssignmentSubmissions,
  getEnrolledUsers,
};
