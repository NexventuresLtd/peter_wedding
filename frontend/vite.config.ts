import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The API and uploaded media are proxied in development so the browser sees a
// single origin — no CORS surprises, and `/media/...` URLs from the API work
// verbatim in both dev and production.
const API_TARGET = process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // expose on the LAN so phones can reach the QR upload page
    port: 5173,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/media': { target: API_TARGET, changeOrigin: true },
    },
  },
})
