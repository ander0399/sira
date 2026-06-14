/**
 * Cliente Axios centralizado para SIRA.
 * Adjunta automáticamente:
 *   - Authorization: Bearer <JWT SIRA>
 *   - x-moodle-token: <token Moodle> (cuando está disponible, para llamadas REST en vivo)
 * Redirige a /login si el backend responde 401.
 */

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sira_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const moodleToken = localStorage.getItem('sira_moodle_token');
  if (moodleToken) config.headers['x-moodle-token'] = moodleToken;

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sira_token');
      localStorage.removeItem('sira_user');
      localStorage.removeItem('sira_moodle_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
