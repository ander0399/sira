/**
 * Base de conocimiento académico de SIRA.
 * Contiene información estructurada sobre las 4 materias críticas del área de programación.
 * Se usa como contexto (RAG) para enriquecer las respuestas del LLM.
 */

const knowledgeBase = {

  FUND_PROG: {
    name: 'Fundamentos de Programación',
    topics: [
      'Algoritmos y pseudocódigo',
      'Variables, tipos de datos y operadores',
      'Estructuras de control: if, else, switch',
      'Ciclos: for, while, do-while',
      'Funciones y modularización',
      'Arreglos y cadenas',
      'Introducción a la recursividad',
    ],
    commonMistakes: [
      'Confundir asignación (=) con comparación (==)',
      'No inicializar variables antes de usarlas',
      'Ciclos infinitos por condición mal planteada',
      'No entender el scope de las variables',
      'Mezclar lógica de presentación con lógica de negocio',
    ],
    studyStrategies: [
      'Practica escribiendo código a mano antes de usar el IDE',
      'Resuelve al menos 3 ejercicios de cada tema antes de avanzar',
      'Usa plataformas como HackerRank o Codecademy para práctica diaria',
      'Dibuja diagramas de flujo antes de codificar',
      'Trabaja en grupos pequeños para resolver problemas juntos',
    ],
    resources: [
      { title: 'CS50 - Harvard (gratuito)', url: 'https://cs50.harvard.edu/x/' },
      { title: 'Automate the Boring Stuff with Python', url: 'https://automatetheboringstuff.com/' },
      { title: 'Ejercicios en HackerRank', url: 'https://www.hackerrank.com/domains/algorithms' },
    ],
    riskIndicators: ['nota < 3.0', 'perdió la materia antes', 'dificultad con ciclos o funciones'],
  },

  POO: {
    name: 'Programación Orientada a Objetos',
    topics: [
      'Clases y objetos',
      'Constructores y destructores',
      'Encapsulamiento: public, private, protected',
      'Herencia simple y múltiple',
      'Polimorfismo y sobrecarga',
      'Interfaces y clases abstractas',
      'Principios SOLID',
      'Patrones de diseño básicos (Singleton, Factory)',
    ],
    commonMistakes: [
      'No entender la diferencia entre clase e instancia',
      'Abusar de herencia cuando la composición es mejor',
      'No aplicar encapsulamiento correctamente',
      'Confundir sobreescritura y sobrecarga',
      'No usar interfaces para desacoplar componentes',
    ],
    studyStrategies: [
      'Modela situaciones reales como clases (un banco, una biblioteca)',
      'Practica los 4 pilares de POO con ejemplos propios',
      'Lee y analiza código de proyectos open source en Java',
      'Implementa un proyecto pequeño completo (mini-sistema de gestión)',
      'Estudia los principios SOLID con ejemplos concretos',
    ],
    resources: [
      { title: 'Java OOP - W3Schools', url: 'https://www.w3schools.com/java/java_oop.asp' },
      { title: 'Head First Java (libro)', url: 'https://www.oreilly.com/library/view/head-first-java/0596009208/' },
      { title: 'SOLID Principles explicados', url: 'https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design' },
    ],
    riskIndicators: ['nota < 3.0 en Fundamentos', 'dificultad con abstracción', 'no aprobó FUND_PROG'],
  },

  ESTR_DATOS: {
    name: 'Estructuras de Datos',
    topics: [
      'Complejidad algorítmica: Big O notation',
      'Listas enlazadas (simple, doble, circular)',
      'Pilas (Stack) y colas (Queue)',
      'Árboles binarios y árboles de búsqueda',
      'Árboles AVL y balanceo',
      'Grafos: representación y recorridos (BFS, DFS)',
      'Tablas hash y funciones de hashing',
      'Algoritmos de ordenamiento: QuickSort, MergeSort',
    ],
    commonMistakes: [
      'No entender cuándo usar cada estructura de datos',
      'Implementar sin comprender la complejidad temporal',
      'No manejar casos borde (lista vacía, nodo raíz null)',
      'Confundir iteración con recursión en árboles',
      'No liberar memoria en lenguajes sin garbage collector',
    ],
    studyStrategies: [
      'Visualiza las estructuras dibujándolas en papel antes de codificar',
      'Implementa cada estructura desde cero sin copiar código',
      'Usa visualizadores online como VisuAlgo para entender los algoritmos',
      'Practica en LeetCode o Codeforces con problemas de dificultad baja primero',
      'Analiza la complejidad de tus soluciones antes de entregarlas',
    ],
    resources: [
      { title: 'VisuAlgo - Visualizador de algoritmos', url: 'https://visualgo.net/en' },
      { title: 'LeetCode - Problemas de estructuras', url: 'https://leetcode.com/explore/learn/' },
      { title: 'GeeksForGeeks - Data Structures', url: 'https://www.geeksforgeeks.org/data-structures/' },
    ],
    riskIndicators: ['nota < 3.0 en POO', 'dificultad con recursión', 'no aprobó POO'],
  },

  BD: {
    name: 'Bases de Datos',
    topics: [
      'Modelo relacional y conceptos fundamentales',
      'Diagrama Entidad-Relación (ER)',
      'Normalización: 1FN, 2FN, 3FN, BCNF',
      'Lenguaje SQL: SELECT, INSERT, UPDATE, DELETE',
      'JOINs: INNER, LEFT, RIGHT, FULL OUTER',
      'Subconsultas y funciones de agregación',
      'Índices y optimización de consultas',
      'Transacciones y propiedades ACID',
      'Introducción a NoSQL (MongoDB)',
    ],
    commonMistakes: [
      'Diseñar tablas sin normalizar correctamente',
      'Usar SELECT * en producción',
      'No entender la diferencia entre los tipos de JOIN',
      'Ignorar las restricciones de integridad referencial',
      'No usar índices en columnas de búsqueda frecuente',
    ],
    studyStrategies: [
      'Practica con una base de datos real (PostgreSQL o MySQL local)',
      'Diseña el modelo ER de situaciones cotidianas antes de crear tablas',
      'Resuelve ejercicios de normalización paso a paso',
      'Usa SQLFiddle o DB-Fiddle para practicar SQL en línea',
      'Aprende a leer el plan de ejecución de consultas (EXPLAIN)',
    ],
    resources: [
      { title: 'SQLZoo - Tutorial interactivo', url: 'https://sqlzoo.net/wiki/SQL_Tutorial' },
      { title: 'DB-Fiddle - Práctica SQL online', url: 'https://www.db-fiddle.com/' },
      { title: 'PostgreSQL Tutorial', url: 'https://www.postgresqltutorial.com/' },
    ],
    riskIndicators: ['dificultad con álgebra relacional', 'errores frecuentes en SQL', 'no completó ejercicios de normalización'],
  },

  // Estrategias generales de estudio aplicables a cualquier materia
  GENERAL: {
    studyStrategies: [
      'Usa la técnica Pomodoro: 25 min de estudio + 5 min de descanso',
      'Repasa el material del día siguiente antes de dormir',
      'Forma grupos de estudio con compañeros de semestre',
      'Asiste a las horas de asesoría del docente cuando tengas dudas',
      'Mantén un registro de los temas donde tienes más errores',
      'Explica los conceptos en voz alta como si le enseñaras a alguien más',
    ],
    alertMessages: {
      lowGpa: 'Tu promedio actual requiere atención. Considera reducir tu carga académica y enfocarte en las materias críticas.',
      repeatingSubject: 'Estás cursando esta materia por segunda vez. Es importante identificar qué salió mal antes y trabajarlo.',
      highRiskSubject: 'Esta materia tiene históricamente alta tasa de reprobación. Comienza a estudiar desde la primera semana.',
      prerequisiteNotMet: 'Para cursar esta materia necesitas aprobar primero sus prerrequisitos.',
    },
  },
};

module.exports = knowledgeBase;
