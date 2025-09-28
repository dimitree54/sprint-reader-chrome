/* eslint-disable max-lines */
import { applyThemeToElement } from '../common/theme'
import {
  readReaderPreferences,
  writeReaderPreferences,
  readOpenAIApiKey,
  writeOpenAIApiKey,
  readTranslationLanguage,
  writeTranslationLanguage,
  readSummarizationLevel,
  writeSummarizationLevel,
  readPreprocessingEnabled,
  writePreprocessingEnabled
} from '../common/storage'
import { DEFAULTS } from '../config/defaults'
import {
  TRANSLATION_LANGUAGES,
  isTranslationLanguage,
  type TranslationLanguage
} from '../common/translation'
import {
  sliderIndexToSummarizationLevel,
  summarizationLevelToSliderIndex,
  getSummarizationLevelLabel,
  type SummarizationLevel
} from '../common/summarization'
import { authService, type User } from '../auth/index'

// Import debug utilities in development
if (process.env.NODE_ENV === 'development') {
  import('../auth/debug').catch(console.error)
}

const THEME_OPTIONS = {
  lightClass: 'settings--light',
  darkClass: 'settings--dark'
} as const

type SettingsElements = {
  form: HTMLFormElement;
  apiKeyInput: HTMLInputElement;
  clearButton: HTMLButtonElement;
  enablePreprocessingToggle: HTMLInputElement;
  languageSelect: HTMLSelectElement;
  wpmSlider: HTMLInputElement;
  wpmValue: HTMLElement;
  summarizationSlider: HTMLInputElement;
  summarizationLabel: HTMLElement;
  status: HTMLElement;
  // Authentication elements
  userProfile: HTMLElement;
  loginButton: HTMLButtonElement;
  logoutButton: HTMLButtonElement;
  authStatus: HTMLElement;
};

let statusTimeout: ReturnType<typeof setTimeout> | undefined

function showStatus (elements: SettingsElements, message: string, variant: 'success' | 'error'): void {
  if (statusTimeout) {
    clearTimeout(statusTimeout)
    statusTimeout = undefined
  }

  elements.status.textContent = message
  elements.status.dataset.variant = variant
  elements.status.hidden = false

  statusTimeout = setTimeout(() => {
    elements.status.hidden = true
    elements.status.removeAttribute('data-variant')
  }, 4000)
}

function showAuthStatus (elements: SettingsElements, message: string, variant: 'success' | 'error'): void {
  if (statusTimeout) {
    clearTimeout(statusTimeout)
    statusTimeout = undefined
  }

  elements.authStatus.textContent = message
  elements.authStatus.dataset.variant = variant
  elements.authStatus.hidden = false

  statusTimeout = setTimeout(() => {
    elements.authStatus.hidden = true
    elements.authStatus.removeAttribute('data-variant')
  }, 4000)
}

function renderUserProfile (elements: SettingsElements, user: User): void {
  const namePlaceholder = elements.userProfile.querySelector('.js-user-name') as HTMLElement
  const avatarPlaceholder = elements.userProfile.querySelector('.js-user-avatar') as HTMLElement
  const avatarPicturePlaceholder = elements.userProfile.querySelector('.js-user-avatar-picture') as HTMLImageElement
  const subscriptionStatusPlaceholder = elements.userProfile.querySelector('.js-user-subscription-status') as HTMLElement

  if (namePlaceholder) {
    namePlaceholder.textContent = `${user.given_name || ''} ${user.family_name || ''}`.trim() || user.email || 'User'
  }

  if (user.picture && avatarPicturePlaceholder) {
    avatarPicturePlaceholder.src = user.picture
    avatarPicturePlaceholder.hidden = false
    if (avatarPlaceholder) {
      avatarPlaceholder.hidden = true
    }
  } else if (avatarPlaceholder) {
    const initials = `${user.given_name?.[0] || ''}${user.family_name?.[0] || user.given_name?.[1] || ''}`.toUpperCase()
    avatarPlaceholder.textContent = initials || user.email?.[0]?.toUpperCase() || 'U'
    avatarPlaceholder.hidden = false
    if (avatarPicturePlaceholder) {
      avatarPicturePlaceholder.hidden = true
    }
  }

  if (subscriptionStatusPlaceholder) {
    if (user.subscriptionStatus) {
      subscriptionStatusPlaceholder.textContent = user.subscriptionStatus
      subscriptionStatusPlaceholder.dataset.status = user.subscriptionStatus
      subscriptionStatusPlaceholder.hidden = false
    } else {
      subscriptionStatusPlaceholder.hidden = true
    }
  }
}

