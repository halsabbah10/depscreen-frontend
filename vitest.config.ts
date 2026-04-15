/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Keep the test globs narrow so we don't accidentally collect
    // anything under node_modules or dist.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // We intentionally focus Vitest on utility + critical component tests;
      // page-level coverage lives in Playwright. Don't chase % here.
      include: [
        'src/lib/**',
        'src/api/**',
        'src/contexts/**',
        'src/components/ui/**',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
      ],
    },
  },
})
