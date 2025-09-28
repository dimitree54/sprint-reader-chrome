import { expect, test } from './fixtures';

type BackgroundContext = {
  openReaderWindowSetup: (
    text: string,
    haveSelection: boolean,
    directionRTL: boolean,
  ) => Promise<void>;
};

test.describe('Sprint Reader - Popup Caching Bug', () => {
  test('popup text should not be cached from previous runs', async ({ page, context, extensionId, background }) => {
    // Step 1: Simulate previous selection being stored
    const cachedText = 'This is cached text from previous selection';

    // Create a test page and select text to cache it
    await page.goto('data:text/html,<html><body><p id="cached">This is cached text from previous selection</p></body></html>');

    // Select and store the cached text
    await page.locator('#cached').click();
    await page.locator('#cached').selectText();

    // Open reader with cached text to establish cached state
    let readerPagePromise = context.waitForEvent('page', {
      predicate: (p) => p.url().startsWith(`chrome-extension://${extensionId}/pages/reader.html`),
      timeout: 10_000,
    });

    await background.evaluate(
      async ({ selection }) => {
        const scope = self as unknown as BackgroundContext;
        await scope.openReaderWindowSetup(selection, true, false);
      },
      { selection: cachedText },
    );

    let readerPage = await readerPagePromise;
    await readerPage.waitForLoadState('domcontentloaded');
    await readerPage.bringToFront();

    // Verify cached text is loaded
    const wordLocator = readerPage.locator('#word');
    await expect(wordLocator).not.toHaveText('', { timeout: 10_000 });

    // Ensure tokens are populated in store
    await readerPage.waitForFunction(() => {
      const store = (window as any).readerStore;
      const state = store?.getState?.();
      return !!state && Array.isArray(state.tokens) && state.tokens.length > 0;
    });

    const cachedReaderText = await readerPage.evaluate(() => {
      const store = (window as any).readerStore;
      if (!store) return null;
      const state = store.getState();
      if (!state.tokens || state.tokens.length === 0) return null;
      return state.tokens.map((w: any) => w.text).join(' ');
    });

    expect(cachedReaderText).toBe(cachedText);

    // Close the reader
    await readerPage.close();

    // Step 2: Now simulate popup input with new text
    const popupText = 'I am a super hero';

    // Wait for reader to open from popup
    readerPagePromise = context.waitForEvent('page', {
      predicate: (p) => p.url().startsWith(`chrome-extension://${extensionId}/pages/reader.html`),
      timeout: 10_000,
    });

    // Simulate popup sending message to background script
    // This should use the popup text, NOT the cached selection
    // Note: popup uses saveToLocal: false, which is the source of the bug
    await background.evaluate(
      async ({ text }) => {
        const scope = self as unknown as BackgroundContext;
        // Simulate the popup's openReaderFromPopup message with saveToLocal: false
        await scope.openReaderWindowSetup(text, true, false);
      },
      { text: popupText },
    );

    readerPage = await readerPagePromise;
    await readerPage.waitForLoadState('domcontentloaded');
    await readerPage.bringToFront();

    // Verify popup text is loaded (NOT cached text)
    const wordLocator2 = readerPage.locator('#word');
    await expect(wordLocator2).not.toHaveText('', { timeout: 10_000 });

    // Ensure tokens are populated in store
    await readerPage.waitForFunction(() => {
      const store = (window as any).readerStore;
      const state = store?.getState?.();
      return !!state && Array.isArray(state.tokens) && state.tokens.length > 0;
    });

    const actualReaderText = await readerPage.evaluate(() => {
      const store = (window as any).readerStore;
      if (!store) return null;
      const state = store.getState();
      if (!state.tokens || state.tokens.length === 0) return null;
      return state.tokens.map((w: any) => w.text).join(' ');
    });

    // This should pass - popup text should be used, not cached text
    expect(actualReaderText).toBe(popupText);
    expect(actualReaderText).not.toBe(cachedText);

    // Clean up
    await readerPage.close();
  });

  test('popup text should override cached selection every time', async ({ context, extensionId, background }) => {
    // Test multiple popup inputs to ensure no caching happens
    const testTexts = [
      'First popup text input',
      'Second popup text input',
      'Third popup text input'
    ];

    for (let i = 0; i < testTexts.length; i++) {
      const currentText = testTexts[i];

      // Open reader with popup text
      const readerPagePromise = context.waitForEvent('page', {
        predicate: (p) => p.url().startsWith(`chrome-extension://${extensionId}/pages/reader.html`),
        timeout: 10_000,
      });

      await background.evaluate(
        async ({ text }) => {
          const scope = self as unknown as BackgroundContext;
          // Use saveToLocal: false like the real popup does
          await scope.openReaderWindowSetup(text, true, false);
        },
        { text: currentText },
      );

      const readerPage = await readerPagePromise;
      await readerPage.waitForLoadState('domcontentloaded');
      await readerPage.bringToFront();

      // Verify correct text is loaded
      const wordLocator = readerPage.locator('#word');
      await expect(wordLocator).not.toHaveText('', { timeout: 10_000 });

      const actualText = await readerPage.evaluate(() => {
        const store = (window as any).readerStore;
        if (!store) return null;
        const state = store.getState();
        if (!state.tokens || state.tokens.length === 0) return null;
        return state.tokens.map((w: any) => w.text).join(' ');
      });

      expect(actualText).toBe(currentText);

      // Verify it's different from previous texts
      if (i > 0) {
        expect(actualText).not.toBe(testTexts[i - 1]);
      }

      await readerPage.close();
    }
  });
});
