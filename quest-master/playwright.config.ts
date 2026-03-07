import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load .env from the quest-master directory (ignored by git).
// Variables defined here are available as process.env.* in all tests.
dotenv.config();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,   // quests run sequentially — each test may depend on IRIS state
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npx ng serve',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
