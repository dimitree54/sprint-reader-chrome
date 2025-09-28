import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

type BackgroundContext = {
  openReaderWindowSetup: (
    text: string,
    haveSelection: boolean,
    directionRTL: boolean,
  ) => Promise<void>;
};

async function waitForTokens (readerPage: Page): Promise<string | null> {
  await readerPage.waitForFunction(() => {
    const store = (window as any).readerStore;
    const state = store?.getState?.();
    return !!state && Array.isArray(state.tokens) && state.tokens.length > 0;
  });

  return readerPage.evaluate(() => {
    const store = (window as any).readerStore;
    if (!store) return null;
    const state = store.getState();
    if (!state.tokens || state.tokens.length === 0) return null;
    return state.tokens.map((w: any) => w.text).join(' ');
  });
}

test.describe('Sprint Reader - Text Selection and Popup', () => {
  test('handles multiple text selections and popup input correctly', async ({ page, context, extensionId, background }) => {
    // Create a test page with multiple text sections
    await page.goto('data:text/html,<html><body><p id="text1">First selection text for testing purposes</p><p id="text2">Second different text content for verification</p></body></html>');

    // First selection: Select and open reader with first text
    const firstText = 'First selection text for testing purposes';

    // Select the first text
    await page.locator('#text1').click();
    await page.locator('#text1').selectText();

    // Get the actual selected text to verify it matches
    const selectedText1 = await page.evaluate(() => window.getSelection()?.toString() || '');
    expect(selectedText1).toBe(firstText);

    // Open reader with first selection
    let readerPagePromise = context.waitForEvent('page', {
      predicate: (p) => p.url().startsWith(`chrome-extension://${extensionId}/pages/reader.html`),
      timeout: 10_000,
    });

    await background.evaluate(
      async ({ selection }) => {
        const scope = self as unknown as BackgroundContext;
        await scope.openReaderWindowSetup(selection, true, false);
      },
      { selection: firstText },
    );

    let readerPage = await readerPagePromise;
    await readerPage.waitForLoadState('domcontentloaded');
    await readerPage.bringToFront();

    // Verify first text is loaded in reader
    const wordLocator1 = readerPage.locator('#word');
    await expect(wordLocator1).not.toHaveText('', { timeout: 10_000 });

    const firstReaderText = await waitForTokens(readerPage);
    expect(firstReaderText).toBe(firstText);

    // Close the reader
    await readerPage.close();

    // Second selection: Select different text and open reader
    const secondText = 'Second different text content for verification';

    // Select the second text
    await page.locator('#text2').click();
    await page.locator('#text2').selectText();

    // Verify selection
    const selectedText2 = await page.evaluate(() => window.getSelection()?.toString() || '');
    expect(selectedText2).toBe(secondText);

    // Open reader with second selection
    readerPagePromise = context.waitForEvent('page', {
      predicate: (p) => p.url().startsWith(`chrome-extension://${extensionId}/pages/reader.html`),
      timeout: 10_000,
    });

    await background.evaluate(
      async ({ selection }) => {
        const scope = self as unknown as BackgroundContext;
        await scope.openReaderWindowSetup(selection, true, false);
      },
      { selection: secondText },
    );

    readerPage = await readerPagePromise;
    await readerPage.waitForLoadState('domcontentloaded');
    await readerPage.bringToFront();

    // Verify second text is loaded in reader
    const wordLocator2 = readerPage.locator('#word');
    await expect(wordLocator2).not.toHaveText('', { timeout: 10_000 });

    const secondReaderText = await waitForTokens(readerPage);
    expect(secondReaderText).toBe(secondText);

    // Close the reader
    await readerPage.close();

    // Third test: Simulate popup functionality by sending message directly to background
    const thirdText = 'Third unique custom text entered via popup interface';

    // Wait for reader to open from popup message
    readerPagePromise = context.waitForEvent('page', {
      predicate: (p) => p.url().startsWith(`chrome-extension://${extensionId}/pages/reader.html`),
      timeout: 10_000,
    });

    // Simulate popup sending message to background script
    await background.evaluate(
      async ({ text }) => {
        const scope = self as unknown as BackgroundContext;
        // Simulate the popup's openReaderFromPopup message by directly calling the setup
        await scope.openReaderWindowSetup(text, true, false);
      },
      { text: thirdText },
    );

    readerPage = await readerPagePromise;
    await readerPage.waitForLoadState('domcontentloaded');
    await readerPage.bringToFront();

    // Verify third text is loaded in reader
    const wordLocator3 = readerPage.locator('#word');
    await expect(wordLocator3).not.toHaveText('', { timeout: 10_000 });

    const thirdReaderText = await waitForTokens(readerPage);
    expect(thirdReaderText).toBe(thirdText);

    // Verify that each text was different
    expect(firstReaderText).not.toBe(secondReaderText);
    expect(secondReaderText).not.toBe(thirdReaderText);
    expect(firstReaderText).not.toBe(thirdReaderText);

    // Clean up
    await readerPage.close();
  });
});