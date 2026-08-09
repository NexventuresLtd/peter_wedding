import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // loadEnv (not process.env) is what actually reads frontend/.env files.
  const env = loadEnv(mode, process.cwd(), '')

  // Where the dev server proxies /api and /media. Development only — in
  // production the reverse proxy or VITE_API_BASE_URL takes over.
  const apiTarget = env.VITE_API_TARGET || 'http://127.0.0.1:8000'

  return {
    plugins: [react()],
    server: {
      host: true, // expose on the LAN so phones can reach the QR upload page
      port: 5173,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        '/media': { target: apiTarget, changeOrigin: true },
      },
    },
  }
})
