/**
 * Controller del Dashboard Docente SIRA.
 * El docente accede con token Moodle (rol 'teacher') y consulta:
 *   - Resumen de sus cursos y estadísticas SIRA
 *   - Estudiantes inscritos por curso con datos de progreso
 *   - Estudiantes en riesgo (progreso bajo)
 *   - Recomendaciones generadas para un estudiante específico
 *
 * Todas las rutas requieren verifyToken + requireTeacher.
 * El header x-moodle-token es necesario para llamadas a Moodle en vivo.
 */

const { Recommendation, Feedback, MoodleSession } = require('../models');
const { Op } = require('sequelize');
const moodleService = require('../services/moodle.service');

const getMoodleToken = (req) => req.headers['x-moodle-token'];

/**
 * Filtra usuarios Moodle con rol de estudiante del array devuelto por getEnrolledUsers.
 * Moodle devuelve todos los roles inscritos; nos quedamos solo con estudiantes.
 */
const filterStudents = (enrolledUsers) =>
  enrolledUsers.filter(u =>
    u.roles && u.roles.some(r => r.shortname === 'student')
  );

/**
 * GET /api/teacher/dashboard
 * Resumen general del docente: cursos en Moodle + estadísticas globales de SIRA.
 */
const getDashboardStats = async (req, res) => {
  try {
    const token = getMoodleToken(req);
    if (!token) {
      return res.status(400).json({ message: 'Se requiere el token Moodle en el header x-moodle-token.' });
    }

    // Cursos del docente desde Moodle
    const courses = await moodleService.getUserCourses(req.user.moodleUserId, token);
    const courseIds = (courses || []).map(c => c.id);

    // Estadísticas de SIRA: recomendaciones y feedback generados para estudiantes
    // que han accedido a SIRA y tienen sesiones registradas
    const totalRecommendations = await Recommendation.count();
    const totalFeedback        = await Feedback.count();
    const totalSiraStudents    = await MoodleSession.count({ where: { role: 'student' } });

    // Cursos con bajo progreso promedio (progress < 40 en los cursos del docente)
    const atRiskCount = (courses || []).filter(c =>
      c.progress !== null && c.progress !== undefined && c.progress < 40
    ).length;

    res.json({
      stats: {
        totalCourses:        courseIds.length,
        atRiskCourses:       atRiskCount,
        totalRecommendations,
        totalFeedback,
        totalSiraStudents,
      },
      courses: (courses || []).map(c => ({
        id:        c.id,
        fullname:  c.fullname,
        shortname: c.shortname,
        progress:  c.progress ?? null,
      })),
    });
  } catch (error) {
    console.error('Error en getDashboardStats:', error.message);
    res.status(500).json({ message: 'Error al obtener estadísticas del dashboard.' });
  }
};

/**
 * GET /api/teacher/courses/:courseId/students
 * Lista de estudiantes inscritos en un curso con datos de progreso y actividad SIRA.
 */
const getCourseStudents = async (req, res) => {
  try {
    const token = getMoodleToken(req);
    if (!token) {
      return res.status(400).json({ message: 'Se requiere el token Moodle en el header x-moodle-token.' });
    }

    const courseId = parseInt(req.params.courseId);

    // Estudiantes del curso desde Moodle
    const enrolled = await moodleService.getEnrolledUsers(courseId, token);
    const students = filterStudents(enrolled || []);

    // IDs de estudiantes que tienen sesión en SIRA
    const studentIds = students.map(s => s.id);
    const siraStudents = await MoodleSession.findAll({
      where: { moodleUserId: { [Op.in]: studentIds } },
      attributes: ['moodleUserId'],
    });
    const siraStudentSet = new Set(siraStudents.map(s => s.moodleUserId));

    // Contar recomendaciones por estudiante en SIRA
    const recCounts = await Recommendation.findAll({
      where: { moodleUserId: { [Op.in]: studentIds } },
      attributes: ['moodleUserId'],
    });
    const recCountMap = recCounts.reduce((acc, r) => {
      acc[r.moodleUserId] = (acc[r.moodleUserId] || 0) + 1;
      return acc;
    }, {});

    const result = students.map(s => ({
      moodleUserId:      s.id,
      fullname:          s.fullname,
      email:             s.email || null,
      progressPercent:   s.progresspercent ?? null,
      lastCourseAccess:  s.lastcourseaccess ? new Date(s.lastcourseaccess * 1000).toISOString() : null,
      usingSira:         siraStudentSet.has(s.id),
      recommendationsCount: recCountMap[s.id] || 0,
    }));

    res.json({ courseId, students: result, total: result.length });
  } catch (error) {
    console.error('Error en getCourseStudents:', error.message);
    res.status(500).json({ message: 'Error al obtener estudiantes del curso.' });
  }
};

