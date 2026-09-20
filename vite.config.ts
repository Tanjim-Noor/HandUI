import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

function contentSecurityPolicy(scriptSource: string, connectSource: string) {
  return [
    "default-src 'self'",
    `script-src ${scriptSource}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    `connect-src ${connectSource}`,
    "font-src 'self'",
  ].join('; ');
}

const sharedSecurityHeaders = {
  'Permissions-Policy': 'camera=(self)',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
};

export const developmentSecurityHeaders = {
  ...sharedSecurityHeaders,
  // Vite injects the React Refresh preamble inline during local development.
  'Content-Security-Policy': contentSecurityPolicy(
    "'self' 'unsafe-inline' 'wasm-unsafe-eval'",
    "'self' ws://localhost:* ws://127.0.0.1:*",
  ),
};

export const productionSecurityHeaders = {
  ...sharedSecurityHeaders,
  'Content-Security-Policy': contentSecurityPolicy("'self' 'wasm-unsafe-eval'", "'self'"),
};

export default defineConfig({
  plugins: [react()],
  server: { headers: developmentSecurityHeaders },
  preview: { headers: productionSecurityHeaders },
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
