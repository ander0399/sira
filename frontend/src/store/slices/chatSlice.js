/**
 * Slice del chatbot ChatSIRA.
 * Maneja el historial de mensajes, sessionId, estado de escritura
 * y el curso activo desde el que el usuario abrió el plugin Moodle.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import api from '../../services/api';

/* Thunk: enviar mensaje y recibir respuesta de SIRA */
export const sendMessage = createAsyncThunk('chat/send', async ({ message, sessionId, courseId, file }, { rejectWithValue }) => {
  try {
    let data;
    if (file) {
      const form = new FormData();
      form.append('message', message);
      if (sessionId) form.append('sessionId', sessionId);
      if (courseId)  form.append('courseId', String(courseId));
      form.append('image', file);
      ({ data } = await api.post('/chat/message', form, { headers: { 'Content-Type': 'multipart/form-data' } }));
    } else {
      ({ data } = await api.post('/chat/message', { message, sessionId, courseId }));
    }
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

const savedCourseId = parseInt(localStorage.getItem('sira_course_id') || '0') || null;

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    messages:      [],       // [{ role, content, source, createdAt }]
    sessionId:     null,     // UUID de la sesión activa
    isTyping:      false,    // SIRA está "escribiendo"
    aiAvailable:   false,    // si Groq está activo en el backend
    activeCourseId: savedCourseId, // ID del curso desde donde se abrió el plugin
    error:         null,
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
    setActiveCourse(state, { payload }) {
      state.activeCourseId = payload;
      if (payload) localStorage.setItem('sira_course_id', String(payload));
      else         localStorage.removeItem('sira_course_id');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state, { meta }) => {
        state.isTyping = true;
        state.error    = null;
        /* Agrega el mensaje del usuario de inmediato (sin esperar al backend) */
        state.messages.push({
          role:       'user',
          content:    meta.arg.message,
          imageUrl:   meta.arg.file ? URL.createObjectURL(meta.arg.file) : null,
          createdAt:  new Date().toISOString(),
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

export const { startNewSession, clearChat, setActiveCourse } = chatSlice.actions;
export default chatSlice.reducer;
