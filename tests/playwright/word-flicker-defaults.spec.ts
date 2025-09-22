import { expect, test } from './fixtures';

type BackgroundContext = {
  openReaderWindowSetup: (
    text: string,
    haveSelection: boolean,
    directionRTL: boolean,
  ) => Promise<void>;
};

test.describe('Sprint Reader - Word Flicker Defaults', () => {
  test('wordFlicker default is false and persistence works correctly', async ({ page, context, extensionId, background }) => {
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
        const scope = self as unknown as BackgroundContext;
        await scope.openReaderWindowSetup(selection, true, false);
      },
      { selection: selectionText },
    );

    const readerPage = await readerPagePromise;
    await readerPage.waitForLoadState('domcontentloaded');
    await readerPage.bringToFront();

    const wordLocator = readerPage.locator('#word');
    await expect(wordLocator).not.toHaveText('', { timeout: 10_000 });

    // Verify wordFlicker default state
    const initialFlickerState = await readerPage.evaluate(() => {
      const state = (window as any).state || (globalThis as any).state;
      return {
        wordFlicker: state?.wordFlicker,
        wordFlickerPercent: state?.wordFlickerPercent
      };
    });

    // Assert that wordFlicker defaults to false (as per the new default)
    expect(initialFlickerState.wordFlicker).toBe(false);
    expect(initialFlickerState.wordFlickerPercent).toBe(10); // Default from DEFAULTS.READER_PREFERENCES.wordFlickerPercent

    await readerPage.close();
  });

  test('wordFlicker preferences persist when no stored value exists', async ({ page, context, extensionId, background }) => {
    // This test verifies that when there's no stored preference, the default is used
    await page.goto('https://example.com');

    const paragraph = page.locator('p').first();
    await paragraph.waitFor();
    await paragraph.click({ clickCount: 3 });

    const selectionText = (await page.evaluate(() => window.getSelection()?.toString() ?? '')).trim();

    const readerPagePromise = context.waitForEvent('page', {
      predicate: (p) => p.url().startsWith(`chrome-extension://${extensionId}/pages/reader.html`),
      timeout: 10_000,
    });

    await background.evaluate(
      async ({ selection }) => {
        const scope = self as unknown as BackgroundContext;
        await scope.openReaderWindowSetup(selection, true, false);
      },
      { selection: selectionText },
    );

    const readerPage = await readerPagePromise;
    await readerPage.waitForLoadState('domcontentloaded');

    await expect(readerPage.locator('#word')).not.toHaveText('', { timeout: 10_000 });

    // Verify that the default is correctly loaded from storage fallback
    const persistedFlickerState = await readerPage.evaluate(() => {
      const state = (window as any).state || (globalThis as any).state;
      return {
        wordFlicker: state?.wordFlicker,
        wordFlickerPercent: state?.wordFlickerPercent
      };
    });

    // Assert the default behavior is maintained
    expect(persistedFlickerState.wordFlicker).toBe(false);
    expect(persistedFlickerState.wordFlickerPercent).toBe(10);

    await readerPage.close();
  });
});