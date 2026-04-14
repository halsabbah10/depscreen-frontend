import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Split heavy deps into separate chunks so the initial page load ships less.
    // Biggest wins: framer-motion, react-markdown/remark, i18next, radix-ui.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          markdown: ['react-markdown', 'remark-gfm'],
          i18n: ['i18next', 'react-i18next'],
          radix: [
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-dialog',
            '@radix-ui/react-progress',
            '@radix-ui/react-slot',
            '@radix-ui/react-tabs',
          ],
          icons: ['lucide-react'],
        },
      },
    },
    // Raise warning threshold so chunk-size logs don't drown out real issues.
    chunkSizeWarningLimit: 700,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
