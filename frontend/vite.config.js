import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // host: true expone el servidor en 0.0.0.0 — necesario dentro de Docker
    host: true,
    headers: {
      // Permite que Moodle embeba el frontend en un iframe (widget block_sira)
      'Content-Security-Policy': "frame-ancestors *",
    },
    proxy: {
      // En Docker, VITE_API_TARGET apunta al servicio 'backend' por red interna.
      // En local sin Docker, cae al default localhost:5000.
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
