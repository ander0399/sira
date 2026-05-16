/**
 * Configuración del cliente Groq para integración con Llama 3.1.
 * Si GROQ_API_KEY no está definida, el sistema opera solo con el motor de reglas.
 */

const Groq = require('groq-sdk');
require('dotenv').config();

let groqClient = null;

/**
 * Retorna el cliente Groq si la API key está configurada, o null si no.
 * Permite al sistema funcionar sin IA externa.
 */
const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) return null;

  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  return groqClient;
};

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

module.exports = { getGroqClient, GROQ_MODEL };
