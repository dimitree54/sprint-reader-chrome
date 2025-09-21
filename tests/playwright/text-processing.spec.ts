import { expect, test } from './fixtures';

type BackgroundContext = {
  openReaderWindowSetup: (
    saveToLocal: boolean,
    text: string,
    haveSelection: boolean,
    directionRTL: boolean,
  ) => Promise<void>;
};

test.describe('Sprint Reader - Text Processing', () => {
  test('advanced text preprocessing and chunking work correctly', async ({ page, context, extensionId, background }) => {
    await page.goto('https://example.com');

    const testText = 'I saw NASA, F.B.I, and U.S.A in the 3.14 kilometers. The state-of-the-art supercalifragilisticexpialidocious technology was amazing!';

    const readerPagePromise = context.waitForEvent('page', {
      predicate: (p) => p.url().startsWith(`chrome-extension://${extensionId}/pages/reader.html`),
      timeout: 10_000,
    });

    await background.evaluate(
      async ({ selection }) => {
        const scope = self as unknown as BackgroundContext;
        await scope.openReaderWindowSetup(true, selection, true, false);
      },
      { selection: testText },
    );

    const readerPage = await readerPagePromise;
    await readerPage.waitForLoadState('domcontentloaded');
    await readerPage.bringToFront();

    const wordLocator = readerPage.locator('#word');
    await expect(wordLocator).not.toHaveText('', { timeout: 10_000 });

    const preprocessingInfo = await readerPage.evaluate(() => {
      const state = (window as any).state || (globalThis as any).state;
      if (!state || !state.wordItems) return null;

      return state.wordItems.map((item: any) => ({
        text: item.text,
        originalText: item.originalText,
        isGrouped: item.isGrouped,
        wordsInChunk: item.wordsInChunk,
        duration: item.duration
      }));
    });

    expect(preprocessingInfo).not.toBeNull();
    expect(Array.isArray(preprocessingInfo)).toBe(true);

    const items = preprocessingInfo!;

    const decimalNumber = items.find((item: any) => item.text === '3.14');
    expect(decimalNumber).toBeTruthy();

    const hyphenatedWord = items.find((item: any) => item.text === 'state-of-the-art');
    expect(hyphenatedWord).toBeTruthy();

    const originalLongWords = items.filter((item: any) => item.text.includes('supercali') || item.text.length > 15);
    expect(originalLongWords.length).toBeGreaterThan(0);

    await readerPage.close();
  });
});