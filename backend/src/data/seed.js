/**
 * Script de seed: crea la base de datos sira_db, sincroniza los modelos
 * e inserta los datos iniciales (plan de estudios y usuarios de prueba).
 * Ejecutar con: npm run seed
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, StudentProfile, Subject, StudentSubject } = require('../models');
const subjectsData = require('./subjects');

async function seed() {
  try {
    console.log('🔄 Sincronizando modelos con la base de datos...');

    // force: true elimina y recrea las tablas — solo para desarrollo inicial
    await sequelize.sync({ force: true });
    console.log('✅ Tablas creadas correctamente.');

    // ── Insertar materias del plan de estudios ────────────────────────────
    console.log('📚 Insertando plan de estudios IS-UFPS...');
    const createdSubjects = await Subject.bulkCreate(subjectsData);
    console.log(`   ${createdSubjects.length} materias insertadas.`);

    // ── Crear usuario administrador ───────────────────────────────────────
    const adminPassword = await bcrypt.hash('admin2026', 10);
    const admin = await User.create({
      name: 'Administrador SIRA',
      email: 'admin@sira.ufps.edu.co',
      password: adminPassword,
      role: 'admin',
    });
    console.log('👤 Administrador creado:', admin.email);

    // ── Crear estudiante de prueba (semestre 2, en riesgo) ────────────────
    const studentPassword = await bcrypt.hash('student2026', 10);
    const student1 = await User.create({
      name: 'Carlos Andres Pérez',
      email: 'carlos.perez@ufps.edu.co',
      password: studentPassword,
      role: 'student',
    });

    const profile1 = await StudentProfile.create({
      userId: student1.id,
      currentSemester: 2,
      gpa: 3.1,
      learningStyle: 'visual',
      studentCode: '1151700',
    });

    // Materias del estudiante de prueba
    const fundProg = createdSubjects.find(s => s.code === 'FUND_PROG');
    const poo      = createdSubjects.find(s => s.code === 'POO');

    await StudentSubject.bulkCreate([
      {
        studentProfileId: profile1.id,
        subjectId: fundProg.id,
        grade: 3.2,
        status: 'aprobada',
        semesterTaken: 1,
        attempts: 1,
      },
      {
        studentProfileId: profile1.id,
        subjectId: poo.id,
        grade: null,
        status: 'en_curso',
        semesterTaken: 2,
        attempts: 1,
      },
    ]);

    // ── Crear segundo estudiante (semestre 3, promedio bajo) ──────────────
    const student2 = await User.create({
      name: 'Laura Milena Gómez',
      email: 'laura.gomez@ufps.edu.co',
      password: studentPassword,
      role: 'student',
    });

    const profile2 = await StudentProfile.create({
      userId: student2.id,
      currentSemester: 3,
      gpa: 2.8,
      learningStyle: 'lectura',
      studentCode: '1151701',
    });

    const estrDatos = createdSubjects.find(s => s.code === 'ESTR_DATOS');
    const bd        = createdSubjects.find(s => s.code === 'BD');

    await StudentSubject.bulkCreate([
      {
        studentProfileId: profile2.id,
        subjectId: fundProg.id,
        grade: 3.0,
        status: 'aprobada',
        semesterTaken: 1,
        attempts: 2, // segunda vez que la cursó
      },
      {
        studentProfileId: profile2.id,
        subjectId: poo.id,
        grade: 2.5,
        status: 'reprobada',
        semesterTaken: 2,
        attempts: 1,
      },
      {
        studentProfileId: profile2.id,
        subjectId: estrDatos.id,
        grade: null,
        status: 'en_curso',
        semesterTaken: 3,
        attempts: 1,
      },
      {
        studentProfileId: profile2.id,
        subjectId: bd.id,
        grade: null,
        status: 'en_curso',
        semesterTaken: 3,
        attempts: 1,
      },
    ]);

    console.log('👤 Estudiantes de prueba creados.');
    console.log('\n🎉 Seed completado exitosamente.');
    console.log('\nCredenciales de prueba:');
    console.log('  Admin:     admin@sira.ufps.edu.co  /  admin2026');
    console.log('  Estudiante 1: carlos.perez@ufps.edu.co  /  student2026');
    console.log('  Estudiante 2: laura.gomez@ufps.edu.co   /  student2026');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante el seed:', error.message);
    process.exit(1);
  }
}

seed();
