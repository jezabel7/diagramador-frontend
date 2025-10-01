// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/diagramador-frontend/',
  build: { outDir: 'docs' },
  plugins: [react()],
  define: { global: 'window' },
  server: {
    proxy: {
      '/api': { target: 'https://35.188.196.28', changeOrigin: true, secure: false },
      '/ws':  { target: 'https://35.188.196.28', changeOrigin: true, secure: false, ws: true },
    },
  },
})
