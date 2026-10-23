// Browser smoke tests for the apps. The pages are single files opened from disk, so no web server is needed.
// Run: npm run test:e2e   (first time on a machine: npx playwright install chromium)
const { defineConfig, devices } = require('@playwright/test');

// A preinstalled Chromium can be used instead of a downloaded one (set PW_CHROMIUM_PATH to its executable).
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

module.exports = defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1400, height: 1000 },
    launchOptions: executablePath ? { executablePath, args: ['--no-sandbox'] } : {}
  }
});
