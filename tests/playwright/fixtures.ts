import { test as base, chromium } from '@playwright/test';
import type { BrowserContext, Page, Worker } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const EXTENSION_PATH = path.resolve(__dirname, '../../dist/chrome');

async function createTempUserDataDir() {
  const prefix = path.join(os.tmpdir(), 'speed-reader-playwright-');
  return fs.mkdtemp(prefix);
}

type ExtensionFixtures = {
  context: BrowserContext;
  page: Page;
  extensionId: string;
  background: Worker;
};

export const test = base.extend<ExtensionFixtures>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use: (context: BrowserContext) => Promise<void>) => {
    const userDataDir = await createTempUserDataDir();

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      ignoreHTTPSErrors: true,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-features=TranslateUI,site-per-process',
        '--disable-component-extensions-with-background-pages',
        '--disable-background-networking',
        '--mute-audio',
      ],
    });

    try {
      await use(context);
    } finally {
      await context.close();
      await fs.rm(userDataDir, { recursive: true, force: true });
    }
  },

  page: async ({ context }, use: (page: Page) => Promise<void>) => {
    const page = await context.newPage();
    try {
      await use(page);
    } finally {
      await page.close();
    }
  },

  extensionId: async ({ context }, use: (extensionId: string) => Promise<void>) => {
    const parseExtensionId = (url: string) => {
      if (!url.startsWith('chrome-extension://')) return undefined;
      return new URL(url).host;
    };

    let extensionId: string | undefined;

    for (const page of context.pages()) {
      const id = parseExtensionId(page.url());
      if (id) {
        extensionId = id;
        break;
      }
    }

    if (!extensionId) {
      const page = await context.waitForEvent('page', {
        predicate: (p) => !!parseExtensionId(p.url()),
        timeout: 15_000,
      });
      extensionId = parseExtensionId(page.url());
    }

    if (!extensionId) {
      throw new Error('Unable to determine extension id');
    }

    for (const page of context.pages()) {
      if (page.url().startsWith(`chrome-extension://${extensionId}/`)) {
        await page.close();
      }
    }

    await use(extensionId);
  },

  background: async ({ context }, use: (worker: Worker) => Promise<void>) => {
    let [worker] = context.serviceWorkers();
    if (!worker) {
      worker = await context.waitForEvent('serviceworker', { timeout: 15_000 });
    }

    await use(worker);
  },
});

export const expect = base.expect;
