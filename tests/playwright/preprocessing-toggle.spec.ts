import { expect, test } from './fixtures'

type BackgroundContext = {
  openReaderWindowSetup: (
    text: string,
    haveSelection: boolean,
    directionRTL: boolean,
  ) => Promise<void>;
}

test.describe('Preprocessing Toggle', () => {
  test('disabling translation prevents LLM preprocessing and shows original English', async ({ page, context, extensionId, background }) => {
    // Step 1: Enable translation and set Russian, then disable it and save
    await background.evaluate(async () => {
      return new Promise<void>((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({
            'sprintReader.preprocessingEnabled': true,
            'sprintReader.translationLanguage': 'ru',
          }, () => {
            chrome.storage.local.set({ 'sprintReader.preprocessingEnabled': false }, () => resolve())
          })
        } else {
          resolve()
        }
      })
    })

    // Step 2: Intercept OpenAI to ensure no API calls are made
    const apiCalls: Array<{ url: string; method: string }> = []
    await context.route('https://api.openai.com/**', async (route) => {
      const request = route.request()
      apiCalls.push({ url: request.url(), method: request.method() })
      // Still pass through if any call happens (should not)
      const response = await route.fetch()
      await route.fulfill({ response })
    })

    // Step 3: Open a page with English text and open reader
    const englishText = 'This is a plain English sentence for testing.'
    await page.goto('data:text/html,<html><body><p id="t">This is a plain English sentence for testing.</p></body></html>')
    await page.locator('#t').click()
    await page.locator('#t').selectText()

    const readerPagePromise = context.waitForEvent('page', {
      predicate: (p) => p.url().startsWith(`chrome-extension://${extensionId}/pages/reader.html`),
      timeout: 10_000,
    })

    await background.evaluate(async ({ selection }) => {
      const scope = self as unknown as BackgroundContext
      await scope.openReaderWindowSetup(selection, true, false)
    }, { selection: englishText })

    const readerPage = await readerPagePromise
    await readerPage.waitForLoadState('domcontentloaded')

    // Step 4: Verify reader shows original English and no API calls were made
    // Ensure the reader has rendered a word
    const wordLocator = readerPage.locator('#word')
    await expect(wordLocator).not.toHaveText('', { timeout: 10_000 })

    // Wait until tokens are populated in store
    await readerPage.waitForFunction(() => {
      const store = (window as any).readerStore;
      const state = store?.getState?.();
      return !!state && Array.isArray(state.tokens) && state.tokens.length > 0;
    });

    const displayed = await readerPage.evaluate(() => {
      const store = (window as any).readerStore
      const state = store?.getState()
      if (!state || !state.tokens || state.tokens.length === 0) return null
      return state.tokens.map((w: any) => w.text).join(' ')
    })

    // Normalize spaces and punctuation spacing before comparing
    const normalize = (s: string) => s
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,!?;:])/g, '$1')
      .trim()

    expect(normalize(displayed || '')).toBe(normalize(englishText))
    // No Cyrillic characters (Russian) should appear
    const cyrillic = /[\u0400-\u04FF]/
    expect(cyrillic.test(displayed || '')).toBe(false)

    // Ensure no OpenAI call was made
    expect(apiCalls.length).toBe(0)

    await readerPage.close()
  })
})
