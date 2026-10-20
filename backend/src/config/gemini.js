const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

let geminiClient = null;

const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) return null;

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  return geminiClient;
};

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

module.exports = { getGeminiClient, GEMINI_MODEL };
