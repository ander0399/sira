const { MoodleSession, ChatMessage, Recommendation } = require('../models');
const { Op } = require('sequelize');

const getStats = async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalStudents, totalTeachers, totalMessages, totalRecommendations, activeUsers] =
      await Promise.all([
        MoodleSession.count({ where: { role: 'student' } }),
        MoodleSession.count({ where: { role: 'teacher' } }),
        ChatMessage.count(),
        Recommendation.count(),
        MoodleSession.count({ where: { lastLogin: { [Op.gte]: sevenDaysAgo } } }),
      ]);

    res.json({ totalStudents, totalTeachers, totalMessages, totalRecommendations, activeUsers });
  } catch {
    res.status(500).json({ message: 'Error al obtener estadísticas.' });
  }
};

const getUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 15, search = '' } = req.query;
    const where = {};

    if (role) where.role = role;
    if (search) {
      where[Op.or] = [
        { fullName:  { [Op.iLike]: `%${search}%` } },
        { email:     { [Op.iLike]: `%${search}%` } },
        { moodleUsername: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await MoodleSession.findAndCountAll({
      where,
      order: [['lastLogin', 'DESC']],
      limit:  parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      attributes: ['id', 'moodleUserId', 'fullName', 'email', 'role', 'lastLogin', 'createdAt'],
    });

    res.json({ total: count, page: parseInt(page), users: rows });
  } catch {
    res.status(500).json({ message: 'Error al obtener usuarios.' });
  }
};

const getTeachersReport = async (req, res) => {
  try {
    const teachers = await MoodleSession.findAll({
      where: { role: 'teacher' },
      attributes: ['moodleUserId', 'fullName', 'email', 'lastLogin', 'createdAt'],
      order: [['lastLogin', 'DESC']],
    });

    const report = await Promise.all(
      teachers.map(async (t) => {
        const chatMessages = await ChatMessage.count({ where: { moodleUserId: t.moodleUserId } });
        return {
          moodleUserId: t.moodleUserId,
          fullName:     t.fullName,
          email:        t.email,
          lastLogin:    t.lastLogin,
          joinedAt:     t.createdAt,
          chatMessages,
        };
      })
    );

    res.json({ teachers: report });
  } catch {
    res.status(500).json({ message: 'Error al generar reporte de docentes.' });
  }
};

module.exports = { getStats, getUsers, getTeachersReport };
