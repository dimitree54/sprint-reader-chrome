'use strict';

const STORAGE_KEY = 'sprintReader.readerPrefs';
const AUTH_USER_STORAGE_KEY = 'sprintReader.auth.user';
const THEME_CLASSES = {
  light: 'info--light',
  dark: 'info--dark'
};
const THEME_DATA_ATTRIBUTE = 'theme';
let teardownCtaHandlers = null;
let isConfiguringCtas = false;
let needsCtaRefresh = false;

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

async function fetchAuthStatus() {
  const api = getExtensionApi();
  if (!api || !api.runtime || typeof api.runtime.sendMessage !== 'function') {
    throw new Error('Extension messaging API is unavailable');
  }

  const message = {
    target: 'background',
    type: 'getAuthStatus'
  };

  const isBrowserApi = typeof browser !== 'undefined' && api === browser;

  return isBrowserApi
    ? api.runtime.sendMessage(message)
    : new Promise((resolve, reject) => {
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
}

function resetCtaButtonState(signInButton, continueButton) {
  if (!signInButton.dataset.defaultText) {
    signInButton.dataset.defaultText = signInButton.textContent || '';
  }

  signInButton.textContent = signInButton.dataset.defaultText || '';
  if (continueButton) {
    continueButton.hidden = false;
  }
}

async function openPlanSelectionPage(url) {
  if (typeof url !== 'string' || url.trim().length === 0) {
    throw new Error('Invalid plan selection URL');
  }

  const api = getExtensionApi();
  if (!api || !api.tabs || typeof api.tabs.create !== 'function') {
    throw new Error('Extension tabs API is unavailable');
  }

  const isBrowserApi = typeof browser !== 'undefined' && api === browser;

  if (isBrowserApi) {
    await api.tabs.create({ url });
    return;
  }

  await new Promise((resolve, reject) => {
    try {
      api.tabs.create({ url }, () => {
        const runtime = api.runtime ?? (typeof chrome !== 'undefined' ? chrome.runtime : undefined);
        if (runtime && runtime.lastError && runtime.lastError.message) {
          reject(new Error(runtime.lastError.message));
          return;
        }
        resolve();
      });
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

async function configureCtaButtons() {
  const signInButton = document.getElementById('ctaSignIn');
  if (!signInButton) {
    throw new Error('Sign-in CTA button is missing');
  }

  const continueButton = document.getElementById('ctaContinue');

  if (typeof teardownCtaHandlers === 'function') {
    teardownCtaHandlers();
    teardownCtaHandlers = null;
  }

  resetCtaButtonState(signInButton, continueButton || null);

  const cleanupFns = [];
  const registerHandler = (element, handler) => {
    element.addEventListener('click', handler);
    cleanupFns.push(() => {
      element.removeEventListener('click', handler);
    });
  };

  if (continueButton) {
    registerHandler(continueButton, () => {
      window.close();
    });
  }

  try {
    const response = await fetchAuthStatus();
    if (!response || typeof response !== 'object' || !('authStatus' in response)) {
      throw new Error('Background did not return authStatus');
    }

    const { authStatus, error } = response;
    if (!authStatus || typeof authStatus !== 'object') {
      throw new Error('Invalid authStatus payload');
    }

    if (typeof error === 'string' && error.trim().length > 0) {
      console.error('Background reported auth status error:', error);
    }

    const isAuthenticated = authStatus.isAuthenticated === true;
    const subscriptionStatus = typeof authStatus.subscriptionStatus === 'string'
      ? authStatus.subscriptionStatus
      : null;
    const planSelectionUrl = typeof authStatus.planSelectionUrl === 'string' && authStatus.planSelectionUrl.trim().length > 0
      ? authStatus.planSelectionUrl
      : null;

    if (!isAuthenticated) {
      registerHandler(signInButton, () => {
        triggerRegistrationFlow().catch((registerError) => {
          console.error('Unable to start registration flow:', registerError);
        });
      });
    } else if (subscriptionStatus !== 'pro') {
      if (!planSelectionUrl) {
        throw new Error('Plan selection URL is missing for authenticated non-pro user');
      }

      registerHandler(signInButton, () => {
        openPlanSelectionPage(planSelectionUrl).catch((upgradeError) => {
          console.error('Failed to open plan selection page:', upgradeError);
        });
      });
    } else {
      signInButton.textContent = 'Start 10x reading (close this window)';
      registerHandler(signInButton, () => {
        window.close();
      });

      if (continueButton) {
        continueButton.hidden = true;
      }
    }
  } catch (error) {
    registerHandler(signInButton, () => {
      triggerRegistrationFlow().catch((registerError) => {
        console.error('Unable to start registration flow:', registerError);
      });
    });
    teardownCtaHandlers = () => {
      cleanupFns.forEach((fn) => fn());
    };
    throw error;
  }

  teardownCtaHandlers = () => {
    cleanupFns.forEach((fn) => fn());
  };
}

async function refreshCtaButtons() {
  if (isConfiguringCtas) {
    needsCtaRefresh = true;
    return;
  }

  isConfiguringCtas = true;

  do {
    needsCtaRefresh = false;
    try {
      await configureCtaButtons();
    } catch (error) {
      console.error('CTA initialisation failed:', error);
    }
  } while (needsCtaRefresh);

  isConfiguringCtas = false;
}

function subscribeToAuthStatusChanges() {
  const api = getExtensionApi();
  const storage = api?.storage;
  const onChanged = storage?.onChanged;

  if (!api || !storage || !onChanged || typeof onChanged.addListener !== 'function') {
    return;
  }

  const listener = (changes, areaName) => {
    if (areaName !== 'local' || typeof changes !== 'object' || changes === null) {
      return;
    }

    if (!(AUTH_USER_STORAGE_KEY in changes)) {
      return;
    }

    refreshCtaButtons().catch((error) => {
      console.error('CTA refresh failed after auth change:', error);
    });
  };

  onChanged.addListener(listener);
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
  subscribeToAuthStatusChanges();
  refreshCtaButtons();
});
