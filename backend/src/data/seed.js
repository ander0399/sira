/**
 * Script de seed: sincroniza los modelos e inserta el Admin SIRA inicial.
 * Estudiantes y docentes se autentican vía Moodle; no se crean en este seed.
 * Ejecutar con: npm run seed
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models');

async function seed() {
  try {
    console.log('Sincronizando modelos con la base de datos...');

    // force: true elimina y recrea las tablas — solo para desarrollo inicial
    await sequelize.sync({ force: true });
    console.log('Tablas creadas correctamente.');

    // ── Crear usuario administrador SIRA ──────────────────────────────────
    const adminPassword = await bcrypt.hash('admin2026', 10);
    const admin = await User.create({
      name: 'Administrador SIRA',
      email: 'admin@sira.ufps.edu.co',
      password: adminPassword,
      role: 'admin',
    });

    console.log('Administrador creado:', admin.email);
    console.log('\nSeed completado exitosamente.');
    console.log('\nCredenciales Admin SIRA:');
    console.log('  Email:      admin@sira.ufps.edu.co');
    console.log('  Contraseña: admin2026');
    console.log('\nEstudiantes y docentes se autentican via Moodle SSO.');

    process.exit(0);
  } catch (error) {
    console.error('Error durante el seed:', error.message);
    process.exit(1);
  }
}

seed();
