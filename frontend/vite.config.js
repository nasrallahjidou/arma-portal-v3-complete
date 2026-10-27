import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    cors: true,
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', 'localhost'],  
    proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
   
    secure: false, // Disable SSL verification for local development ill change to true in production
    rewrite: (path) => path.replace(/^\/api/, '/api'),
  }
}
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  }
})