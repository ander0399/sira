/**
 * Slice de recomendaciones académicas.
 * Maneja la lista de recomendaciones y el envío de feedback.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

/* Thunk: cargar recomendaciones del estudiante */
export const fetchRecommendations = createAsyncThunk('recommendations/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/recommendations');
    return data.recommendations;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Error al cargar recomendaciones.');
  }
});

/* Thunk: generar nuevas recomendaciones */
export const generateRecommendations = createAsyncThunk('recommendations/generate', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/recommendations/generate');
    return data.recommendations;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Error al generar recomendaciones.');
  }
});

/* Thunk: marcar recomendación como leída */
export const markAsRead = createAsyncThunk('recommendations/read', async (id, { rejectWithValue }) => {
  try {
    await api.patch(`/recommendations/${id}/read`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Error.');
  }
});

/* Thunk: enviar feedback sobre una recomendación */
export const submitFeedback = createAsyncThunk('recommendations/feedback', async (feedbackData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/feedback', feedbackData);
    return { recommendationId: feedbackData.recommendationId, feedback: data.feedback };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Error al enviar feedback.');
  }
});

const recommendationSlice = createSlice({
  name: 'recommendations',
  initialState: {
    list:    [],
    loading: false,
    error:   null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecommendations.pending,   (state) => { state.loading = true; state.error = null; })
      .addCase(fetchRecommendations.fulfilled, (state, { payload }) => { state.loading = false; state.list = payload; })
      .addCase(fetchRecommendations.rejected,  (state, { payload }) => { state.loading = false; state.error = payload; })

      .addCase(generateRecommendations.fulfilled, (state, { payload }) => {
        /* Agrega las nuevas al inicio */
        state.list = [...payload, ...state.list];
      })

      .addCase(markAsRead.fulfilled, (state, { payload }) => {
        const rec = state.list.find(r => r.id === payload);
        if (rec) rec.isRead = true;
      })

      .addCase(submitFeedback.fulfilled, (state, { payload }) => {
        const rec = state.list.find(r => r.id === payload.recommendationId);
        if (rec) rec.feedback = payload.feedback;
      });
  },
});

export default recommendationSlice.reducer;
