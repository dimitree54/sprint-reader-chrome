import { expect, test } from './fixtures';

type BackgroundContext = {
  openReaderWindowSetup: (
    saveToLocal: boolean,
    text: string,
    haveSelection: boolean,
    directionRTL: boolean,
  ) => Promise<void>;
};

test.describe('Sprint Reader - UI Positioning', () => {
  test('highlighted letter is positioned in the center of the viewport', async ({ page, context, extensionId, background }) => {
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
        await scope.openReaderWindowSetup(true, selection, true, false);
      },
      { selection: selectionText },
    );

    const readerPage = await readerPagePromise;
    await readerPage.waitForLoadState('domcontentloaded');
    await readerPage.bringToFront();

    const wordLocator = readerPage.locator('#word');
    await expect(wordLocator).not.toHaveText('', { timeout: 10_000 });

    for (let i = 0; i < 3; i++) {
      await readerPage.waitForTimeout(100);

      const hasSpans = await readerPage.evaluate(() => {
        const wordElement = document.getElementById('word');
        return wordElement?.querySelectorAll('span[class^="char"]').length > 0;
      });
      expect(hasSpans).toBe(true);

      const letterInfo = await readerPage.evaluate(() => {
        const wordElement = document.getElementById('word');
        if (!wordElement) return null;

        const charSpans = Array.from(wordElement.querySelectorAll('span[class^="char"]'));
        if (charSpans.length === 0) return null;

        const highlightedSpan = charSpans.find(span => {
          const style = getComputedStyle(span as HTMLElement);
          return style.color === 'rgb(255, 140, 0)';
        });

        if (!highlightedSpan) return null;

        const viewportWidth = window.innerWidth;
        const viewportCenterX = viewportWidth / 2;

        const letterRect = highlightedSpan.getBoundingClientRect();
        const letterCenterX = letterRect.left + letterRect.width / 2;

        return {
          viewportCenterX,
          letterCenterX,
          difference: Math.abs(viewportCenterX - letterCenterX),
          letterText: (highlightedSpan as HTMLElement).textContent,
          viewportWidth,
          letterRect: {
            left: letterRect.left,
            width: letterRect.width,
          }
        };
      });

      expect(letterInfo).not.toBeNull();
      expect(letterInfo!.difference).toBeLessThan(2);

      const playButton = readerPage.locator('#btnPlay');
      const buttonText = await playButton.textContent();

      if (buttonText?.toLowerCase().includes('play')) {
        await playButton.click();
        await readerPage.waitForTimeout(200);
        await playButton.click();
      } else {
        await readerPage.waitForTimeout(200);
        await playButton.click();
      }
    }

    await readerPage.close();
  });
});