/**
 * Controller de perfil estudiantil: maneja el perfil académico,
 * el historial de materias y la actualización de datos del estudiante.
 */

const { StudentProfile, StudentSubject, Subject, User } = require('../models');

/**
 * GET /api/student/profile
 * Retorna el perfil académico completo del estudiante autenticado.
 */
const getProfile = async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({
      where: { userId: req.user.id },
      include: [
        {
          association: 'subjects',
          include: [{ association: 'subject' }],
        },
      ],
    });

    if (!profile) {
      return res.status(404).json({ message: 'Perfil académico no encontrado.' });
    }

    res.json({ profile });
  } catch (error) {
    console.error('Error en getProfile:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/**
 * PUT /api/student/profile
 * Actualiza el perfil académico del estudiante (semestre, estilo de aprendizaje, etc.).
 */
const updateProfile = async (req, res) => {
  try {
    const { currentSemester, gpa, learningStyle, studentCode } = req.body;

    const profile = await StudentProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) {
      return res.status(404).json({ message: 'Perfil no encontrado.' });
    }

    await profile.update({
      currentSemester: currentSemester ?? profile.currentSemester,
      gpa: gpa ?? profile.gpa,
      learningStyle: learningStyle ?? profile.learningStyle,
      studentCode: studentCode ?? profile.studentCode,
    });

    res.json({ message: 'Perfil actualizado.', profile });
  } catch (error) {
    console.error('Error en updateProfile:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/**
 * GET /api/student/subjects
 * Retorna el historial de materias del estudiante autenticado.
 */
const getSubjects = async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ message: 'Perfil no encontrado.' });

    const subjects = await StudentSubject.findAll({
      where: { studentProfileId: profile.id },
      include: [{ association: 'subject' }],
      order: [['semesterTaken', 'ASC']],
    });

    res.json({ subjects });
  } catch (error) {
    console.error('Error en getSubjects:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/**
 * POST /api/student/subjects
 * Registra una materia en el historial del estudiante (en curso, aprobada, reprobada).
 */
const addSubject = async (req, res) => {
  try {
    const { subjectId, grade, status, semesterTaken, attempts } = req.body;

    const profile = await StudentProfile.findOne({ where: { userId: req.user.id } });
    if (!profile) return res.status(404).json({ message: 'Perfil no encontrado.' });

    const subject = await Subject.findByPk(subjectId);
    if (!subject) return res.status(404).json({ message: 'Materia no encontrada.' });

    // Verificar si ya está registrada
    const existing = await StudentSubject.findOne({
      where: { studentProfileId: profile.id, subjectId },
    });

    if (existing) {
      await existing.update({ grade, status, semesterTaken, attempts: attempts ?? existing.attempts });
      return res.json({ message: 'Registro de materia actualizado.', studentSubject: existing });
    }

    const studentSubject = await StudentSubject.create({
      studentProfileId: profile.id,
      subjectId,
      grade: grade ?? null,
      status: status || 'en_curso',
      semesterTaken: semesterTaken ?? profile.currentSemester,
      attempts: attempts || 1,
    });

    res.status(201).json({ message: 'Materia registrada.', studentSubject });
  } catch (error) {
    console.error('Error en addSubject:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/**
 * GET /api/student/subjects/catalog
 * Retorna el catálogo completo de materias del plan de estudios IS-UFPS.
 */
const getSubjectCatalog = async (req, res) => {
  try {
    const subjects = await Subject.findAll({ order: [['semester', 'ASC'], ['name', 'ASC']] });
    res.json({ subjects });
  } catch (error) {
    console.error('Error en getSubjectCatalog:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

module.exports = { getProfile, updateProfile, getSubjects, addSubject, getSubjectCatalog };
