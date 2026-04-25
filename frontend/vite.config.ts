import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true, 
    port: 5173,
    watch: {
      usePolling: true,
    },
    // O SEU NGINX LOCAL (PROXY REVERSO)
    proxy: {
      '/api': {
        target: 'http://backend:3000', // Aponta para o seu backend local
        changeOrigin: true,
        // Como o backend já espera '/api', não precisamos do 'rewrite' aqui
      }
    }
  }
})