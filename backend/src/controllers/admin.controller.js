const { MoodleSession, ChatMessage, Recommendation, User } = require('../models');
const { Op } = require('sequelize');
const sequelize         = require('../config/database');
const bcrypt            = require('bcryptjs');
const { isGeminiAvailable, sendToGemini } = require('../services/gemini.service');
const { buildAdminSystemPrompt } = require('../services/rag.service');

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
  } catch (error) {
    console.error('Error en getStats:', error.message);
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
  } catch (error) {
    console.error('Error en getUsers:', error.message);
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
  } catch (error) {
    console.error('Error en getTeachersReport:', error.message);
    res.status(500).json({ message: 'Error al generar reporte de docentes.' });
  }
};

const getSystemHealth = async (req, res) => {
  let dbStatus = 'ok';
  try { await sequelize.authenticate(); } catch { dbStatus = 'error'; }

  const geminiStatus = isGeminiAvailable() ? 'ok' : 'unavailable';

  const moodleUrl = process.env.MOODLE_URL;
  let moodleStatus = 'unconfigured';
  if (moodleUrl) {
    try {
      const ctrl = new AbortController();
      const tid  = setTimeout(() => ctrl.abort(), 4000);
      const r    = await fetch(`${moodleUrl}/login/index.php`, { signal: ctrl.signal });
      clearTimeout(tid);
      moodleStatus = r.status < 500 ? 'ok' : 'error';
    } catch {
      moodleStatus = 'unreachable';
    }
  }

  res.json({
    timestamp: new Date().toISOString(),
    services: {
      database: { status: dbStatus },
      gemini:   { status: geminiStatus },
      moodle:   { status: moodleStatus, url: moodleUrl || null },
    },
  });
};

const getAdmins = async (req, res) => {
  try {
    const admins = await User.findAll({
      attributes: ['id', 'name', 'email', 'createdAt'],
      order: [['createdAt', 'ASC']],
    });
    res.json({ admins });
  } catch (error) {
    console.error('Error en getAdmins:', error.message);
    res.status(500).json({ message: 'Error al obtener administradores.' });
  }
};

const createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nombre, correo y contraseña son requeridos.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Ya existe un administrador con ese correo.' });
    }
    const hashed = await bcrypt.hash(password, 12);
    const admin  = await User.create({ name, email, password: hashed });
    res.status(201).json({
      message: 'Administrador creado.',
      admin: { id: admin.id, name: admin.name, email: admin.email, createdAt: admin.createdAt },
    });
  } catch (error) {
    console.error('Error en createAdmin:', error.message);
    res.status(500).json({ message: 'Error al crear administrador.' });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta.' });
    }
    const admin = await User.findByPk(id);
    if (!admin) {
      return res.status(404).json({ message: 'Administrador no encontrado.' });
    }
    await admin.destroy();
    res.json({ message: 'Administrador eliminado.' });
  } catch (error) {
    console.error('Error en deleteAdmin:', error.message);
    res.status(500).json({ message: 'Error al eliminar administrador.' });
  }
};

const sendAdminMessage = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ message: 'El mensaje es requerido.' });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Stats del sistema y análisis de temas en paralelo
    const [
      totalStudents, totalTeachers, totalMessages, totalRecommendations, activeUsers,
      recentUserMessages, recsByTypeRaw,
    ] = await Promise.all([
      MoodleSession.count({ where: { role: 'student' } }),
      MoodleSession.count({ where: { role: 'teacher' } }),
      ChatMessage.count(),
      Recommendation.count(),
      MoodleSession.count({ where: { lastLogin: { [Op.gte]: sevenDaysAgo } } }),
      ChatMessage.findAll({
        where: { role: 'user' },
        order: [['createdAt', 'DESC']],
        limit: 200,
        attributes: ['content'],
      }),
      Recommendation.findAll({
        attributes: ['type', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['type'],
        raw: true,
      }),
    ]);

    // Conteo de temas por presencia de palabras clave en mensajes de estudiantes
    const keywordMap = {
      'Fundamentos de Programación': ['programacion', 'algoritmo', 'variable', 'ciclo', 'funcion', 'python', 'fundamentos'],
      'POO': ['objeto', 'clase', 'herencia', 'polimorfismo', 'encapsulamiento', 'java', 'poo'],
      'Estructuras de Datos': ['arbol', 'lista', 'pila', 'cola', 'grafo', 'hash', 'estructura', 'complejidad'],
      'Bases de Datos': ['sql', 'base de datos', 'tabla', 'join', 'consulta', 'normalizacion', 'postgresql'],
    };
    const topTopics = Object.fromEntries(Object.keys(keywordMap).map(k => [k, 0]));
    recentUserMessages.forEach(({ content }) => {
      const norm = content.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      Object.entries(keywordMap).forEach(([topic, kws]) => {
        if (kws.some(kw => norm.includes(kw))) topTopics[topic]++;
      });
    });

    const adminContext = {
      stats: { totalStudents, totalTeachers, totalMessages, totalRecommendations, activeUsers },
      topTopics,
      recsByType: recsByTypeRaw.map(r => ({ type: r.type, count: parseInt(r.count) })),
    };

    const systemPrompt = buildAdminSystemPrompt(adminContext);

    let response, source;

    if (isGeminiAvailable()) {
      const aiResponse = await sendToGemini(systemPrompt, history, message, { maxTokens: 1200 });
      if (aiResponse) { response = aiResponse; source = 'gemini'; }
    }

    if (!response) {
      const { totalStudents: ts, totalTeachers: tt, totalMessages: tm, activeUsers: au } = adminContext.stats;
      response = `**SIRA Analytics** — Modo básico (Gemini no disponible).\n\nEstado del sistema:\n- Estudiantes: ${ts} · Docentes: ${tt}\n- Mensajes en chat: ${tm} · Activos (7d): ${au}\n\nPara análisis avanzados configura \`GEMINI_API_KEY\` en las variables de entorno.`;
      source = 'rules';
    }

    res.json({ message: response, source });
  } catch (error) {
    console.error('Error en sendAdminMessage:', error.message);
    res.status(500).json({ message: 'Error al procesar el mensaje.' });
  }
};

module.exports = { getStats, getUsers, getTeachersReport, getSystemHealth, getAdmins, createAdmin, deleteAdmin, sendAdminMessage };
