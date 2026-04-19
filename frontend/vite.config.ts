import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // <-- 1. Importamos o Tailwind aqui

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <-- 2. Adicionamos ele na lista de plugins
  ],
  server: {
    host: true, // Expõe para a rede Docker
    port: 5173,
    watch: {
      usePolling: true, // Garante que alterações de arquivos host ativem o hot-reload
    }
  }
})