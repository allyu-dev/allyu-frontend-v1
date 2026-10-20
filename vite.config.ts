import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const target = env.VITE_DEV_PROXY_TARGET?.trim()

  if (target && !/^https?:\/\//.test(target)) {
    throw new Error('VITE_DEV_PROXY_TARGET debe ser una URL HTTP o HTTPS.')
  }

  return {
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: { usePolling: true, interval: 500 },
    proxy: target ? { '/api': { target, changeOrigin: true, secure: true } } : undefined,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
  },
  }
})
