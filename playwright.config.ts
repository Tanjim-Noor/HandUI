import { defineConfig, devices } from '@playwright/test';

const externalBaseURL = process.env.HANDUI_E2E_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: externalBaseURL ?? 'http://127.0.0.1:45456',
    permissions: ['camera'],
    launchOptions: {
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: externalBaseURL
    ? undefined
    : {
        command: 'pnpm build && pnpm preview --host 127.0.0.1 --port 45456 --strictPort',
        url: 'http://127.0.0.1:45456',
        reuseExistingServer: false,
        timeout: 120_000,
      },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
  ],
});
