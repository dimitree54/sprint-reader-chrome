import { expect, test } from './fixtures';
import { DEFAULTS } from '../../src/config/defaults';

type BackgroundContext = {
  openReaderWindowSetup: (
    text: string,
    haveSelection: boolean,
    directionRTL: boolean,
  ) => Promise<void>;
};

test.describe('Sprint Reader - Word Grouping Debug', () => {
  test('debug specific case: "I am a super hero" should group short words', async ({ page, context, extensionId, background }) => {
    await page.goto('https://example.com');

    const testText = 'I am a super hero';

    const readerPagePromise = context.waitForEvent('page', {
      predicate: (p) => p.url().startsWith(`chrome-extension://${extensionId}/pages/reader.html`),
      timeout: 10_000,
    });

    // Use saveToLocal: false to simulate popup behavior
    await background.evaluate(
      async ({ selection }) => {
        const scope = self as unknown as BackgroundContext;
        await scope.openReaderWindowSetup( selection, true, false);
      },
      { selection: testText },
    );

    const readerPage = await readerPagePromise;
    await readerPage.waitForLoadState('domcontentloaded');
    await readerPage.bringToFront();

    const wordLocator = readerPage.locator('#word');
    await expect(wordLocator).not.toHaveText('', { timeout: 10_000 });

    // Get detailed chunking information
    const chunkingDetails = await readerPage.evaluate(() => {
      const state = (window as any).state || (globalThis as any).state;
      if (!state || !state.wordItems) return null;

      return {
        originalWords: state.words,
        chunkSize: state.chunkSize,
        wordItems: state.wordItems.map((item: any, index: number) => ({
          text: item.text,
          originalText: item.originalText,
          wordsInChunk: item.wordsInChunk,
          isGrouped: item.isGrouped,
          wordLength: item.wordLength,
          index
        }))
      };
    });

    console.log('Chunking Details:', JSON.stringify(chunkingDetails, null, 2));

    expect(chunkingDetails).not.toBeNull();
    expect(chunkingDetails!.originalWords).toEqual(['I', 'am', 'a', 'super', 'hero']);
    expect(chunkingDetails!.chunkSize).toBe(DEFAULTS.READER_PREFERENCES.chunkSize);

    const wordItems = chunkingDetails!.wordItems;

    // Expected behavior: "I am a" should be grouped together
    const firstChunk = wordItems[0];
    expect(firstChunk.text).toBe('I am a');
    expect(firstChunk.isGrouped).toBe(true);
    expect(firstChunk.wordsInChunk).toBe(3);

    // "super" should be separate (>3 characters)
    const secondChunk = wordItems[1];
    expect(secondChunk.text).toBe('super');
    expect(secondChunk.isGrouped).toBe(false);
    expect(secondChunk.wordsInChunk).toBe(1);

    // "hero" should be separate (4 characters)
    const thirdChunk = wordItems[2];
    expect(thirdChunk.text).toBe('hero');
    expect(thirdChunk.isGrouped).toBe(false);
    expect(thirdChunk.wordsInChunk).toBe(1);

    await readerPage.close();
  });

  test('verify chunking logic with various word combinations', async ({ page, context, extensionId, background }) => {
    const testCases = [
      {
        text: 'I am a big cat',
        expectedChunks: [
          { text: 'I am a', grouped: true, count: 3 },
          { text: 'big cat', grouped: true, count: 2 }
        ]
      },
      {
        text: 'The cat is on the mat',
        expectedChunks: [
          { text: 'The cat is', grouped: true, count: 3 },
          { text: 'on the mat', grouped: true, count: 3 }
        ]
      },
      {
        text: 'a b c d e f',
        expectedChunks: [
          { text: 'a b c', grouped: true, count: 3 },
          { text: 'd e f', grouped: true, count: 3 }
        ]
      }
    ];

    for (const testCase of testCases) {
      await page.goto('https://example.com');

      const readerPagePromise = context.waitForEvent('page', {
        predicate: (p) => p.url().startsWith(`chrome-extension://${extensionId}/pages/reader.html`),
        timeout: 10_000,
      });

      await background.evaluate(
        async ({ selection }) => {
          const scope = self as unknown as BackgroundContext;
          await scope.openReaderWindowSetup( selection, true, false);
        },
        { selection: testCase.text },
      );

      const readerPage = await readerPagePromise;
      await readerPage.waitForLoadState('domcontentloaded');
      await readerPage.bringToFront();

      const wordLocator = readerPage.locator('#word');
      await expect(wordLocator).not.toHaveText('', { timeout: 10_000 });

      const chunks = await readerPage.evaluate(() => {
        const state = (window as any).state || (globalThis as any).state;
        if (!state || !state.wordItems) return null;

        return state.wordItems.map((item: any) => ({
          text: item.text,
          isGrouped: item.isGrouped,
          wordsInChunk: item.wordsInChunk
        }));
      });

      expect(chunks).not.toBeNull();
      expect(chunks!.length).toBe(testCase.expectedChunks.length);

      testCase.expectedChunks.forEach((expected, index) => {
        const actual = chunks![index];
        expect(actual.text).toBe(expected.text);
        expect(actual.isGrouped).toBe(expected.grouped);
        expect(actual.wordsInChunk).toBe(expected.count);
      });

      await readerPage.close();
    }
  });
});