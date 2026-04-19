import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expõe para a rede Docker
    port: 5173,
    watch: {
      usePolling: true, // Garante que alterações de arquivos host ativem o hot-reload no container
    }
  }
})
