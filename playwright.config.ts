import { defineConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Lightweight .env loader (no external deps). Does not override existing envs.
(() => {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (const raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const idx = line.indexOf('=');
        if (idx === -1) continue;
        const key = line.slice(0, idx).trim();
        let value = line.slice(idx + 1).trim();
        // Strip matching surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          const unquoted = value.slice(1, -1);
          // Only accept if quotes match; otherwise keep original
          value = unquoted;
        }
        if (key && value && !(key in process.env)) {
          process.env[key] = value;
        }
      }
    }
  } catch {
    // ignore env load errors; tests will surface missing envs explicitly
  }
})();

export default defineConfig({
  testDir: './tests/playwright',
  timeout: 5_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    headless: false,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
  },
});
