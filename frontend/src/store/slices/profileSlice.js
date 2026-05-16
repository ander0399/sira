/**
 * Slice del perfil académico del estudiante.
 * Maneja el perfil, historial de materias y catálogo IS-UFPS.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

/* Thunk: cargar perfil completo con materias */
export const fetchProfile = createAsyncThunk('profile/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/student/profile');
    return data.profile;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Error al cargar el perfil.');
  }
});

/* Thunk: actualizar perfil */
export const updateProfile = createAsyncThunk('profile/update', async (profileData, { rejectWithValue }) => {
  try {
    const { data } = await api.put('/student/profile', profileData);
    return data.profile;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Error al actualizar el perfil.');
  }
});

/* Thunk: cargar catálogo de materias IS-UFPS */
export const fetchSubjectCatalog = createAsyncThunk('profile/catalog', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/student/subjects/catalog');
    return data.subjects;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Error al cargar el catálogo.');
  }
});

/* Thunk: agregar/actualizar materia en el historial */
export const addSubject = createAsyncThunk('profile/addSubject', async (subjectData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/student/subjects', subjectData);
    return data.studentSubject;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Error al registrar la materia.');
  }
});

const profileSlice = createSlice({
  name: 'profile',
  initialState: {
    data:    null,      // objeto StudentProfile con sus subjects anidados
    catalog: [],        // array de Subject (catálogo completo IS-UFPS)
    loading: false,
    error:   null,
  },
  reducers: {
    clearProfileError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(fetchProfile.fulfilled, (state, { payload }) => { state.loading = false; state.data = payload; })
      .addCase(fetchProfile.rejected,  (state, { payload }) => { state.loading = false; state.error = payload; })

      .addCase(updateProfile.fulfilled, (state, { payload }) => { state.data = { ...state.data, ...payload }; })

      .addCase(fetchSubjectCatalog.fulfilled, (state, { payload }) => { state.catalog = payload; })

      .addCase(addSubject.fulfilled, (state, { payload }) => {
        /* Actualiza o agrega la materia en la lista local */
        if (!state.data) return;
        const idx = state.data.subjects?.findIndex(s => s.id === payload.id);
        if (idx !== undefined && idx >= 0) {
          state.data.subjects[idx] = payload;
        } else {
          state.data.subjects = [...(state.data.subjects || []), payload];
        }
      });
  },
});

export const { clearProfileError } = profileSlice.actions;
export default profileSlice.reducer;
