import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 testDir: './tests',
 fullyParallel: true,
 use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
 // Build once, then preview the production bundle — faster and more reliable than Vite dev mode under CI.
 webServer: { command: 'npm run build && npm run preview -- --port 4173', url: 'http://127.0.0.1:4173', timeout: 180_000, reuseExistingServer: !process.env.CI, stdout: 'ignore', stderr: 'pipe' },
 timeout: 60_000,
 projects: [
  { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1100 } } },
  { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
 ],
});
