/**
 * Slice de datos Moodle.
 * Fetcha cursos y calificaciones del estudiante desde la REST API de Moodle
 * (proxied por el backend SIRA en /api/moodle/*).
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

/* Thunk: obtener cursos inscritos del usuario */
export const fetchCourses = createAsyncThunk('moodle/fetchCourses', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/moodle/courses');
    return data.courses || [];
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Error al cargar cursos de Moodle.');
  }
});

/* Thunk: obtener calificaciones de un curso específico */
export const fetchGrades = createAsyncThunk('moodle/fetchGrades', async (courseId, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/moodle/grades/${courseId}`);
    return { courseId, grades: data.grades };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Error al cargar calificaciones.');
  }
});

const moodleSlice = createSlice({
  name: 'moodle',
  initialState: {
    courses: [],
    grades:  {},       // { [courseId]: gradesData }
    loading: false,
    error:   null,
  },
  reducers: {
    clearMoodleError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourses.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(fetchCourses.fulfilled, (state, { payload }) => { state.loading = false; state.courses = payload; })
      .addCase(fetchCourses.rejected,  (state, { payload }) => { state.loading = false; state.error = payload; })

      .addCase(fetchGrades.fulfilled, (state, { payload }) => {
        state.grades[payload.courseId] = payload.grades;
      });
  },
});

export const { clearMoodleError } = moodleSlice.actions;
export default moodleSlice.reducer;
