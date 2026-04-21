/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Stub out heavy ESM packages that exhaust the V8 heap during vitest
      // transforms in jsdom. Only active in the test environment (this config
      // is only loaded by vitest, never by the Vite dev/build server).
      'react-markdown': path.resolve(__dirname, './src/test/stubs/react-markdown.tsx'),
      'remark-gfm': path.resolve(__dirname, './src/test/stubs/remark-gfm.ts'),
      'rehype-sanitize': path.resolve(__dirname, './src/test/stubs/rehype-sanitize.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    server: {
      deps: {
        // By default vitest externalizes node_modules (loads them as native
        // ESM, bypassing Vite transforms and therefore resolve.alias). Inlining
        // these packages routes them through Vite's transform pipeline, which
        // applies the stub aliases defined in resolve.alias above and prevents
        // the full unified/micromark ESM graph from loading in jsdom workers.
        inline: ['react-markdown', 'remark-gfm', 'rehype-sanitize'],
      },
    },
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
