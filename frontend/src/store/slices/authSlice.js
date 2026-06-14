/**
 * Slice de autenticación SIRA v2.
 * Soporta dos flujos:
 *   - Moodle SSO (estudiantes y docentes): token Moodle → JWT SIRA
 *   - Admin SIRA: email + contraseña → JWT SIRA
 * Persiste token, usuario y moodleToken en localStorage.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

const savedUser        = JSON.parse(localStorage.getItem('sira_user')         || 'null');
const savedToken       = localStorage.getItem('sira_token')                   || null;
const savedMoodleToken = localStorage.getItem('sira_moodle_token')            || null;

/* Thunk: autenticación Moodle SSO (estudiantes y docentes) */
export const moodleLogin = createAsyncThunk('auth/moodleLogin', async ({ moodleToken, role }, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/moodle', { moodleToken, role });
    localStorage.setItem('sira_token',        data.token);
    localStorage.setItem('sira_user',         JSON.stringify(data.user));
    localStorage.setItem('sira_moodle_token', moodleToken);
    return { ...data, moodleToken };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Token Moodle inválido o expirado.');
  }
});

/* Thunk: autenticación Admin SIRA (email + contraseña) */
export const adminLogin = createAsyncThunk('auth/adminLogin', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/admin/login', credentials);
    localStorage.setItem('sira_token', data.token);
    localStorage.setItem('sira_user',  JSON.stringify(data.user));
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Credenciales inválidas.');
  }
});

/* Thunk: refrescar datos del usuario autenticado */
export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me');
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Sesión expirada.');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:        savedUser,
    token:       savedToken,
    moodleToken: savedMoodleToken,
    loading:     false,
    error:       null,
  },
  reducers: {
    logout(state) {
      state.user        = null;
      state.token       = null;
      state.moodleToken = null;
      localStorage.removeItem('sira_token');
      localStorage.removeItem('sira_user');
      localStorage.removeItem('sira_moodle_token');
    },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    const setPending  = (state) => { state.loading = true;  state.error = null; };
    const setRejected = (state, action) => { state.loading = false; state.error = action.payload; };

    builder
      .addCase(moodleLogin.pending,   setPending)
      .addCase(moodleLogin.fulfilled, (state, { payload }) => {
        state.loading     = false;
        state.user        = payload.user;
        state.token       = payload.token;
        state.moodleToken = payload.moodleToken;
      })
      .addCase(moodleLogin.rejected,  setRejected)

      .addCase(adminLogin.pending,   setPending)
      .addCase(adminLogin.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.user    = payload.user;
        state.token   = payload.token;
      })
      .addCase(adminLogin.rejected, setRejected)

      .addCase(fetchMe.fulfilled, (state, { payload }) => { state.user = payload; });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
