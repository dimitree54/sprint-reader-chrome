/* eslint-disable max-lines */
import { applyThemeToElement } from '../common/theme'
import {
  readReaderPreferences,
  readTranslationLanguage,
  writeTranslationLanguage,
  readSummarizationLevel,
  writeSummarizationLevel,
  readPreprocessingEnabled,
  writePreprocessingEnabled
} from '../common/storage'
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
import { applyExtensionName } from '../common/app-name'

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
  enablePreprocessingToggle: HTMLInputElement;
  languageSelect: HTMLSelectElement;
  summarizationSlider: HTMLInputElement;
  summarizationLabel: HTMLElement;
  status: HTMLElement;
  // Authentication elements
  userProfile: HTMLElement;
  loginButton: HTMLButtonElement;
  logoutButton: HTMLButtonElement;
  manageSubscriptionButton: HTMLButtonElement;
  authStatus: HTMLElement;
};

let statusTimeout: ReturnType<typeof setTimeout> | undefined

function getSubscriptionBadgeLabel (status: User['subscriptionStatus']): string | null {
  if (status === 'pro') {
    return '10x Reader'
  }
  if (status === 'free') {
    return '2x Reader'
  }
  return null
}

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
  const statusLabel = elements.userProfile.querySelector('.settings__user-status') as HTMLElement

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
    const badgeLabel = getSubscriptionBadgeLabel(user.subscriptionStatus)
    if (badgeLabel && user.subscriptionStatus) {
      subscriptionStatusPlaceholder.textContent = badgeLabel
      subscriptionStatusPlaceholder.dataset.status = user.subscriptionStatus
      subscriptionStatusPlaceholder.hidden = false
    } else {
      subscriptionStatusPlaceholder.textContent = ''
      subscriptionStatusPlaceholder.hidden = true
      subscriptionStatusPlaceholder.removeAttribute('data-status')
    }
  }

  if (statusLabel) {
    statusLabel.textContent = 'Authenticated'
  }
}

function clearUserProfile (elements: SettingsElements): void {
  const namePlaceholder = elements.userProfile.querySelector('.js-user-name') as HTMLElement
  const avatarPlaceholder = elements.userProfile.querySelector('.js-user-avatar') as HTMLElement
  const avatarPicturePlaceholder = elements.userProfile.querySelector('.js-user-avatar-picture') as HTMLImageElement
  const subscriptionStatusPlaceholder = elements.userProfile.querySelector('.js-user-subscription-status') as HTMLElement
  const statusLabel = elements.userProfile.querySelector('.settings__user-status') as HTMLElement

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
    subscriptionStatusPlaceholder.removeAttribute('data-status')
  }
  if (statusLabel) {
    statusLabel.textContent = ''
  }
}

function showUserProfile (elements: SettingsElements, user: User): void {
  elements.userProfile.classList.add('settings__user-profile--visible')
  elements.userProfile.hidden = false
  renderUserProfile(elements, user)
}

function hideUserProfile (elements: SettingsElements): void {
  elements.userProfile.classList.remove('settings__user-profile--visible')
  elements.userProfile.hidden = true
  clearUserProfile(elements)
}

