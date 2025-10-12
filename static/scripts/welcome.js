'use strict';

const STORAGE_KEY = 'sprintReader.readerPrefs';
const THEME_CLASSES = {
  light: 'info--light',
  dark: 'info--dark'
};
const THEME_DATA_ATTRIBUTE = 'theme';

function getExtensionApi() {
  if (typeof browser !== 'undefined') {
    return browser;
  }
  if (typeof chrome !== 'undefined') {
    return chrome;
  }
  return null;
}

function applyTheme(theme) {
  const body = document.body;
  if (!body) {
    return;
  }
  const resolved = theme === 'light' ? 'light' : 'dark';
  body.classList.toggle(THEME_CLASSES.light, resolved === 'light');
  body.classList.toggle(THEME_CLASSES.dark, resolved === 'dark');
  body.dataset[THEME_DATA_ATTRIBUTE] = resolved;
}

async function readThemePreference() {
  const api = getExtensionApi();
  if (!api || !api.storage || !api.storage.local) {
    return null;
  }

  try {
    const request = api.storage.local.get([STORAGE_KEY]);
    if (request && typeof request.then === 'function') {
      const items = await request;
      return items?.[STORAGE_KEY]?.theme ?? null;
    }

    return await new Promise((resolve, reject) => {
      try {
        api.storage.local.get([STORAGE_KEY], (items) => {
          const runtime = api.runtime ?? (typeof chrome !== 'undefined' ? chrome.runtime : undefined);
          if (runtime && runtime.lastError && runtime.lastError.message) {
            reject(new Error(runtime.lastError.message));
            return;
          }
          resolve(items?.[STORAGE_KEY]?.theme ?? null);
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  } catch (error) {
    console.warn('Unable to read theme preference:', error);
    return null;
  }
}

async function fetchMenuEntryText() {
  const api = getExtensionApi();
  if (!api || !api.runtime || !api.runtime.sendMessage) {
    return null;
  }

  try {
    const message = {
      target: 'background',
      type: 'getMenuEntryText'
    };
    const response = api.runtime.sendMessage(message);

    if (response && typeof response.then === 'function') {
      return await response;
    }

    return await new Promise((resolve, reject) => {
      try {
        api.runtime.sendMessage(message, (result) => {
          const runtime = api.runtime ?? (typeof chrome !== 'undefined' ? chrome.runtime : undefined);
          if (runtime && runtime.lastError && runtime.lastError.message) {
            reject(new Error(runtime.lastError.message));
            return;
          }
          resolve(result);
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  } catch (error) {
    console.warn('Unable to fetch menu entry text:', error);
    return null;
  }
}

async function setupContextMenuText() {
  const entrySpan = document.getElementById('contextMenuEntry');
  if (!entrySpan) {
    return;
  }

  const response = await fetchMenuEntryText();
  if (!response || typeof response !== 'object' || !('menuEntryText' in response)) {
    throw new Error('Background did not return menuEntryText');
  }

  const value = response.menuEntryText;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Background returned empty menuEntryText');
  }

  entrySpan.textContent = value;
}

function getExtensionName() {
  const api = getExtensionApi();
  if (!api || !api.runtime || typeof api.runtime.getManifest !== 'function') {
    throw new Error('Extension runtime manifest is unavailable');
  }

  const manifest = api.runtime.getManifest();
  const name = manifest?.name;
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('Extension manifest name is empty');
  }

  return name;
}

function setExtensionName() {
  const name = getExtensionName();
  document.querySelectorAll('[data-app-name]').forEach((element) => {
    element.textContent = name;
  });

  const titleElement = document.querySelector('[data-app-name-title]');
  if (titleElement) {
    titleElement.textContent = `Welcome to ${name}`;
  }
}

function fallbackCopy(text) {
  return new Promise((resolve, reject) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (successful) {
        resolve();
      } else {
        reject(new Error('Copy command was rejected'));
      }
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

async function copyTextFromElement(element) {
  if (!element) {
    throw new Error('Missing target to copy');
  }

  const text = element.textContent || '';
  if (!text.trim()) {
    throw new Error('Text is empty');
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      console.warn('navigator.clipboard.writeText failed, falling back to execCommand', error);
    }
  }

  console.info('Falling back to document.execCommand("copy")');
  await fallbackCopy(text);
}

function updateCopyState(button, success) {
  if (!button) {
    return;
  }

  const container = button.closest('.welcome__tools');
  const toast = container ? container.querySelector('.welcome__copy-toast') : null;

  button.classList.toggle('is-copied', success);

  if (toast && success) {
    toast.textContent = 'Copied!';
    toast.classList.add('is-visible');
  }

  if (toast && !success) {
    toast.classList.remove('is-visible');
    toast.textContent = '';
  }

  if (success) {
    setTimeout(() => {
      button.classList.remove('is-copied');
      if (toast) {
        toast.classList.remove('is-visible');
        toast.textContent = '';
      }
    }, 2200);
  }
}

function setupCopyButtons() {
  const buttons = document.querySelectorAll('[data-copy-target]');
  buttons.forEach((button) => {
    button.addEventListener('click', async () => {
      const targetId = button.getAttribute('data-copy-target');
      const target = targetId ? document.getElementById(targetId) : null;

      try {
        await copyTextFromElement(target);
        updateCopyState(button, true);
      } catch (error) {
        console.warn('Copy failed:', error);
        updateCopyState(button, false);
      }
    });
  });
}

async function triggerRegistrationFlow() {
  const api = getExtensionApi();
  if (!api || !api.runtime || typeof api.runtime.sendMessage !== 'function') {
    throw new Error('Extension messaging API is unavailable');
  }

  const message = {
    target: 'background',
    type: 'triggerAuthFlow',
    flow: 'register'
  };

  const isBrowserApi = typeof browser !== 'undefined' && api === browser;

  const result = isBrowserApi
    ? await api.runtime.sendMessage(message)
    : await new Promise((resolve, reject) => {
        try {
          api.runtime.sendMessage(message, (value) => {
            const runtime = api.runtime ?? (typeof chrome !== 'undefined' ? chrome.runtime : undefined);
            if (runtime && runtime.lastError && runtime.lastError.message) {
              reject(new Error(runtime.lastError.message));
              return;
            }
            resolve(value);
          });
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });

  if (!result || typeof result !== 'object') {
    throw new Error('Background did not acknowledge authentication trigger');
  }

  if ('error' in result && result.error) {
    throw new Error(typeof result.error === 'string' ? result.error : 'Failed to trigger authentication');
  }

  if (!('authStarted' in result) || result.authStarted !== true) {
    throw new Error('Authentication flow did not start as expected');
  }
}

function setupCtaButtons() {
  const signInButton = document.getElementById('ctaSignIn');
  const continueButton = document.getElementById('ctaContinue');

  if (signInButton) {
    signInButton.addEventListener('click', () => {
      triggerRegistrationFlow().catch((error) => {
        console.error('Unable to start registration flow:', error);
      });
    });
  }

  if (continueButton) {
    continueButton.addEventListener('click', () => {
      window.close();
    });
  }
}

async function initialiseTheme() {
  applyTheme('dark');
  const theme = await readThemePreference();
  if (theme === 'light' || theme === 'dark') {
    applyTheme(theme);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initialiseTheme().catch((error) => {
    console.warn('Theme initialisation failed:', error);
  });
  try {
    setExtensionName();
  } catch (error) {
    console.error('Failed to set extension name:', error);
    throw error;
  }
  setupContextMenuText().catch((error) => {
    const entrySpan = document.getElementById('contextMenuEntry');
    if (entrySpan) {
      entrySpan.textContent = 'Missing menu entry text';
    }
    console.error('Failed to load context menu entry text:', error);
    throw error;
  });
  setupCopyButtons();
  setupCtaButtons();
});
