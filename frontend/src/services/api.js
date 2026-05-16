/**
 * Cliente Axios centralizado.
 * Añade automáticamente el JWT a cada request y redirige al login si expira.
 */

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

/* Adjunta el token JWT en cada solicitud */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sira_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* Si el backend responde 401/403, limpia la sesión y redirige al login */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('sira_token');
      localStorage.removeItem('sira_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
