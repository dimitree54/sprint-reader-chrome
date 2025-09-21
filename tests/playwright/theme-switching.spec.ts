import { expect, test } from './fixtures';

type BackgroundContext = {
  openReaderWindowSetup: (
    saveToLocal: boolean,
    text: string,
    haveSelection: boolean,
    directionRTL: boolean,
  ) => Promise<void>;
};

const THEME_CLASSES = {
  LIGHT: 'reader--light',
  DARK: 'reader--dark'
} as const;

test.describe('Sprint Reader - Theme Switching', () => {
  test('theme switching works correctly', async ({ page, context, extensionId, background }) => {
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

    const initialThemeInfo = await readerPage.evaluate((themeClasses) => {
      const toggle = document.getElementById('toggleTheme') as HTMLInputElement;
      const body = document.body;
      return {
        toggleChecked: toggle?.checked ?? false,
        hasLightClass: body.classList.contains(themeClasses.LIGHT),
        hasDarkClass: body.classList.contains(themeClasses.DARK),
        dataTheme: body.dataset.theme,
        state: (window as any).state?.theme || (globalThis as any).state?.theme
      };
    }, THEME_CLASSES);

    expect(initialThemeInfo.toggleChecked).toBe(false);
    expect(initialThemeInfo.hasLightClass).toBe(false);
    expect(initialThemeInfo.hasDarkClass).toBe(true);
    expect(initialThemeInfo.dataTheme).toBe('dark');
    expect(initialThemeInfo.state).toBe('dark');

    const themeToggle = readerPage.locator('.reader__theme-switch--header');
    await expect(themeToggle).toBeVisible();

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
        isRightmost: Math.abs(switcherRect.right - headerRect.right) < 5
      };
    });

    expect(switcherPosition).not.toBeNull();
    expect(switcherPosition!.isInHeaderRight).toBe(true);
    expect(switcherPosition!.isRightmost).toBe(true);

    const textLabel = readerPage.locator('.reader__theme-switch-label');
    await expect(textLabel).toHaveCount(0);

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
    expect(iconInfo!.sunFontSize).toBe('17.6px');
    expect(iconInfo!.moonFontSize).toBe('17.6px');
    expect(iconInfo!.sunOpacity).toBe('1');
    expect(iconInfo!.moonOpacity).toBe('0.4');

    await themeToggle.click();
    await readerPage.waitForTimeout(300);

    const lightThemeInfo = await readerPage.evaluate((themeClasses) => {
      const toggle = document.getElementById('toggleTheme') as HTMLInputElement;
      const body = document.body;
      return {
        toggleChecked: toggle?.checked ?? false,
        hasLightClass: body.classList.contains(themeClasses.LIGHT),
        hasDarkClass: body.classList.contains(themeClasses.DARK),
        dataTheme: body.dataset.theme,
        state: (window as any).state?.theme || (globalThis as any).state?.theme
      };
    }, THEME_CLASSES);

    expect(lightThemeInfo.toggleChecked).toBe(true);
    expect(lightThemeInfo.hasLightClass).toBe(true);
    expect(lightThemeInfo.hasDarkClass).toBe(false);
    expect(lightThemeInfo.dataTheme).toBe('light');
    expect(lightThemeInfo.state).toBe('light');

    await readerPage.close();
  });

  test('theme preferences persist across sessions', async ({ page, context, extensionId, background }) => {
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
        await scope.openReaderWindowSetup(true, selection, true, false);
      },
      { selection: selectionText },
    );

    const readerPage = await readerPagePromise;
    await readerPage.waitForLoadState('domcontentloaded');

    await expect(readerPage.locator('#word')).not.toHaveText('', { timeout: 10_000 });

    const persistedThemeInfo = await readerPage.evaluate((themeClasses) => {
      const toggle = document.getElementById('toggleTheme') as HTMLInputElement;
      const body = document.body;
      return {
        toggleChecked: toggle?.checked ?? false,
        hasLightClass: body.classList.contains(themeClasses.LIGHT),
        hasDarkClass: body.classList.contains(themeClasses.DARK),
        dataTheme: body.dataset.theme,
        state: (window as any).state?.theme || (globalThis as any).state?.theme
      };
    }, THEME_CLASSES);

    expect(persistedThemeInfo.toggleChecked).toBe(false);
    expect(persistedThemeInfo.hasLightClass).toBe(false);
    expect(persistedThemeInfo.hasDarkClass).toBe(true);
    expect(persistedThemeInfo.dataTheme).toBe('dark');
    expect(persistedThemeInfo.state).toBe('dark');

    await readerPage.close();
  });
});