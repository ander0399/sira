/**
 * Punto de entrada del servidor SIRA.
 * Conecta a PostgreSQL mediante Sequelize y levanta Express en el puerto configurado.
 */

require('dotenv').config();
const app = require('./src/app');
const { sequelize } = require('./src/models');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verificar conexión a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida.');

    // Sincronizar modelos sin forzar (no borra datos en reinicios)
    await sequelize.sync({ alter: false });

    app.listen(PORT, () => {
      console.log(`🚀 SIRA Backend corriendo en http://localhost:${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📖 Modo: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
}

startServer();
