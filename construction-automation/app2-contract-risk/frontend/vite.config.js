import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/analyze': 'http://localhost:8000',
      '/ask-contract': 'http://localhost:8000',
      '/ask-nachtrag': 'http://localhost:8000',
      '/init-nachtrag-session': 'http://localhost:8000',
      '/export': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
})
