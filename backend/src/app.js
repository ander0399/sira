/**
 * Configuración principal de Express.
 * Registra middlewares globales y monta todas las rutas de la API.
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ── Middlewares globales ──────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rutas de la API ───────────────────────────────────────────────────────────
app.use('/api/auth',            require('./routes/auth.routes'));
app.use('/api/moodle',          require('./routes/moodle.routes'));
app.use('/api/teacher',         require('./routes/teacher.routes'));
app.use('/api/chat',            require('./routes/chat.routes'));
app.use('/api/recommendations', require('./routes/recommendation.routes'));
app.use('/api/feedback',        require('./routes/feedback.routes'));
app.use('/api/admin',           require('./routes/admin.routes'));

// ── Ruta de health check ──────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'SIRA - Sistema Inteligente de Recomendación Académica',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Manejo de rutas no encontradas ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Ruta ${req.method} ${req.path} no encontrada.` });
});

// ── Manejo global de errores ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.message);
  res.status(500).json({ message: 'Error interno del servidor.' });
});

module.exports = app;
