const { getGeminiClient, GEMINI_MODEL } = require('../config/gemini');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const sendToGemini = async (systemPrompt, messages, userMessage, options = {}) => {
  const client = getGeminiClient();
  if (!client) return null;

  const { temperature = 0.7, maxTokens = 600, imageData = null } = options;

  // Convertir historial al formato de Gemini (role: 'user'|'model')
  const recentHistory = messages.slice(-10).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  // Partes del mensaje actual: texto + imagen opcional
  const userParts = [{ text: userMessage }];
  if (imageData?.base64 && imageData?.mimeType) {
    userParts.push({ inlineData: { mimeType: imageData.mimeType, data: imageData.base64 } });
  }

  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          ...recentHistory,
          { role: 'user', parts: userParts },
        ],
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: maxTokens,
          temperature,
          topP: 0.9,
        },
      });
      return response.text || null;
    } catch (error) {
      const isRateLimit =
        error?.status === 429 ||
        error?.message?.includes('rate limit') ||
        error?.message?.includes('quota');
      if (isRateLimit && attempt < MAX_RETRIES) {
        const waitMs = 1000 * Math.pow(2, attempt);
        console.warn(`Gemini rate limit. Reintentando en ${waitMs}ms...`);
        await sleep(waitMs);
        continue;
      }
      console.error('Error al llamar a Gemini:', error.message);
      return null;
    }
  }
  return null;
};

const isGeminiAvailable = () => Boolean(getGeminiClient());

module.exports = { sendToGemini, isGeminiAvailable };
