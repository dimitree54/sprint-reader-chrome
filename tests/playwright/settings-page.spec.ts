import { expect, test } from './fixtures';

test.describe('Sprint Reader - Settings Page', () => {
    test('should allow modifying and saving settings', async ({ page, context, extensionId }) => {
    test.setTimeout(30000);
    // 1. Open the settings page directly
    await page.goto(`chrome-extension://${extensionId}/pages/settings.html`);
    await page.waitForLoadState('domcontentloaded');

    // 2. Modify some settings
    const wpmSlider = page.locator('#wordsPerMinute');
    await wpmSlider.fill('450');

    const enableTranslationCheckbox = page.locator('#enableTranslation');
    await enableTranslationCheckbox.check();

    const targetLanguageSelect = page.locator('#targetLanguage');
    await targetLanguageSelect.selectOption('fr');

    const openaiApiKeyInput = page.locator('#openaiApiKey');
    await openaiApiKeyInput.fill('sk-test-key');

    // 3. Click the "Save" button
    const saveButton = page.locator('#saveSettings');
    await saveButton.click();

    // Wait for the status message to appear and disappear
    const statusMessage = page.locator('#settingsStatus');
    await expect(statusMessage).toBeVisible();
    await expect(statusMessage).toHaveText('Settings saved.');
    await expect(statusMessage).toBeHidden({ timeout: 5000 });

    // 4. Validate that the settings were actually saved
    const background = context.serviceWorkers()[0];
    const savedSettings = await background.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.local.get([
          'sprintReader.readerPrefs',
          'sprintReader.translationLanguage',
          'sprintReader.openaiApiKey',
        ], (result) => {
          resolve(result);
        });
      });
    }) as Record<string, any>;

    expect(savedSettings['sprintReader.readerPrefs'].wordsPerMinute).toBe(450);
    expect(savedSettings['sprintReader.translationLanguage']).toBe('fr');
    expect(savedSettings['sprintReader.openaiApiKey']).toBe('sk-test-key');
  });
});