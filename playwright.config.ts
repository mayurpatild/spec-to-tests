import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'reports/html' }], ['json', { outputFile: 'reports/results.json' }]],
  use: { baseURL: process.env.API_URL ?? 'https://petstore3.swagger.io/api/v3', extraHTTPHeaders: { Accept: 'application/json' } },
});