function clearUserProfile (elements: SettingsElements): void {
  const namePlaceholder = elements.userProfile.querySelector('.js-user-name') as HTMLElement
  const avatarPlaceholder = elements.userProfile.querySelector('.js-user-avatar') as HTMLElement
  const avatarPicturePlaceholder = elements.userProfile.querySelector('.js-user-avatar-picture') as HTMLImageElement
  const subscriptionStatusPlaceholder = elements.userProfile.querySelector('.js-user-subscription-status') as HTMLElement

  if (namePlaceholder) {
    namePlaceholder.textContent = ''
  }
  if (avatarPlaceholder) {
    avatarPlaceholder.textContent = ''
    avatarPlaceholder.hidden = true
  }
  if (avatarPicturePlaceholder) {
    avatarPicturePlaceholder.src = ''
    avatarPicturePlaceholder.hidden = true
  }
  if (subscriptionStatusPlaceholder) {
    subscriptionStatusPlaceholder.textContent = ''
    subscriptionStatusPlaceholder.hidden = true
  }
}

function updateAuthUI (elements: SettingsElements, isAuthenticated: boolean, user: User | null): void {
  if (isAuthenticated && user) {
    elements.loginButton.hidden = true
    elements.logoutButton.hidden = false
    elements.userProfile.hidden = false
    renderUserProfile(elements, user)
  } else {
    elements.loginButton.hidden = false
    elements.logoutButton.hidden = true
    elements.userProfile.hidden = true
    clearUserProfile(elements)
  }
}

async function loadAuthState (elements: SettingsElements): Promise<void> {
  // Initialize auth service
  await authService.initializeAuth()

  // Get current auth state
  const authState = authService.getAuthState()
  updateAuthUI(elements, authState.isAuthenticated, authState.user)

  // Subscribe to auth state changes
  authService.subscribe((state) => {
    updateAuthUI(elements, state.isAuthenticated, state.user)
  })
}

function populateLanguageOptions (selectElement: HTMLSelectElement): void {
  // Clear existing options
  selectElement.innerHTML = ''

  // Add all languages
  TRANSLATION_LANGUAGES.forEach(lang => {
      const option = document.createElement('option')
      option.value = lang.value
      option.textContent = lang.label
      selectElement.appendChild(option)
    })
}

async function loadInitialState (elements: SettingsElements): Promise<void> {
  const prefs = await readReaderPreferences()
  applyThemeToElement(document.body, prefs.theme, THEME_OPTIONS)

  const apiKey = await readOpenAIApiKey()
  if (apiKey) {
    elements.apiKeyInput.value = apiKey
  }

  // Populate language dropdown with all available languages
  populateLanguageOptions(elements.languageSelect)

  const language = await readTranslationLanguage()
  const isPreprocessingEnabled = await readPreprocessingEnabled()

  // Set toggle state
  elements.enablePreprocessingToggle.checked = isPreprocessingEnabled

  // Set dropdown state
  if (isTranslationLanguage(language)) {
    elements.languageSelect.value = language
  } else {
    // Fallback for invalid language codes
    elements.languageSelect.value = 'en'
  }

  // Enable/disable dropdown based on preprocessing toggle
  elements.languageSelect.disabled = !isPreprocessingEnabled

  // Set WPM slider
  elements.wpmSlider.value = String(prefs.wordsPerMinute)
  elements.wpmValue.textContent = String(prefs.wordsPerMinute)

  const summarizationLevel = await readSummarizationLevel()
  const sliderIndex = summarizationLevelToSliderIndex(summarizationLevel)
  elements.summarizationSlider.value = String(sliderIndex)
  elements.summarizationLabel.textContent = getSummarizationLevelLabel(summarizationLevel)

  // Load authentication state
  await loadAuthState(elements)
}

async function persistApiKey (value: string): Promise<void> {
  await writeOpenAIApiKey(value)
}

