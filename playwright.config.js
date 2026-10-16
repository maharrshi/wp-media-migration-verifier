import { defineConfig, devices } from '@playwright/test';
import os from 'os';

export default defineConfig({
  timeout: 30000,

  // Use multiple workers for parallel execution
  // Default to 75% of CPU cores, or set via CLI: --workers=N
  workers: process.env.CI ? 2 : Math.max(1, Math.floor(os.cpus().length * 0.75)),

  // Enable full parallel mode - tests run in parallel across workers
  fullyParallel: true,

  // Retry failed tests once to handle flaky network issues
  retries: 1,

  // Global setup to initialize results file before any workers start
  globalSetup: './src/global-setup.js',

  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // Add timeout for actions
    actionTimeout: 10000,
  },

  reporter: [
    ['list'],
    ['html'],
    ['json', { outputFile: 'test-results.json' }]
  ],

});