function updateAuthUI (elements: SettingsElements, isAuthenticated: boolean, user: User | null): void {
  if (isAuthenticated && user) {
    elements.loginButton.hidden = true
    elements.logoutButton.hidden = false
    showUserProfile(elements, user)
    elements.manageSubscriptionButton.hidden = false
  } else {
    elements.loginButton.hidden = false
    elements.logoutButton.hidden = true
    hideUserProfile(elements)
    elements.manageSubscriptionButton.hidden = true
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

  // Populate language dropdown with all available languages
  populateLanguageOptions(elements.languageSelect)

  const language = await readTranslationLanguage()
  const isPreprocessingEnabled = await readPreprocessingEnabled()

  // Set toggle state
  elements.enablePreprocessingToggle.checked = isPreprocessingEnabled
  elements.enablePreprocessingToggle.setAttribute('aria-checked', String(isPreprocessingEnabled))

  // Set dropdown state
  if (isTranslationLanguage(language)) {
    elements.languageSelect.value = language
  } else {
    // Fallback for invalid language codes
    elements.languageSelect.value = 'en'
  }

  // Enable/disable dropdown based on preprocessing toggle
  elements.languageSelect.disabled = !isPreprocessingEnabled

  const summarizationLevel = await readSummarizationLevel()
  const sliderIndex = summarizationLevelToSliderIndex(summarizationLevel)
  elements.summarizationSlider.value = String(sliderIndex)
  elements.summarizationLabel.textContent = getSummarizationLevelLabel(summarizationLevel)

  // Load authentication state
  await loadAuthState(elements)
}

function buildManageSubscriptionUrl (): string {
  const rawDomain = process.env.VITE_KINDE_DOMAIN || ''
  const orgCode = process.env.VITE_KINDE_ORG_CODE || ''

  if (!rawDomain.trim()) throw new Error('VITE_KINDE_DOMAIN is not set')
  if (!orgCode.trim()) throw new Error('VITE_KINDE_ORG_CODE is not set')

  return `https://${rawDomain}/account/cx/_:nav&m:account::_:submenu&s:plan_selection&org_code:${orgCode}`
}

function resolvePrivacyPolicyUrl (): string {
  const url = process.env.PRIVACY_POLICY_URL || ''

  if (typeof url !== 'string' || url.trim().length === 0) {
    throw new Error('PRIVACY_POLICY_URL is not set')
  }

  return url
}

function initializePrivacyPolicyLink (): void {
  const link = document.getElementById('privacyPolicyLink') as HTMLAnchorElement | null
  if (!link) {
    throw new Error('Privacy policy link element is missing')
  }

  const url = resolvePrivacyPolicyUrl()
  link.href = url
  link.textContent = 'Check Privacy Policy'
}

function registerEvents (elements: SettingsElements): void {
  elements.summarizationSlider.addEventListener('input', () => {
    const index = Number.parseInt(elements.summarizationSlider.value, 10) || 0
    const level = sliderIndexToSummarizationLevel(index)
    elements.summarizationLabel.textContent = getSummarizationLevelLabel(level)
  })

  elements.summarizationSlider.addEventListener('change', async () => {
    const index = Number.parseInt(elements.summarizationSlider.value, 10) || 0
    const level = sliderIndexToSummarizationLevel(index)

    try {
      await writeSummarizationLevel(level)
      showStatus(elements, 'Settings saved.', 'success')
    } catch (error) {
      console.error('Failed to save summarization level', error)
      showStatus(elements, 'Could not save settings. Try again.', 'error')
    }
  })

  // Handle preprocessing toggle change to enable/disable language dropdown
  elements.enablePreprocessingToggle.addEventListener('change', async () => {
    const isEnabled = elements.enablePreprocessingToggle.checked
    elements.languageSelect.disabled = !isEnabled
    elements.enablePreprocessingToggle.setAttribute('aria-checked', String(isEnabled))

    try {
      await writePreprocessingEnabled(isEnabled)
      showStatus(elements, 'Settings saved.', 'success')
    } catch (error) {
      console.error('Failed to save preprocessing setting', error)
      showStatus(elements, 'Could not save settings. Try again.', 'error')
    }
  })

  elements.manageSubscriptionButton.addEventListener('click', () => {
    try {
      const url = buildManageSubscriptionUrl()
      console.info('[settings] Navigating to subscription management', { url })
      window.location.href = url
    } catch (error) {
      console.error('Failed to open subscription management', error)
      showAuthStatus(elements, 'Unable to open subscription management. Try again later.', 'error')
    }
  })

  elements.languageSelect.addEventListener('change', async () => {
    const selectedLanguage = elements.languageSelect.value
    const language: TranslationLanguage = isTranslationLanguage(selectedLanguage) ? selectedLanguage : 'en'

    try {
      await writeTranslationLanguage(language)
      showStatus(elements, 'Settings saved.', 'success')
    } catch (error) {
      console.error('Failed to save translation language', error)
      showStatus(elements, 'Could not save settings. Try again.', 'error')
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
  applyExtensionName()
  initializePrivacyPolicyLink()
  const elements: SettingsElements = {
    form: document.getElementById('settingsForm') as HTMLFormElement,
    enablePreprocessingToggle: document.getElementById('enableTranslation') as HTMLInputElement,
    languageSelect: document.getElementById('targetLanguage') as HTMLSelectElement,
    summarizationSlider: document.getElementById('summarizationLevel') as HTMLInputElement,
    summarizationLabel: document.getElementById('summarizationLabel') as HTMLElement,
    status: document.getElementById('settingsStatus') as HTMLElement,
    // Authentication elements
    userProfile: document.getElementById('userProfile') as HTMLElement,
    loginButton: document.getElementById('loginButton') as HTMLButtonElement,
    logoutButton: document.getElementById('logoutButton') as HTMLButtonElement,
    manageSubscriptionButton: document.getElementById('manageSubscription') as HTMLButtonElement,
    authStatus: document.getElementById('authStatus') as HTMLElement
  }

  loadInitialState(elements).catch((error: unknown) => {
    console.error('Failed to initialize settings page', error)
    showStatus(elements, 'Could not load settings.', 'error')
  })
  registerEvents(elements)
})
