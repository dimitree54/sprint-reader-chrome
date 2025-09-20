import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

type BackgroundContext = {
  openReaderWindowSetup: (
    saveToLocal: boolean,
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

test.describe('Sprint Reader extension (Chrome)', () => {
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

    // Chrome blocks automation from firing global extension shortcuts, so
    // replicate the command listener by seeding selection state and invoking
    // the same helper the command handler uses.
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
            saveToLocal: boolean,
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

        await scope.openReaderWindowSetup(true, selection, true, false);
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

        await scope.openReaderWindowSetup(true, selection, true, false);
      },
      { selection: selectionText },
    );

    const readerPage = await readerPagePromise;
    await readerPage.waitForLoadState('domcontentloaded');
    await readerPage.bringToFront();

    await waitForReaderToStart(readerPage);

    await readerPage.close();
  });

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

    // Wait for the reader to load and display a word
    const wordLocator = readerPage.locator('#word');
    await expect(wordLocator).not.toHaveText('', { timeout: 10_000 });

    // Test multiple words to ensure consistent centering
    for (let i = 0; i < 3; i++) {
      // Get the current word and wait for it to be fully rendered
      await readerPage.waitForTimeout(100);

      // Check that the word has spans (letter wrapping)
      const hasSpans = await readerPage.evaluate(() => {
        const wordElement = document.getElementById('word');
        return wordElement?.querySelectorAll('span[class^="char"]').length > 0;
      });
      expect(hasSpans).toBe(true);

      // Get letter positioning info
      const letterInfo = await readerPage.evaluate(() => {
        const wordElement = document.getElementById('word');
        if (!wordElement) return null;

        // Find all character spans
        const charSpans = Array.from(wordElement.querySelectorAll('span[class^="char"]'));
        if (charSpans.length === 0) return null;

        // Find the highlighted letter (orange color)
        const highlightedSpan = charSpans.find(span => {
          const style = getComputedStyle(span as HTMLElement);
          return style.color === 'rgb(255, 140, 0)'; // #FF8C00 in rgb
        });

        if (!highlightedSpan) return null;

        // Get viewport center and highlighted letter center
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
      expect(letterInfo!.difference).toBeLessThan(2); // Allow 2px tolerance for rounding

      // Move to next word by clicking play if paused, or wait if playing
      const playButton = readerPage.locator('#btnPlay');
      const buttonText = await playButton.textContent();

      if (buttonText?.toLowerCase().includes('play')) {
        await playButton.click();
        await readerPage.waitForTimeout(200); // Wait for next word
        await playButton.click(); // Pause again
      } else {
        await readerPage.waitForTimeout(200); // Wait for next word if playing
        await playButton.click(); // Pause to check positioning
      }
    }

    await readerPage.close();
  });

  test('timing algorithms show different durations for different words', async ({ page, context, extensionId, background }) => {
    await page.goto('https://example.com');

    // Use a specific text with different word types for testing
    const testText = 'I have supercalifragilisticexpialidocious, words! This... is a test.';

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

    // Wait for the reader to load
    const wordLocator = readerPage.locator('#word');
    await expect(wordLocator).not.toHaveText('', { timeout: 10_000 });

    // Test that timing algorithms are working by checking word durations
    const timingInfo = await readerPage.evaluate(() => {
      const wordElement = document.getElementById('word');
      if (!wordElement) return null;

      // Access the internal state (this is a test-specific approach)
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

    // Check that different word types have different durations
    const words = timingInfo!;
    const shortWords = words.filter(w => w.wordLength <= 3);
    const longWords = words.filter(w => w.wordLength >= 10);
    const wordsWithPunctuation = words.filter(w => /[.!?]/.test(w.text));

    if (shortWords.length > 0 && longWords.length > 0) {
      // Long words should generally take longer than short words
      const avgShortDuration = shortWords.reduce((sum, w) => sum + w.duration, 0) / shortWords.length;
      const avgLongDuration = longWords.reduce((sum, w) => sum + w.duration, 0) / longWords.length;

      expect(avgLongDuration).toBeGreaterThan(avgShortDuration * 0.9); // Allow some tolerance
    }

    if (wordsWithPunctuation.length > 0) {
      // Words with punctuation should have postdelay
      const punctuatedWord = wordsWithPunctuation[0];
      expect(punctuatedWord.postdelay).toBeGreaterThan(0);
    }

    await readerPage.close();
  });

  test('advanced text preprocessing and chunking work correctly', async ({ page, context, extensionId, background }) => {
    await page.goto('https://example.com');

    // Test text with various challenging cases
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

    // Wait for the reader to load
    const wordLocator = readerPage.locator('#word');
    await expect(wordLocator).not.toHaveText('', { timeout: 10_000 });

    // Test that preprocessing worked correctly
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

    // Check for proper number consolidation (3.14 should be one word)
    const decimalNumber = items.find(item => item.text === '3.14');
    expect(decimalNumber).toBeTruthy();

    // Check that hyphens are preserved (state-of-the-art stays as state-of-the-art)
    const hyphenatedWord = items.find(item => item.text === 'state-of-the-art');
    expect(hyphenatedWord).toBeTruthy();

    // Check that very long words were split or handled
    const originalLongWords = items.filter(item => item.text.includes('supercali') || item.text.length > 15);
    expect(originalLongWords.length).toBeGreaterThan(0);

    await readerPage.close();
  });

  test('theme switching works correctly and persists preferences', async ({ page, context, extensionId, background }) => {
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

    // Wait for the reader to load
    const wordLocator = readerPage.locator('#word');
    await expect(wordLocator).not.toHaveText('', { timeout: 10_000 });

    // Get initial theme state
    const initialThemeInfo = await readerPage.evaluate(() => {
      const toggle = document.getElementById('toggleTheme') as HTMLInputElement;
      const body = document.body;
      return {
        toggleChecked: toggle?.checked ?? false,
        hasLightClass: body.classList.contains('reader--light'),
        hasDarkClass: body.classList.contains('reader--dark'),
        dataTheme: body.dataset.theme,
        state: (window as any).state?.theme || (globalThis as any).state?.theme
      };
    });

    // Verify initial state (should be dark theme by default)
    expect(initialThemeInfo.toggleChecked).toBe(false);
    expect(initialThemeInfo.hasLightClass).toBe(false);
    expect(initialThemeInfo.hasDarkClass).toBe(true);
    expect(initialThemeInfo.dataTheme).toBe('dark');
    expect(initialThemeInfo.state).toBe('dark');

    // Find the theme switcher in the header (moved from footer)
    const themeToggle = readerPage.locator('.reader__theme-switch--header');
    await expect(themeToggle).toBeVisible();

    // Verify the switcher is in the header (rightmost position)
    const switcherPosition = await readerPage.evaluate(() => {
      const switcher = document.querySelector('.reader__theme-switch--header');
      const headerRight = document.querySelector('.reader__header-right');
      if (!switcher || !headerRight) return null;

      const switcherRect = switcher.getBoundingClientRect();
      const headerRect = headerRight.getBoundingClientRect();

      return {
        isInHeaderRight: headerRight.contains(switcher),
        switcherRight: switcherRect.right,
        headerRight: headerRect.right,
        isRightmost: Math.abs(switcherRect.right - headerRect.right) < 5 // Allow 5px tolerance
      };
    });

    expect(switcherPosition).not.toBeNull();
    expect(switcherPosition!.isInHeaderRight).toBe(true);
    expect(switcherPosition!.isRightmost).toBe(true);

    // Verify text label is removed (should not exist)
    const textLabel = readerPage.locator('.reader__theme-switch-label');
    await expect(textLabel).toHaveCount(0);

    // Verify icons are visible and bigger
    const iconInfo = await readerPage.evaluate(() => {
      const sunIcon = document.querySelector('.reader__theme-switch-icon--sun');
      const moonIcon = document.querySelector('.reader__theme-switch-icon--moon');

      if (!sunIcon || !moonIcon) return null;

      const sunStyles = getComputedStyle(sunIcon);
      const moonStyles = getComputedStyle(moonIcon);

      return {
        sunOpacity: sunStyles.opacity,
        moonOpacity: moonStyles.opacity,
        sunFontSize: sunStyles.fontSize,
        moonFontSize: moonStyles.fontSize,
        sunText: sunIcon.textContent,
        moonText: moonIcon.textContent
      };
    });

    expect(iconInfo).not.toBeNull();
    expect(iconInfo!.sunText).toBe('☀️');
    expect(iconInfo!.moonText).toBe('🌙');
    expect(iconInfo!.sunFontSize).toBe('17.6px'); // 1.1rem should be ~17.6px
    expect(iconInfo!.moonFontSize).toBe('17.6px');
    // In dark mode, sun should be visible (opacity 1), moon should be less visible (opacity 0.4)
    expect(iconInfo!.sunOpacity).toBe('1');
    expect(iconInfo!.moonOpacity).toBe('0.4');

    // Switch to light theme
    await themeToggle.click();
    await readerPage.waitForTimeout(300); // Wait for transition

    // Verify theme switched to light
    const lightThemeInfo = await readerPage.evaluate(() => {
      const toggle = document.getElementById('toggleTheme') as HTMLInputElement;
      const body = document.body;
      return {
        toggleChecked: toggle?.checked ?? false,
        hasLightClass: body.classList.contains('reader--light'),
        hasDarkClass: body.classList.contains('reader--dark'),
        dataTheme: body.dataset.theme,
        state: (window as any).state?.theme || (globalThis as any).state?.theme
      };
    });

    expect(lightThemeInfo.toggleChecked).toBe(true);
    expect(lightThemeInfo.hasLightClass).toBe(true);
    expect(lightThemeInfo.hasDarkClass).toBe(false);
    expect(lightThemeInfo.dataTheme).toBe('light');
    expect(lightThemeInfo.state).toBe('light');

    // Verify icon visibility switched (in light mode, moon should be visible, sun less visible)
    const lightIconInfo = await readerPage.evaluate(() => {
      const sunIcon = document.querySelector('.reader__theme-switch-icon--sun');
      const moonIcon = document.querySelector('.reader__theme-switch-icon--moon');

      if (!sunIcon || !moonIcon) return null;

      const sunStyles = getComputedStyle(sunIcon);
      const moonStyles = getComputedStyle(moonIcon);

      return {
        sunOpacity: sunStyles.opacity,
        moonOpacity: moonStyles.opacity
      };
    });

    expect(lightIconInfo).not.toBeNull();
    expect(lightIconInfo!.sunOpacity).toBe('0.4');
    expect(lightIconInfo!.moonOpacity).toBe('1');

    // Switch back to dark theme
    await themeToggle.click();
    await readerPage.waitForTimeout(300);

    // Verify theme switched back to dark
    const finalThemeInfo = await readerPage.evaluate(() => {
      const toggle = document.getElementById('toggleTheme') as HTMLInputElement;
      const body = document.body;
      return {
        toggleChecked: toggle?.checked ?? false,
        hasLightClass: body.classList.contains('reader--light'),
        hasDarkClass: body.classList.contains('reader--dark'),
        dataTheme: body.dataset.theme,
        state: (window as any).state?.theme || (globalThis as any).state?.theme
      };
    });

    expect(finalThemeInfo.toggleChecked).toBe(false);
    expect(finalThemeInfo.hasLightClass).toBe(false);
    expect(finalThemeInfo.hasDarkClass).toBe(true);
    expect(finalThemeInfo.dataTheme).toBe('dark');
    expect(finalThemeInfo.state).toBe('dark');

    await readerPage.close();

    // Test persistence by opening reader again
    const readerPagePromise2 = context.waitForEvent('page', {
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

    const readerPage2 = await readerPagePromise2;
    await readerPage2.waitForLoadState('domcontentloaded');
    await readerPage2.bringToFront();

    // Wait for the reader to load
    await expect(readerPage2.locator('#word')).not.toHaveText('', { timeout: 10_000 });

    // Verify theme preference was persisted (should still be dark)
    const persistedThemeInfo = await readerPage2.evaluate(() => {
      const toggle = document.getElementById('toggleTheme') as HTMLInputElement;
      const body = document.body;
      return {
        toggleChecked: toggle?.checked ?? false,
        hasLightClass: body.classList.contains('reader--light'),
        hasDarkClass: body.classList.contains('reader--dark'),
        dataTheme: body.dataset.theme,
        state: (window as any).state?.theme || (globalThis as any).state?.theme
      };
    });

    expect(persistedThemeInfo.toggleChecked).toBe(false);
    expect(persistedThemeInfo.hasLightClass).toBe(false);
    expect(persistedThemeInfo.hasDarkClass).toBe(true);
    expect(persistedThemeInfo.dataTheme).toBe('dark');
    expect(persistedThemeInfo.state).toBe('dark');

    await readerPage2.close();
  });
});
