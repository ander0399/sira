/**
 * Slice del chatbot ChatSIRA.
 * Maneja el historial de mensajes, sessionId y estado de escritura del bot.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import api from '../../services/api';

/* Thunk: enviar mensaje y recibir respuesta de SIRA */
export const sendMessage = createAsyncThunk('chat/send', async ({ message, sessionId }, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/chat/message', { message, sessionId });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Error al enviar el mensaje.');
  }
});

/* Thunk: cargar historial de la sesión activa */
export const loadChatHistory = createAsyncThunk('chat/history', async (sessionId, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/chat/history', { params: { sessionId } });
    return data.messages;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Error al cargar el historial.');
  }
});

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    messages:    [],       // [{ role, content, source, createdAt }]
    sessionId:   null,     // UUID de la sesión activa
    isTyping:    false,    // SIRA está "escribiendo"
    aiAvailable: false,    // si Groq está activo en el backend
    error:       null,
  },
  reducers: {
    startNewSession(state) {
      state.messages  = [];
      state.sessionId = uuidv4();
      state.error     = null;
    },
    clearChat(state) {
      state.messages = [];
      state.error    = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state, { meta }) => {
        state.isTyping = true;
        state.error    = null;
        /* Agrega el mensaje del usuario de inmediato (sin esperar al backend) */
        state.messages.push({
          role:      'user',
          content:   meta.arg.message,
          createdAt: new Date().toISOString(),
        });
        /* Inicializa la sesión si es el primer mensaje */
        if (!state.sessionId) state.sessionId = meta.arg.sessionId || uuidv4();
      })
      .addCase(sendMessage.fulfilled, (state, { payload }) => {
        state.isTyping    = false;
        state.aiAvailable = payload.aiAvailable;
        state.sessionId   = payload.sessionId;
        state.messages.push({
          role:      'assistant',
          content:   payload.message,
          source:    payload.source,
          createdAt: new Date().toISOString(),
        });
      })
      .addCase(sendMessage.rejected, (state, { payload }) => {
        state.isTyping = false;
        state.error    = payload;
      })

      .addCase(loadChatHistory.fulfilled, (state, { payload }) => {
        state.messages = payload;
      });
  },
});

export const { startNewSession, clearChat } = chatSlice.actions;
export default chatSlice.reducer;
