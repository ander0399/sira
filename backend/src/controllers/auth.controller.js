/**
 * Controller de autenticación SIRA.
 * - moodleLogin: valida token Moodle y emite JWT SIRA para estudiantes/docentes.
 * - adminLogin: autenticación email+contraseña solo para Admin SIRA.
 * - getMe: retorna el usuario autenticado según tipo de token.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, MoodleSession } = require('../models');
const moodleService = require('../services/moodle.service');
require('dotenv').config();

/**
 * POST /api/auth/moodle
 * Recibe { moodleToken, role } del plugin Moodle.
 * Valida el token contra la instancia Moodle y emite un JWT SIRA.
 */
const moodleLogin = async (req, res) => {
  try {
    const { moodleToken, role } = req.body;

    if (!moodleToken) {
      return res.status(400).json({ message: 'El token de Moodle es requerido.' });
    }

    const moodleRole = role === 'teacher' ? 'teacher' : 'student';

    // Verifica el token con la API REST de Moodle
    const siteInfo = await moodleService.getSiteInfo(moodleToken);
    if (!siteInfo || !siteInfo.userid) {
      return res.status(401).json({ message: 'Token de Moodle inválido o expirado.' });
    }

    // Actualiza o crea la sesión local del usuario Moodle
    const [session] = await MoodleSession.upsert({
      moodleUserId: siteInfo.userid,
      moodleUsername: siteInfo.username,
      fullName: siteInfo.fullname,
      email: siteInfo.useremail || null,
      role: moodleRole,
      moodleToken,
      lastLogin: new Date(),
    }, { returning: true });

    const token = jwt.sign(
      {
        type: 'moodle',
        moodleUserId: siteInfo.userid,
        role: moodleRole,
        fullName: siteInfo.fullname,
        email: siteInfo.useremail || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Autenticación Moodle exitosa.',
      token,
      user: {
        moodleUserId: siteInfo.userid,
        fullName: siteInfo.fullname,
        role: moodleRole,
      },
    });
  } catch (error) {
    console.error('Error en moodleLogin:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/**
 * POST /api/auth/admin/login
 * Autenticación exclusiva para Admin SIRA con email y contraseña.
 */
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const token = jwt.sign(
      { type: 'admin', id: user.id, email: user.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login exitoso.',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: 'admin' },
    });
  } catch (error) {
    console.error('Error en adminLogin:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/**
 * GET /api/auth/me
 * Retorna la información del usuario autenticado (admin o Moodle).
 */
const getMe = async (req, res) => {
  try {
    if (req.user.type === 'admin') {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] },
      });
      if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
      return res.json({ user: { ...user.toJSON(), type: 'admin' } });
    }

    // Usuario Moodle
    const session = await MoodleSession.findOne({
      where: { moodleUserId: req.user.moodleUserId },
    });
    if (!session) return res.status(404).json({ message: 'Sesión Moodle no encontrada.' });

    res.json({
      user: {
        moodleUserId: session.moodleUserId,
        fullName: session.fullName,
        email: session.email,
        role: session.role,
        type: 'moodle',
      },
    });
  } catch (error) {
    console.error('Error en getMe:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

module.exports = { moodleLogin, adminLogin, getMe };
