/**
 * Controller de autenticación: registro, login y obtención del perfil propio.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, StudentProfile } = require('../models');
require('dotenv').config();

/**
 * POST /api/auth/register
 * Crea un nuevo usuario estudiante y su perfil académico inicial.
 */
const register = async (req, res) => {
  try {
    const { name, email, password, currentSemester, learningStyle, studentCode } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'El correo ya está registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, password: hashedPassword, role: 'student' });

    await StudentProfile.create({
      userId: user.id,
      currentSemester: currentSemester || 1,
      gpa: 0.0,
      learningStyle: learningStyle || 'visual',
      studentCode: studentCode || null,
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente.',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Error en registro:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/**
 * POST /api/auth/login
 * Autentica al usuario y retorna un JWT.
 */
const login = async (req, res) => {
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
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login exitoso.',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Error en login:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/**
 * GET /api/auth/me
 * Retorna la información del usuario autenticado con su perfil académico.
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [{ association: 'profile' }],
    });

    if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

    res.json({ user });
  } catch (error) {
    console.error('Error en getMe:', error.message);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

module.exports = { register, login, getMe };
