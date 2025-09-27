import { expect, test } from './fixtures';

type BackgroundContext = {
  openReaderWindowSetup: (
    text: string,
    haveSelection: boolean,
    directionRTL: boolean,
  ) => Promise<void>;
};

test.describe('Sprint Reader - Improved Word Grouping', () => {
  test('first word length restriction prevents inappropriate grouping', async ({ page, context, extensionId, background }) => {
    await page.goto('https://example.com');

    const testText = 'Long cat is on the mat';

    const readerPagePromise = context.waitForEvent('page', {
      predicate: (p) => p.url().startsWith(`chrome-extension://${extensionId}/pages/reader.html`),
      timeout: 10_000,
    });

    await background.evaluate(
      async ({ selection }) => {
        const scope = self as unknown as BackgroundContext;
        await scope.openReaderWindowSetup(selection, true, false);
      },
      { selection: testText },
    );

    const readerPage = await readerPagePromise;
    await readerPage.waitForLoadState('domcontentloaded');
    await readerPage.bringToFront();

    const wordLocator = readerPage.locator('#word');
    await expect(wordLocator).not.toHaveText('', { timeout: 10_000 });

    const chunks = await readerPage.evaluate(() => {
      const store = (window as any).readerStore;
      if (!store) return null;
      const state = store.getState();
      if (!state || !state.wordItems) return null;

      return state.wordItems.map((item: any) => ({
        text: item.text,
        isGrouped: item.isGrouped,
        wordsInChunk: item.wordsInChunk
      }));
    });

    expect(chunks).not.toBeNull();

    // "Long" should NOT be grouped (>3 characters)
    const firstChunk = chunks![0];
    expect(firstChunk.text).toBe('Long');
    expect(firstChunk.isGrouped).toBe(false);
    expect(firstChunk.wordsInChunk).toBe(1);

    // "cat is on" should be grouped (all ≤3 characters)
    const secondChunk = chunks![1];
    expect(secondChunk.text).toBe('cat is on');
    expect(secondChunk.isGrouped).toBe(true);
    expect(secondChunk.wordsInChunk).toBe(3);

    // "the mat" should be grouped (both ≤3 characters)
    const thirdChunk = chunks![2];
    expect(thirdChunk.text).toBe('the mat');
    expect(thirdChunk.isGrouped).toBe(true);
    expect(thirdChunk.wordsInChunk).toBe(2);

    await readerPage.close();
  });

  test('correct grouping behavior for various scenarios', async ({ page, context, extensionId, background }) => {
    const testCases = [
      {
        name: 'All short words',
        text: 'I am a big cat',
        expected: [
          { text: 'I am a', grouped: true, count: 3 },
          { text: 'big cat', grouped: true, count: 2 }
        ]
      },
      {
        name: 'Mixed short and long words',
        text: 'The wonderful cat is on the mat',
        expected: [
          { text: 'The', grouped: false, count: 1 },         // "wonderful" is long, so "The" can't group
          { text: 'wonderful', grouped: false, count: 1 },
          { text: 'cat is on', grouped: true, count: 3 },
          { text: 'the mat', grouped: true, count: 2 }
        ]
      },
      {
        name: 'All single characters',
        text: 'a b c d e f',
        expected: [
          { text: 'a b c', grouped: true, count: 3 },
          { text: 'd e f', grouped: true, count: 3 }
        ]
      },
      {
        name: 'Punctuation breaks grouping',
        text: 'I am a big. cat is on',
        expected: [
          { text: 'I am a', grouped: true, count: 3 },
          { text: 'big.', grouped: false, count: 1 },      // Punctuation prevents grouping
          { text: 'cat is on', grouped: true, count: 3 }
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
          await scope.openReaderWindowSetup(selection, true, false);
        },
        { selection: testCase.text },
      );

      const readerPage = await readerPagePromise;
      await readerPage.waitForLoadState('domcontentloaded');
      await readerPage.bringToFront();

      const wordLocator = readerPage.locator('#word');
      await expect(wordLocator).not.toHaveText('', { timeout: 10_000 });

      const chunks = await readerPage.evaluate(() => {
        const store = (window as any).readerStore;
        if (!store) return null;
        const state = store.getState();
        if (!state || !state.wordItems) return null;

        return state.wordItems.map((item: any) => ({
          text: item.text,
          isGrouped: item.isGrouped,
          wordsInChunk: item.wordsInChunk
        }));
      });

      expect(chunks).not.toBeNull();
      expect(chunks!.length).toBe(testCase.expected.length);

      testCase.expected.forEach((expected, index) => {
        const actual = chunks![index];
        expect(actual.text).toBe(expected.text);
        expect(actual.isGrouped).toBe(expected.grouped);
        expect(actual.wordsInChunk).toBe(expected.count);
      });

      await readerPage.close();
    }
  });
});
