import { expect, test } from './fixtures';

test.describe('Sprint Reader - Settings Page', () => {
    test('should allow modifying and saving settings', async ({ page, extensionId, background }) => {
    test.setTimeout(30000);
    // 1. Open the settings page directly
    await page.goto(`chrome-extension://${extensionId}/pages/settings.html`);
    await page.waitForLoadState('domcontentloaded');

    // 2. Modify some settings
    const enableTranslationCheckbox = page.locator('#enableTranslation');
    await enableTranslationCheckbox.check();
    const statusMessage = page.locator('#settingsStatus');
    await expect(statusMessage).toHaveText('Settings saved.');

    const targetLanguageSelect = page.locator('#targetLanguage');
    await targetLanguageSelect.selectOption('fr');
    await expect(statusMessage).toHaveText('Settings saved.');

    const summarizationSlider = page.locator('#summarizationLevel');
    await summarizationSlider.evaluate((el, value) => {
      const input = el as HTMLInputElement;
      input.value = String(value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, 2);

    await expect(statusMessage).toHaveText('Settings saved.');
    await expect(statusMessage).toBeHidden({ timeout: 5000 });


    // Validate that the settings were actually saved
    const savedSettings = await background.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.local.get([
          'sprintReader.readerPrefs',
          'sprintReader.translationLanguage',
          'sprintReader.preprocessingEnabled',
          'sprintReader.summarizationLevel',
        ], (result) => {
          resolve(result);
        });
      });
    }) as Record<string, any>;

    expect(savedSettings['sprintReader.translationLanguage']).toBe('fr');
    expect(savedSettings['sprintReader.preprocessingEnabled']).toBe(true);
    expect(savedSettings['sprintReader.summarizationLevel']).toBe('aggressive');
  });
});
