/**
 * Punto central de modelos: importa todos los modelos y define las relaciones
 * (asociaciones) entre ellos para que Sequelize construya los JOINs correctamente.
 */

const sequelize = require('../config/database');

const User            = require('./User');
const StudentProfile  = require('./StudentProfile');
const Subject         = require('./Subject');
const StudentSubject  = require('./StudentSubject');
const ChatMessage     = require('./ChatMessage');
const Recommendation  = require('./Recommendation');
const Feedback        = require('./Feedback');

// Un usuario tiene un perfil académico
User.hasOne(StudentProfile, { foreignKey: 'userId', as: 'profile' });
StudentProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Un perfil tiene muchas relaciones con materias (historial)
StudentProfile.hasMany(StudentSubject, { foreignKey: 'studentProfileId', as: 'subjects' });
StudentSubject.belongsTo(StudentProfile, { foreignKey: 'studentProfileId', as: 'profile' });

// Una materia puede estar en muchos historiales de estudiantes
Subject.hasMany(StudentSubject, { foreignKey: 'subjectId', as: 'studentRecords' });
StudentSubject.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });

// Un usuario tiene muchos mensajes de chat
User.hasMany(ChatMessage, { foreignKey: 'userId', as: 'messages' });
ChatMessage.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Un usuario tiene muchas recomendaciones
User.hasMany(Recommendation, { foreignKey: 'userId', as: 'recommendations' });
Recommendation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Una recomendación puede estar asociada a una materia
Subject.hasMany(Recommendation, { foreignKey: 'subjectId', as: 'recommendations' });
Recommendation.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });

// Un usuario da feedback sobre recomendaciones
User.hasMany(Feedback, { foreignKey: 'userId', as: 'feedbacks' });
Feedback.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Recommendation.hasOne(Feedback, { foreignKey: 'recommendationId', as: 'feedback' });
Feedback.belongsTo(Recommendation, { foreignKey: 'recommendationId', as: 'recommendation' });

module.exports = {
  sequelize,
  User,
  StudentProfile,
  Subject,
  StudentSubject,
  ChatMessage,
  Recommendation,
  Feedback,
};
