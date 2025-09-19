// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window', // 👈 fix para sockjs-client
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true, secure: false },
      '/ws':  { target: 'http://localhost:8080', changeOrigin: true, secure: false, ws: true },
    },
  },
})
