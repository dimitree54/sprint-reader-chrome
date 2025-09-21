import { expect, test } from './fixtures';

type BackgroundContext = {
  openReaderWindowSetup: (
    text: string,
    haveSelection: boolean,
    directionRTL: boolean,
  ) => Promise<void>;
};


test.describe('Sprint Reader - OpenAI Integration', () => {
  test.beforeEach(async ({ background }) => {
    // Set up OpenAI settings for Russian language with aggressive summarization
    await background.evaluate(() => {
      // Set Russian language and aggressive summarization using chrome.storage API
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({
          'sprintReader.translationLanguage': 'ru',
          'sprintReader.summarizationLevel': 'aggressive'
        });
      }
    });
  });

  test('tests Russian translation with aggressive summarization using OpenAI API', async ({ page, context, extensionId, background }) => {
    // Set up environment variable for OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set. Please set it to run this test.');
    }

    // Configure API key in extension storage
    await background.evaluate(({ apiKey }) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({
          'sprintReader.openaiApiKey': apiKey
        });
      }
    }, { apiKey: openaiApiKey });

    // Navigate to example.com
    await page.goto('https://example.com');
    const paragraph = page.locator('p').first();
    await paragraph.waitFor();

    // Select text for reading
    await paragraph.click({ clickCount: 3 });
    await page.waitForTimeout(300);

    const selectionText = (await page.evaluate(() => window.getSelection()?.toString() ?? '')).trim();
    expect(selectionText.length).toBeGreaterThan(0);

    // Set up network interception to monitor OpenAI API calls
    const apiCalls: Array<{ url: string; method: string; headers: Record<string, string> }> = [];
    const apiResponses: Array<{ status: number; statusText: string }> = [];

    await context.route('https://api.openai.com/**', async (route) => {
      const request = route.request();
      apiCalls.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });

      const response = await route.fetch();
      const responseStatus = response.status();
      const responseStatusText = response.statusText();
      const responseBody = await response.text();

      apiResponses.push({
        status: responseStatus,
        statusText: responseStatusText
      });

      console.log('API Response:', {
        status: responseStatus,
        statusText: responseStatusText,
        body: responseBody
      });

      await route.fulfill({ response });
    });

    const readerPagePromise = context.waitForEvent('page', {
      predicate: (p) => p.url().startsWith(`chrome-extension://${extensionId}/pages/reader.html`),
      timeout: 10_000,
    });

    // Open reader with selected text
    await background.evaluate(
      async ({ selection }) => {
        const scope = self as unknown as BackgroundContext;
        if (typeof scope.openReaderWindowSetup !== 'function') {
          throw new Error('openReaderWindowSetup is not available on the background worker');
        }

        await scope.openReaderWindowSetup(selection, true, false);
      },
      { selection: selectionText },
    );

    const readerPage = await readerPagePromise;
    await readerPage.waitForLoadState('domcontentloaded');
    await readerPage.bringToFront();

    // Enable console log capture from the reader page
    readerPage.on('console', msg => {
      console.log('📱 READER CONSOLE:', msg.type(), msg.text());
    });

    // Wait for word to appear (indicates initial text processing is complete)
    const wordLocator = readerPage.locator('#word');
    await expect(wordLocator).not.toHaveText('', { timeout: 15000 });

    // Wait for OpenAI API call to complete
    let apiCallCompleted = false;
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();

    while (!apiCallCompleted && (Date.now() - startTime) < maxWaitTime) {
      if (apiResponses.length > 0) {
        apiCallCompleted = true;
      } else {
        await page.waitForTimeout(1000);
      }
    }

    // Wait additional time for text processing to complete and UI to update
    await page.waitForTimeout(3000);

    // Verify that OpenAI API was called
    expect(apiCalls.length).toBeGreaterThan(0);
    expect(apiCalls[0].url).toBe('https://api.openai.com/v1/responses');
    expect(apiCalls[0].method).toBe('POST');
    expect(apiCalls[0].headers['authorization']).toBe(`Bearer ${openaiApiKey}`);

    // Verify that OpenAI API returned without errors
    expect(apiResponses.length).toBeGreaterThan(0);
    expect(apiResponses[0].status).toBe(200);
    expect(apiResponses[0].statusText).toBe('OK');

    // Wait a bit more for the text to be processed and displayed
    await page.waitForTimeout(5000);

    // Get the processed text from the reader
    const processedText = await wordLocator.textContent();
    console.log('🔍 DEBUG: Final processed text in reader:', processedText);

    // Verify that text was processed and is in Russian
    expect(processedText?.trim()).not.toBe('');

    // Verify that text contains Russian characters (Cyrillic Unicode range)
    const russianPattern = /[\u0400-\u04FF]/;
    expect(processedText).toMatch(russianPattern);

    // Test that the reader can start playing
    const playButton = readerPage.locator('#btnPlay');
    await playButton.click();

    // Check if it switches to pause mode
    await expect(playButton).toHaveText(/Pause/i, { timeout: 5000 });

    // Close the reader page
    await readerPage.close();
  });

  test('settings are correctly configured for Russian and aggressive summarization', async ({ background }) => {
    // Verify that translation language is set to Russian
    const translationResult = await background.evaluate(() => {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get(['sprintReader.translationLanguage'], (result) => {
            resolve(result);
          });
        } else {
          resolve({});
        }
      });
    }) as Record<string, unknown>;

    expect(translationResult['sprintReader.translationLanguage']).toBe('ru');

    // Verify that summarization level is set to aggressive
    const summarizationResult = await background.evaluate(() => {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get(['sprintReader.summarizationLevel'], (result) => {
            resolve(result);
          });
        } else {
          resolve({});
        }
      });
    }) as Record<string, unknown>;

    expect(summarizationResult['sprintReader.summarizationLevel']).toBe('aggressive');
  });
});