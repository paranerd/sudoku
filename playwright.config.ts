import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 30000,
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:4173/sudoku/', browserName: 'chromium', headless: true },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' }, grep: /responsive layout|completion|highscore|mobile 4|update/ },
  ],
  webServer: { command: 'BASE_PATH=/sudoku/ npm run preview -- --port 4173', url: 'http://127.0.0.1:4173/sudoku/', reuseExistingServer: true },
});