/**
 * GET /api/teacher/courses/:courseId/at-risk
 * Estudiantes en riesgo en un curso: progreso < 40% o sin acceso en más de 7 días.
 */
const getAtRiskStudents = async (req, res) => {
  try {
    const token = getMoodleToken(req);
    if (!token) {
      return res.status(400).json({ message: 'Se requiere el token Moodle en el header x-moodle-token.' });
    }

    const courseId = parseInt(req.params.courseId);
    const enrolled = await moodleService.getEnrolledUsers(courseId, token);
    const students = filterStudents(enrolled || []);

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const atRisk = students.filter(s => {
      const lowProgress = s.progresspercent !== null && s.progresspercent !== undefined && s.progresspercent < 40;
      const inactiveRecently = s.lastcourseaccess && (s.lastcourseaccess * 1000) < sevenDaysAgo;
      return lowProgress || inactiveRecently;
    }).map(s => ({
      moodleUserId:     s.id,
      fullname:         s.fullname,
      email:            s.email || null,
      progressPercent:  s.progresspercent ?? null,
      lastCourseAccess: s.lastcourseaccess ? new Date(s.lastcourseaccess * 1000).toISOString() : null,
      riskReason:       getRiskReason(s, sevenDaysAgo),
    }));

    res.json({ courseId, atRiskStudents: atRisk, total: atRisk.length });
  } catch (error) {
    console.error('Error en getAtRiskStudents:', error.message);
    res.status(500).json({ message: 'Error al obtener estudiantes en riesgo.' });
  }
};

/**
 * Determina la razón de riesgo de un estudiante.
 */
const getRiskReason = (student, sevenDaysAgo) => {
  const reasons = [];
  if (student.progresspercent !== null && student.progresspercent !== undefined && student.progresspercent < 40) {
    reasons.push(`Progreso bajo (${student.progresspercent}%)`);
  }
  if (student.lastcourseaccess && (student.lastcourseaccess * 1000) < sevenDaysAgo) {
    reasons.push('Sin acceso en más de 7 días');
  }
  return reasons.join(' | ') || 'Sin datos suficientes';
};

/**
 * GET /api/teacher/students/:moodleUserId/recommendations
 * Recomendaciones SIRA generadas para un estudiante específico.
 * El docente puede ver este historial para orientar al estudiante.
 */
const getStudentRecommendations = async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.moodleUserId);

    const recommendations = await Recommendation.findAll({
      where: { moodleUserId: targetUserId },
      include: [{ association: 'feedback', attributes: ['rating', 'wasHelpful', 'comment'] }],
      order: [['createdAt', 'DESC']],
    });

    // Buscar info básica del estudiante en SIRA (si ha accedido)
    const session = await MoodleSession.findOne({
      where: { moodleUserId: targetUserId },
      attributes: ['fullName', 'email', 'role', 'lastLogin'],
    });

    res.json({
      student: session
        ? { moodleUserId: targetUserId, fullName: session.fullName, email: session.email, lastLogin: session.lastLogin }
        : { moodleUserId: targetUserId, fullName: 'Estudiante sin sesión SIRA', email: null },
      recommendations,
      total: recommendations.length,
    });
  } catch (error) {
    console.error('Error en getStudentRecommendations:', error.message);
    res.status(500).json({ message: 'Error al obtener recomendaciones del estudiante.' });
  }
};

/**
 * GET /api/teacher/students/:moodleUserId/feedback-summary
 * Resumen del feedback dado por un estudiante sobre sus recomendaciones.
 */
const getStudentFeedbackSummary = async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.moodleUserId);

    const feedbacks = await Feedback.findAll({
      where: { moodleUserId: targetUserId },
      include: [{ association: 'recommendation', attributes: ['title', 'type', 'moodleCourseName'] }],
    });

    const total     = feedbacks.length;
    const avgRating = total > 0
      ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / total).toFixed(2)
      : 0;
    const helpful = feedbacks.filter(f => f.wasHelpful).length;

    res.json({ summary: { moodleUserId: targetUserId, total, avgRating, helpful }, feedbacks });
  } catch (error) {
    console.error('Error en getStudentFeedbackSummary:', error.message);
    res.status(500).json({ message: 'Error al obtener resumen de feedback.' });
  }
};

module.exports = {
  getDashboardStats,
  getCourseStudents,
  getAtRiskStudents,
  getStudentRecommendations,
  getStudentFeedbackSummary,
};
