import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "connect-src 'self'",
    "font-src 'self'",
  ].join('; '),
  'Permissions-Policy': 'camera=(self)',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

export default defineConfig({
  plugins: [react()],
  server: { headers: securityHeaders },
  preview: { headers: securityHeaders },
  build: {
    target: ['chrome111', 'edge111'],
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@react-three/fiber') || id.includes('/three/')) return 'spatial-3d';
          if (id.includes('@mediapipe/tasks-vision')) return 'mediapipe';
          if (id.includes('react-router')) return 'router';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/handui/math/**/*.ts', 'src/handui/recognizers/**/*.ts'],
      thresholds: { lines: 90, functions: 90, branches: 85 },
    },
  },
});
