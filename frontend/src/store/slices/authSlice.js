/**
 * Slice de autenticación.
 * Maneja el usuario autenticado, el token JWT y el estado de carga del login.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

/* Carga inicial desde localStorage para persistir sesión entre recargas */
const savedUser  = JSON.parse(localStorage.getItem('sira_user')  || 'null');
const savedToken = localStorage.getItem('sira_token') || null;

/* Thunk: login */
export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', credentials);
    localStorage.setItem('sira_token', data.token);
    localStorage.setItem('sira_user', JSON.stringify(data.user));
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Error al iniciar sesión.');
  }
});

/* Thunk: registro */
export const registerUser = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', userData);
    localStorage.setItem('sira_token', data.token);
    localStorage.setItem('sira_user', JSON.stringify(data.user));
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Error al registrarse.');
  }
});

/* Thunk: obtener datos del usuario autenticado */
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
    user:    savedUser,
    token:   savedToken,
    loading: false,
    error:   null,
  },
  reducers: {
    logout(state) {
      state.user  = null;
      state.token = null;
      localStorage.removeItem('sira_token');
      localStorage.removeItem('sira_user');
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const setPending  = (state) => { state.loading = true;  state.error = null; };
    const setRejected = (state, action) => { state.loading = false; state.error = action.payload; };

    builder
      .addCase(loginUser.pending,    setPending)
      .addCase(loginUser.fulfilled,  (state, { payload }) => {
        state.loading = false;
        state.user    = payload.user;
        state.token   = payload.token;
      })
      .addCase(loginUser.rejected,   setRejected)

      .addCase(registerUser.pending,   setPending)
      .addCase(registerUser.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.user    = payload.user;
        state.token   = payload.token;
      })
      .addCase(registerUser.rejected,  setRejected)

      .addCase(fetchMe.fulfilled, (state, { payload }) => {
        state.user = payload;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