function registerEvents (elements: SettingsElements): void {
  elements.wpmSlider.addEventListener('input', () => {
    const value = Number.parseInt(elements.wpmSlider.value, 10) || DEFAULTS.READER_PREFERENCES.wordsPerMinute
    elements.wpmValue.textContent = String(value)
  })

  elements.summarizationSlider.addEventListener('input', () => {
    const index = Number.parseInt(elements.summarizationSlider.value, 10) || 0
    const level = sliderIndexToSummarizationLevel(index)
    elements.summarizationLabel.textContent = getSummarizationLevelLabel(level)
  })

  // Handle preprocessing toggle change to enable/disable language dropdown
  elements.enablePreprocessingToggle.addEventListener('change', () => {
    const isEnabled = elements.enablePreprocessingToggle.checked
    elements.languageSelect.disabled = !isEnabled
  })

  
  elements.form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const value = elements.apiKeyInput.value.trim()

    // Get preprocessing enabled state
    const preprocessingEnabled = elements.enablePreprocessingToggle.checked

    // Get language from dropdown
    const selectedLanguage = elements.languageSelect.value
    const language: TranslationLanguage = isTranslationLanguage(selectedLanguage) ? selectedLanguage : 'en'

    // Get WPM value
    const wpmValue = Number.parseInt(elements.wpmSlider.value, 10) || DEFAULTS.READER_PREFERENCES.wordsPerMinute

    const sliderIndex = Number.parseInt(elements.summarizationSlider.value, 10) || 0
    const summarizationLevel: SummarizationLevel = sliderIndexToSummarizationLevel(sliderIndex)

    try {
      // Update reader preferences with new WPM value
      const currentPrefs = await readReaderPreferences()
      const updatedPrefs = { ...currentPrefs, wordsPerMinute: wpmValue }

      await Promise.all([
        persistApiKey(value),
        writePreprocessingEnabled(preprocessingEnabled),
        writeTranslationLanguage(language),
        writeSummarizationLevel(summarizationLevel),
        writeReaderPreferences(updatedPrefs)
      ])
      showStatus(elements, 'Settings saved.', 'success')
    } catch (error: unknown) {
      console.error('Failed to save settings', error)
      showStatus(elements, 'Could not save settings. Try again.', 'error')
    }
  })

  elements.clearButton.addEventListener('click', async () => {
    elements.apiKeyInput.value = ''
    try {
      await persistApiKey('')
      showStatus(elements, 'API key cleared.', 'success')
    } catch (error: unknown) {
      console.error('Failed to clear API key', error)
      showStatus(elements, 'Could not clear API key. Try again.', 'error')
    }
  })

  // Authentication event handlers
  elements.loginButton.addEventListener('click', async () => {
    try {
      const result = await authService.login()
      if (result.success) {
        showAuthStatus(elements, 'Login initiated. Please complete authentication.', 'success')
      } else {
        showAuthStatus(elements, result.error || 'Authentication failed. Please try again.', 'error')
      }
    } catch (error) {
      console.error('Login error:', error)
      showAuthStatus(elements, 'Authentication failed. Please try again.', 'error')
    }
  })

  elements.logoutButton.addEventListener('click', async () => {
    try {
      await authService.logout()
      showAuthStatus(elements, 'Logged out successfully.', 'success')
    } catch (error) {
      console.error('Logout error:', error)
      showAuthStatus(elements, 'Logout failed. Please try again.', 'error')
    }
  })

}

document.addEventListener('DOMContentLoaded', () => {
  const elements: SettingsElements = {
    form: document.getElementById('settingsForm') as HTMLFormElement,
    apiKeyInput: document.getElementById('openaiApiKey') as HTMLInputElement,
    clearButton: document.getElementById('clearSettings') as HTMLButtonElement,
    enablePreprocessingToggle: document.getElementById('enableTranslation') as HTMLInputElement,
    languageSelect: document.getElementById('targetLanguage') as HTMLSelectElement,
    wpmSlider: document.getElementById('wordsPerMinute') as HTMLInputElement,
    wpmValue: document.getElementById('wpmValue') as HTMLElement,
    summarizationSlider: document.getElementById('summarizationLevel') as HTMLInputElement,
    summarizationLabel: document.getElementById('summarizationLabel') as HTMLElement,
    status: document.getElementById('settingsStatus') as HTMLElement,
    // Authentication elements
    userProfile: document.getElementById('userProfile') as HTMLElement,
    loginButton: document.getElementById('loginButton') as HTMLButtonElement,
    logoutButton: document.getElementById('logoutButton') as HTMLButtonElement,
    authStatus: document.getElementById('authStatus') as HTMLElement
  }

  loadInitialState(elements).catch((error: unknown) => {
    console.error('Failed to initialize settings page', error)
    showStatus(elements, 'Could not load settings.', 'error')
  })
  registerEvents(elements)
})
