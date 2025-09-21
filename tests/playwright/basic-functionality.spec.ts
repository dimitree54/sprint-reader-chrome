import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

type BackgroundContext = {
  openReaderWindowSetup: (
    text: string,
    haveSelection: boolean,
    directionRTL: boolean,
  ) => Promise<void>;
};

async function waitForReaderToStart(readerPage: Page) {
  const wordLocator = readerPage.locator('#word');
  await expect(wordLocator).not.toHaveText('', { timeout: 10_000 });
  const initialWord = (await wordLocator.textContent())?.trim() ?? '';
  await readerPage.locator('#btnPlay').click();
  await expect(readerPage.locator('#btnPlay')).toHaveText(/Pause/i);
  await expect.poll(async () => (await wordLocator.textContent())?.trim() ?? '')
    .not.toBe(initialWord);
}

test.describe('Sprint Reader - Basic Functionality', () => {
  test('opens the reader after simulating the keyboard command flow', async ({ page, context, extensionId, background }) => {
    await page.goto('https://example.com');

    const paragraph = page.locator('p').first();
    await paragraph.waitFor();

    await paragraph.click({ clickCount: 3 });
    await page.waitForTimeout(300);

    const selectionText = (await page.evaluate(() => window.getSelection()?.toString() ?? '')).trim();
    expect(selectionText.length).toBeGreaterThan(0);

    const readerPagePromise = context.waitForEvent('page', {
      predicate: (p) => p.url().startsWith(`chrome-extension://${extensionId}/pages/reader.html`),
      timeout: 10_000,
    });

    await background.evaluate(
      async ({ selection }) => {
        const scope = self as unknown as {
          receiveMessage: (
            message: {
              target: string;
              type: string;
              selectedText: string;
              haveSelection: boolean;
              dirRTL: boolean;
            },
            sender?: unknown,
            sendResponse?: (value?: unknown) => void,
          ) => boolean;
          openReaderWindowSetup: (
            text: string,
            haveSelection: boolean,
            directionRTL: boolean,
          ) => Promise<void>;
        };

        scope.receiveMessage(
          {
            target: 'background',
            type: 'getSelection',
            selectedText: selection,
            haveSelection: selection.length > 0,
            dirRTL: false,
          },
          undefined,
          () => undefined,
        );

        await scope.openReaderWindowSetup( selection, true, false);
      },
      { selection: selectionText },
    );

    const readerPage = await readerPagePromise;
    await readerPage.waitForLoadState('domcontentloaded');
    await readerPage.bringToFront();

    await waitForReaderToStart(readerPage);

    await readerPage.close();
  });

  test('opens the reader via simulated context menu action and starts playback', async ({ page, context, extensionId, background }) => {
    await page.goto('https://example.com');

    const paragraph = page.locator('p').first();
    await paragraph.waitFor();

    await paragraph.click({ clickCount: 3 });
    await page.waitForTimeout(200);

    const selectionText = (await page.evaluate(() => window.getSelection()?.toString() ?? '')).trim();
    expect(selectionText.length).toBeGreaterThan(0);

    const readerPagePromise = context.waitForEvent('page', {
      predicate: (p) => p.url().startsWith(`chrome-extension://${extensionId}/pages/reader.html`),
      timeout: 10_000,
    });

    await background.evaluate(
      async ({ selection }: { selection: string }) => {
        const scope = self as unknown as BackgroundContext;
        if (typeof scope.openReaderWindowSetup !== 'function') {
          throw new Error('openReaderWindowSetup is not available on the background worker');
        }

        await scope.openReaderWindowSetup( selection, true, false);
      },
      { selection: selectionText },
    );

    const readerPage = await readerPagePromise;
    await readerPage.waitForLoadState('domcontentloaded');
    await readerPage.bringToFront();

    await waitForReaderToStart(readerPage);

    await readerPage.close();
  });
});