/**
 * Punto central de modelos: importa todos los modelos y define las relaciones
 * entre ellos. Los usuarios Moodle (estudiantes/docentes) se vinculan por
 * moodleUserId (entero externo), no por FK a la tabla users.
 */

const sequelize = require('../config/database');

const User           = require('./User');
const MoodleSession  = require('./MoodleSession');
const ChatMessage    = require('./ChatMessage');
const Recommendation = require('./Recommendation');
const Feedback       = require('./Feedback');

// Una sesión Moodle tiene muchos mensajes de chat (por moodleUserId)
MoodleSession.hasMany(ChatMessage, { foreignKey: 'moodleUserId', sourceKey: 'moodleUserId', as: 'messages' });
ChatMessage.belongsTo(MoodleSession, { foreignKey: 'moodleUserId', targetKey: 'moodleUserId', as: 'session' });

// Una sesión Moodle tiene muchas recomendaciones
MoodleSession.hasMany(Recommendation, { foreignKey: 'moodleUserId', sourceKey: 'moodleUserId', as: 'recommendations' });
Recommendation.belongsTo(MoodleSession, { foreignKey: 'moodleUserId', targetKey: 'moodleUserId', as: 'session' });

// Una sesión Moodle da feedback sobre recomendaciones
MoodleSession.hasMany(Feedback, { foreignKey: 'moodleUserId', sourceKey: 'moodleUserId', as: 'feedbacks' });
Feedback.belongsTo(MoodleSession, { foreignKey: 'moodleUserId', targetKey: 'moodleUserId', as: 'session' });

// Una recomendación puede recibir un feedback
Recommendation.hasOne(Feedback, { foreignKey: 'recommendationId', as: 'feedback' });
Feedback.belongsTo(Recommendation, { foreignKey: 'recommendationId', as: 'recommendation' });

module.exports = {
  sequelize,
  User,
  MoodleSession,
  ChatMessage,
  Recommendation,
  Feedback,
};
