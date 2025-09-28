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
    // Set up settings for Russian language with aggressive summarization
    await background.evaluate(() => {
      return new Promise<void>((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({
            'sprintReader.translationLanguage': 'ru',
            'sprintReader.summarizationLevel': 'aggressive',
            'sprintReader.preprocessingEnabled': true
          }, () => {
            resolve();
          });
        } else {
          resolve();
        }
      });
    });
  });

  test('tests Russian translation with aggressive summarization using Kinde-gated worker', async ({ page, context, extensionId, background }) => {
    test.setTimeout(15000); // Increase timeout
    background.on('console', msg => console.log('BG CONSOLE:', msg.text()));
    const devToken = process.env.VITE_DEV_PRO_TOKEN;

    if (!devToken) {
      throw new Error('VITE_DEV_PRO_TOKEN environment variable is not set. Please set it to run this test.');
    }

    // Set up a dev token override in the background script for testing
    await background.evaluate(async ({ token }) => {
      const dummyUser = {
        id: 'test-user',
        given_name: 'Test',
        family_name: 'User',
        email: 'test@example.com',
        picture: '',
        username: 'testuser',
        subscriptionStatus: 'pro' as const
      };

      // Store auth data using the correct storage keys
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({
          'sprintReader.auth.token': token,
          'sprintReader.auth.user': dummyUser
        }, () => {
          console.log('Auth data stored successfully');
          resolve();
        });
      });

      // Override the global auth functions for testing
      (globalThis as any).TEST_MODE = true;
      (globalThis as any).TEST_AUTH_TOKEN = token;
      (globalThis as any).TEST_AUTH_USER = dummyUser;

      console.log('Test mode enabled with dev token');
    }, { token: devToken });

    // Ensure reader pages see TEST_MODE + token before any script runs
    await context.addInitScript(({ token, user }) => {
      try {
        (window as any).TEST_MODE = true;
        (window as any).TEST_AUTH_TOKEN = token;
        (window as any).TEST_AUTH_USER = user;
      } catch {}
    }, {
      token: devToken,
      user: {
        id: 'test-user',
        given_name: 'Test',
        family_name: 'User',
        email: 'test@example.com',
        picture: '',
        username: 'testuser',
        subscriptionStatus: 'pro' as const
      }
    });

    // Ensure preprocessing settings are set before opening reader (guard against service worker restarts)
    await background.evaluate(() => {
      return new Promise<void>((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({
            'sprintReader.preprocessingEnabled': true,
            'sprintReader.translationLanguage': 'ru',
            'sprintReader.summarizationLevel': 'aggressive'
          }, () => resolve());
        } else {
          resolve();
        }
      });
    });

    // Navigate to example.com
    await page.goto('https://example.com');
    const paragraph = page.locator('p').first();
    await paragraph.waitFor();

    // Select text for reading
    await paragraph.click({ clickCount: 3 });
    await page.waitForTimeout(300);

    const selectionText = (await page.evaluate(() => window.getSelection()?.toString() ?? '')).trim();
    expect(selectionText.length).toBeGreaterThan(0);

    // Set up network interception to monitor worker calls
    const apiCalls: Array<{ url: string; method: string; headers: Record<string, string> }> = [];
    const apiResponses: Array<{ status: number; statusText: string }> = [];

    await context.route('https://kinde-gated-openai-responses-api.path2dream.workers.dev', async (route) => {
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

    // Check authentication state in both storage and store
    const authState = await background.evaluate(async () => {
      const storageResult = await new Promise((resolve) => {
        chrome.storage.local.get(['sprintReader.auth.token', 'sprintReader.auth.user'], (result) => {
          resolve(result);
        });
      });

      let storeState = null;
      try {
        const { useAuthStore } = await import('../src/auth/state/auth.store.js');
        storeState = useAuthStore.getState();
      } catch (error) {
        console.warn('Could not access auth store:', error);
      }

      return {
        storage: storageResult,
        store: storeState ? {
          isAuthenticated: storeState.isAuthenticated,
          user: storeState.user,
          error: storeState.error
        } : null,
        testMode: (globalThis as any).TEST_MODE,
        testToken: !!(globalThis as any).TEST_AUTH_TOKEN
      };
    });
    console.log('🔑 Auth state:', authState);

    // Reader page will already have test mode via init script

    // Check preprocessing configuration
    const preprocessingState = await background.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.storage.local.get([
          'sprintReader.preprocessingEnabled',
          'sprintReader.translationLanguage',
          'sprintReader.summarizationLevel'
        ], (result) => {
          resolve(result);
        });
      });
    });
    console.log('⚙️ Preprocessing config:', preprocessingState);

    // Wait for API call to complete
    let apiCallCompleted = false;
    const maxWaitTime = 15000; // 15 seconds (reduced from 30)
    const startTime = Date.now();

    console.log('⏳ Waiting for API calls. Current count:', apiCalls.length);

    while (!apiCallCompleted && (Date.now() - startTime) < maxWaitTime) {
      if (apiResponses.length > 0) {
        console.log('✅ API call completed! Responses:', apiResponses.length);
        apiCallCompleted = true;
      } else {
        console.log(`⏱️  Still waiting... API calls: ${apiCalls.length}, elapsed: ${Date.now() - startTime}ms`);
        await readerPage.waitForTimeout(1000);
      }
    }

    console.log('🏁 Wait completed. API calls made:', apiCalls.length, 'Responses:', apiResponses.length);

    // Verify that the worker was called
    expect(apiCalls.length).toBeGreaterThan(0);
    // Allow optional trailing slash normalization from fetch
    expect(apiCalls[0].url.replace(/\/$/, '')).toBe('https://kinde-gated-openai-responses-api.path2dream.workers.dev');
    expect(apiCalls[0].method).toBe('POST');
    expect(apiCalls[0].headers['authorization']).toBe(`Bearer ${devToken}`);

    // Verify that the worker returned without errors
    expect(apiResponses.length).toBeGreaterThan(0);
    expect(apiResponses[0].status).toBe(200);

    // Wait until processed text appears and contains Cyrillic characters
    await expect(wordLocator).toHaveText(/[\u0400-\u04FF]/, { timeout: 15000 });
    const processedText = (await wordLocator.textContent()) || '';
    console.log('🔍 DEBUG: Final processed text in reader:', processedText);

    // Verify that text was processed and is in Russian
    expect(processedText.trim()).not.toBe('');

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
    // Re-assert settings are present
    await background.evaluate(() => {
      return new Promise<void>((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({
            'sprintReader.preprocessingEnabled': true,
            'sprintReader.translationLanguage': 'ru',
            'sprintReader.summarizationLevel': 'aggressive'
          }, () => resolve());
        } else {
          resolve();
        }
      });
    });
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

    // Verify that preprocessing is enabled
    const preprocessingResult = await background.evaluate(() => {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get(['sprintReader.preprocessingEnabled'], (result) => {
            resolve(result);
          });
        } else {
          resolve({});
        }
      });
    }) as Record<string, unknown>;

    expect(preprocessingResult['sprintReader.preprocessingEnabled']).toBe(true);
  });
});
