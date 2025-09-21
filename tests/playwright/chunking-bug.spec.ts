import { expect, test } from './fixtures';

type BackgroundContext = {
  openReaderWindowSetup: (
    saveToLocal: boolean,
    text: string,
    haveSelection: boolean,
    directionRTL: boolean,
  ) => Promise<void>;
};

test.describe('Sprint Reader - Chunking Bug', () => {
  test('debug "The cat is on the mat" chunking issue', async ({ page, context, extensionId, background }) => {
    await page.goto('https://example.com');

    const testText = 'The cat is on the mat';

    const readerPagePromise = context.waitForEvent('page', {
      predicate: (p) => p.url().startsWith(`chrome-extension://${extensionId}/pages/reader.html`),
      timeout: 10_000,
    });

    await background.evaluate(
      async ({ selection }) => {
        const scope = self as unknown as BackgroundContext;
        await scope.openReaderWindowSetup(false, selection, true, false);
      },
      { selection: testText },
    );

    const readerPage = await readerPagePromise;
    await readerPage.waitForLoadState('domcontentloaded');
    await readerPage.bringToFront();

    const wordLocator = readerPage.locator('#word');
    await expect(wordLocator).not.toHaveText('', { timeout: 10_000 });

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

    console.log('--- DEBUGGING "The cat is on the mat" ---');
    console.log('Original words:', chunkingDetails!.originalWords);
    console.log('Chunk size:', chunkingDetails!.chunkSize);
    console.log('Word items:');
    chunkingDetails!.wordItems.forEach((item, index) => {
      console.log(`  [${index}] "${item.text}" - grouped: ${item.isGrouped}, count: ${item.wordsInChunk}, length: ${item.wordLength}`);
    });

    // Let's see what we actually get vs what we expect
    // Words: ["The", "cat", "is", "on", "the", "mat"]
    // Expected with chunk size 3:
    // - "The cat is" (3 words, all ≤3 chars)
    // - "on" (1 word, ≤3 chars but can't group with next because...)
    // - "the mat" (2 words, both ≤3 chars)

    // But algorithm starts with first word, so:
    // - "The" (start) + "cat" (≤3) + "is" (≤3) = "The cat is"
    // - "on" (start) + "the" (≤3) + "mat" (≤3) = "on the mat"

    const actualChunks = chunkingDetails!.wordItems.map(item => item.text);
    console.log('Actual chunks:', actualChunks);

    // This should help us understand what's really happening
    await readerPage.close();
  });

  test('test first word length restriction issue', async ({ page, context, extensionId, background }) => {
    await page.goto('https://example.com');

    // Test case where first word is long
    const testText = 'Long cat is on the mat';

    const readerPagePromise = context.waitForEvent('page', {
      predicate: (p) => p.url().startsWith(`chrome-extension://${extensionId}/pages/reader.html`),
      timeout: 10_000,
    });

    await background.evaluate(
      async ({ selection }) => {
        const scope = self as unknown as BackgroundContext;
        await scope.openReaderWindowSetup(false, selection, true, false);
      },
      { selection: testText },
    );

    const readerPage = await readerPagePromise;
    await readerPage.waitForLoadState('domcontentloaded');
    await readerPage.bringToFront();

    const wordLocator = readerPage.locator('#word');
    await expect(wordLocator).not.toHaveText('', { timeout: 10_000 });

    const chunkingDetails = await readerPage.evaluate(() => {
      const state = (window as any).state || (globalThis as any).state;
      if (!state || !state.wordItems) return null;

      return {
        originalWords: state.words,
        wordItems: state.wordItems.map((item: any) => ({
          text: item.text,
          isGrouped: item.isGrouped,
          wordsInChunk: item.wordsInChunk
        }))
      };
    });

    console.log('--- DEBUGGING FIRST WORD LENGTH ISSUE ---');
    console.log('Original words:', chunkingDetails!.originalWords);
    chunkingDetails!.wordItems.forEach((item, index) => {
      console.log(`  [${index}] "${item.text}" - grouped: ${item.isGrouped}, count: ${item.wordsInChunk}`);
    });

    // The problem might be that "Long" (4 chars) gets grouped with "cat is"
    // even though "Long" itself is > 3 characters, which seems wrong

    const firstChunk = chunkingDetails!.wordItems[0];
    if (firstChunk.text === 'Long cat is') {
      // This would be a bug - first word > 3 chars shouldn't group
      console.log('BUG FOUND: Long first word is being grouped!');
      throw new Error('First word longer than 3 characters should not be grouped with following words');
    }

    await readerPage.close();
  });
});