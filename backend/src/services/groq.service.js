/**
 * Servicio de integración con Groq (Llama 3.1).
 * Si GROQ_API_KEY no está configurada, retorna null y el sistema
 * usa solo el motor de reglas para responder.
 */

const { getGroqClient, GROQ_MODEL } = require('../config/groq');

/**
 * Envía un mensaje al LLM de Groq con el historial de conversación.
 * @param {string} systemPrompt  - Contexto del sistema (RAG + perfil del estudiante)
 * @param {Array}  messages      - Historial de mensajes [{ role, content }]
 * @param {string} userMessage   - Último mensaje del usuario
 * @returns {string|null} Respuesta del LLM, o null si Groq no está disponible
 */
const sendToGroq = async (systemPrompt, messages, userMessage) => {
  const client = getGroqClient();

  // Si no hay API key configurada, indica que no está disponible
  if (!client) return null;

  try {
    // Limitar historial a los últimos 10 mensajes para no exceder tokens
    const recentHistory = messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content,
    }));

    const completion = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...recentHistory,
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,    // balance entre creatividad y precisión
      max_tokens: 600,     // respuestas concisas para chatbot académico
      top_p: 0.9,
    });

    return completion.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('Error al llamar a Groq:', error.message);
    return null;
  }
};

/**
 * Verifica si Groq está disponible (API key configurada).
 * @returns {boolean}
 */
const isGroqAvailable = () => Boolean(getGroqClient());

module.exports = { sendToGroq, isGroqAvailable };
