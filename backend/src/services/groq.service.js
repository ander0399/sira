/**
 * Servicio de integración con Groq (Llama 3.1).
 * Si GROQ_API_KEY no está configurada, retorna null y el sistema
 * usa solo el motor de reglas para responder.
 * Incluye reintento automático ante errores de rate limit (429).
 */

const { getGroqClient, GROQ_MODEL } = require('../config/groq');

/**
 * Espera un tiempo dado en milisegundos.
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Envía un mensaje al LLM de Groq con historial de conversación.
 * Reintenta hasta 2 veces si recibe un error de rate limit (429).
 *
 * @param {string} systemPrompt  - Contexto del sistema (RAG + perfil)
 * @param {Array}  messages      - Historial de mensajes [{ role, content }]
 * @param {string} userMessage   - Último mensaje del usuario
 * @param {Object} options       - Opciones opcionales: { temperature, maxTokens }
 * @returns {string|null} Respuesta del LLM, o null si Groq no está disponible
 */
const sendToGroq = async (systemPrompt, messages, userMessage, options = {}) => {
  const client = getGroqClient();
  if (!client) return null;

  const { temperature = 0.7, maxTokens = 600 } = options;

  // Limitar historial a los últimos 10 mensajes para no exceder tokens
  const recentHistory = messages.slice(-10).map(m => ({
    role: m.role,
    content: m.content,
  }));

  const payload = {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...recentHistory,
      { role: 'user', content: userMessage },
    ],
    temperature,
    max_tokens: maxTokens,
    top_p: 0.9,
  };

  // Reintento con backoff exponencial ante rate limit
  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const completion = await client.chat.completions.create(payload);
      return completion.choices[0]?.message?.content || null;
    } catch (error) {
      const isRateLimit = error?.status === 429 || error?.message?.includes('rate limit');
      if (isRateLimit && attempt < MAX_RETRIES) {
        const waitMs = 1000 * Math.pow(2, attempt); // 1s, 2s
        console.warn(`Groq rate limit. Reintentando en ${waitMs}ms...`);
        await sleep(waitMs);
        continue;
      }
      console.error('Error al llamar a Groq:', error.message);
      return null;
    }
  }
  return null;
};

/**
 * Verifica si Groq está disponible (API key configurada).
 * @returns {boolean}
 */
const isGroqAvailable = () => Boolean(getGroqClient());

module.exports = { sendToGroq, isGroqAvailable };
