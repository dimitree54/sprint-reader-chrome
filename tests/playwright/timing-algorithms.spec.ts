import { expect, test } from './fixtures';
import { DEFAULTS } from '../../src/config/defaults';

type BackgroundContext = {
  openReaderWindowSetup: (
    text: string,
    haveSelection: boolean,
    directionRTL: boolean,
  ) => Promise<void>;
};

test.describe('Sprint Reader - Timing Algorithms', () => {
  test('timing algorithms show different durations for different words', async ({ page, context, extensionId, background }) => {
    await page.goto('https://example.com');

    const testText = 'I have supercalifragilisticexpialidocious, words! This... is a test.';

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

    const timingInfo = await readerPage.evaluate(() => {
      const wordElement = document.getElementById('word');
      if (!wordElement) return null;

      const state = (window as any).state || (globalThis as any).state;
      if (!state || !state.wordItems) return null;

      return state.wordItems.map((item: any, index: number) => ({
        text: item.text,
        duration: item.duration,
        postdelay: item.postdelay,
        wordLength: item.wordLength,
        index
      }));
    });

    expect(timingInfo).not.toBeNull();
    expect(Array.isArray(timingInfo)).toBe(true);
    expect(timingInfo!.length).toBeGreaterThan(0);

    const words = timingInfo!;
    const shortWords = words.filter((w: any) => w.wordLength <= 3);
    const longWords = words.filter((w: any) => w.wordLength >= 10);
    const wordsWithPunctuation = words.filter((w: any) => /[.!?]/.test(w.text));

    if (shortWords.length > 0 && longWords.length > 0) {
      const avgShortDuration = shortWords.reduce((sum: any, w: any) => sum + w.duration, 0) / shortWords.length;
      const avgLongDuration = longWords.reduce((sum: any, w: any) => sum + w.duration, 0) / longWords.length;

      expect(avgLongDuration).toBeGreaterThan(avgShortDuration * 0.9);
    }

    if (wordsWithPunctuation.length > 0) {
      const punctuatedWord = wordsWithPunctuation[0];
      expect(punctuatedWord.postdelay).toBeGreaterThan(0);
    }

    await readerPage.close();
  });

  test('short words are grouped together when chunk size is greater than 1', async ({ page, context, extensionId, background }) => {
    await page.goto('https://example.com');

    const testText = 'I am a big cat in the box. The quick brown fox jumps over the lazy dog.';

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

    const chunkingInfo = await readerPage.evaluate(() => {
      const state = (window as any).state || (globalThis as any).state;
      if (!state || !state.wordItems) return null;

      return state.wordItems.map((item: any, index: number) => ({
        text: item.text,
        originalText: item.originalText,
        wordsInChunk: item.wordsInChunk,
        isGrouped: item.isGrouped,
        wordLength: item.wordLength,
        index
      }));
    });

    expect(chunkingInfo).not.toBeNull();
    expect(Array.isArray(chunkingInfo)).toBe(true);
    expect(chunkingInfo!.length).toBeGreaterThan(0);

    const chunks = chunkingInfo!;

    // Find grouped chunks (should contain multiple short words)
    const groupedChunks = chunks.filter((chunk: any) => chunk.isGrouped);
    expect(groupedChunks.length).toBeGreaterThan(0);

    // Verify grouped chunks contain multiple words
    groupedChunks.forEach((chunk: any) => {
      expect(chunk.wordsInChunk).toBeGreaterThan(1);
      expect(chunk.wordsInChunk).toBeLessThanOrEqual(DEFAULTS.READER_PREFERENCES.chunkSize);

      // Verify the text contains spaces (multiple words)
      expect(chunk.text).toMatch(/\s/);

      // Verify individual words in the group follow chunking rules
      const wordsInGroup = chunk.originalText.split(' ');
      wordsInGroup.forEach((word: any, index: number) => {
        if (index > 0) {
          // Additional words in chunk must be ≤3 characters for grouping
          expect(word.length).toBeLessThanOrEqual(DEFAULTS.WORD_PROCESSING.maxWordLengthForGrouping);
          // Additional words should not contain punctuation that breaks grouping
          expect(word).not.toMatch(/[.!?]/);
        }
        // No words should contain line breaks
        expect(word).not.toMatch(/\n/);
      });
    });

    // Verify that chunks containing individual long words are not grouped
    const groupedChunksWithLongWords = chunks.filter((chunk: any) => {
      if (!chunk.isGrouped) return false;
      const words = chunk.originalText.split(' ');
      return words.some((word: string) => word.length > 3);
    });
    expect(groupedChunksWithLongWords.length).toBe(0);

    // Verify that single long words (not grouped) have expected properties
    const singleLongWordChunks = chunks.filter((chunk: any) => !chunk.isGrouped && chunk.wordLength > 3);
    singleLongWordChunks.forEach((chunk: any) => {
      expect(chunk.wordsInChunk).toBe(1);
      expect(chunk.isGrouped).toBe(false);
    });

    // Verify that words with punctuation break grouping
    const punctuatedChunks = chunks.filter((chunk: any) => /[.!?]/.test(chunk.text));
    punctuatedChunks.forEach((chunk: any) => {
      if (chunk.wordLength <= 3) {
        // Short words with punctuation should not be grouped with following words
        expect(chunk.wordsInChunk).toBe(1);
      }
    });

    await readerPage.close();
  });
});