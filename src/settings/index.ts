/* eslint-disable max-lines */
import { applyThemeToElement } from '../common/theme'
import {
  readReaderPreferences,
  readTranslationLanguage,
  writeTranslationLanguage,
  readSummarizationLevel,
  writeSummarizationLevel,
  readPreprocessingEnabled,
  writePreprocessingEnabled,
  readUsageStats,
  type UsageStats
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
import { DEFAULTS } from '../config/defaults'

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
  aiCard: HTMLElement;
  aiUpsell: HTMLElement;
  aiUpsellTitle: HTMLElement;
  aiCtaButton: HTMLButtonElement;
  // Authentication elements
  userProfile: HTMLElement;
  loginButton: HTMLButtonElement;
  logoutButton: HTMLButtonElement;
  manageSubscriptionButton: HTMLButtonElement;
  authStatus: HTMLElement;
  statsCard: HTMLElement;
  statsHoursValue: HTMLElement;
  statsWordsValue: HTMLElement;
  statsWithoutExtensionValue: HTMLElement;
  statsWithExtensionValue: HTMLElement;
  statsReaderLevelValue: HTMLElement;
  statsInfoTooltip: HTMLElement;
};

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })
const ratioFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
})

function formatInteger(value: number): string {
  return numberFormatter.format(Math.max(0, Math.round(value)))
}

function formatDurationHms(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const hoursStr = String(hours).padStart(2, '0')
  const minutesStr = String(minutes).padStart(2, '0')
  const secondsStr = String(seconds).padStart(2, '0')

  return `${hoursStr}:${minutesStr}:${secondsStr}`
}

function renderUsageStats (elements: SettingsElements, stats: UsageStats): void {
  const now = Date.now()
  const diffMs = Math.max(0, now - stats.firstUsedAt)
  const hourMs = 60 * 60 * 1000
  const hoursUsed = Math.max(1, Math.ceil(diffMs / hourMs))
  const hourLabel = hoursUsed === 1 ? 'hour' : 'hours'

  elements.statsHoursValue.textContent = `${formatInteger(hoursUsed)} ${hourLabel}`
  elements.statsWordsValue.textContent = `${formatInteger(stats.totalWordsRead)} words`
  elements.statsWithoutExtensionValue.textContent = formatDurationHms(stats.totalOriginalReadingTimeMs)
  elements.statsWithExtensionValue.textContent = formatDurationHms(stats.totalExtensionReadingTimeMs)

  const hasExtensionTime = stats.totalExtensionReadingTimeMs > 0
  const hasOriginalTime = stats.totalOriginalReadingTimeMs > 0
  const readerMultiplier = hasExtensionTime && hasOriginalTime
    ? Math.max(stats.totalOriginalReadingTimeMs / stats.totalExtensionReadingTimeMs, 0)
    : 0

  if (readerMultiplier > 0) {
    elements.statsReaderLevelValue.textContent = `${ratioFormatter.format(readerMultiplier)}× Reader`
  } else {
    elements.statsReaderLevelValue.textContent = '—'
  }

  elements.statsCard.classList.add('settings__stats-card--loaded')
}

function setUsageStatsInfoTooltip (tooltip: HTMLElement): void {
  const { standardWordsPerMinute, translationWordsPerMinute } = DEFAULTS.READING_SPEED
  tooltip.textContent = `We estimate "time without the extension" using ${standardWordsPerMinute} words per minute when translation is off and ${translationWordsPerMinute} words per minute when translation is enabled.`
}

async function refreshUsageStats (elements: SettingsElements): Promise<void> {
  try {
    const stats = await readUsageStats()
    renderUsageStats(elements, stats)
  } catch (error) {
    console.error('Failed to load usage statistics', error)
  }
}

function registerStatsRefreshHandlers (elements: SettingsElements): void {
  const handleRefresh = () => { void refreshUsageStats(elements) }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      handleRefresh()
    }
  })

  window.addEventListener('focus', () => {
    if (!document.hidden) {
      handleRefresh()
    }
  })
}

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

function setAiControlsDisabled (elements: SettingsElements, disabled: boolean): void {
  elements.enablePreprocessingToggle.disabled = disabled
  if (disabled) {
    elements.enablePreprocessingToggle.setAttribute('aria-disabled', 'true')
  } else {
    elements.enablePreprocessingToggle.removeAttribute('aria-disabled')
  }

  elements.languageSelect.disabled = disabled
  elements.summarizationSlider.disabled = disabled
}

function normalizeSubscriptionStatus (value: unknown): User['subscriptionStatus'] {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()
  if (normalized === 'pro' || normalized === 'free') {
    return normalized
  }

  return null
}

function getBadgeDatasetValue (elements: SettingsElements): User['subscriptionStatus'] {
  const badge = elements.userProfile.querySelector('.js-user-subscription-status')
  if (!(badge instanceof HTMLElement)) {
    return null
  }

  return normalizeSubscriptionStatus(badge.dataset.status)
}

function resolveSubscriptionStatus (elements: SettingsElements, user: User | null): User['subscriptionStatus'] {
  const datasetStatus = getBadgeDatasetValue(elements)

  if (datasetStatus) {
    return datasetStatus
  }

  return normalizeSubscriptionStatus(user?.subscriptionStatus)
}

function updateAiPreprocessingAccess (elements: SettingsElements, isAuthenticated: boolean, user: User | null): void {
  const subscriptionStatus = resolveSubscriptionStatus(elements, user)
  const badgeLabel = getSubscriptionBadgeLabel(subscriptionStatus)
  const hasProBadge = subscriptionStatus === 'pro'

  setAiControlsDisabled(elements, !hasProBadge)

  const title = "You are on '2x reader' plan now."

  if (hasProBadge) {
    elements.aiCard.classList.remove('settings__card--ai-locked')
    elements.aiUpsell.hidden = true
    elements.aiUpsell.setAttribute('aria-hidden', 'true')
    elements.aiUpsell.style.display = 'none'
    elements.aiCtaButton.disabled = false
    elements.aiCtaButton.onclick = null
  } else {
    elements.aiCard.classList.add('settings__card--ai-locked')
    elements.aiUpsell.hidden = false
    elements.aiUpsell.removeAttribute('aria-hidden')
    elements.aiUpsell.style.display = ''
    elements.aiCtaButton.disabled = false

    elements.aiUpsellTitle.innerHTML = title

    if (!isAuthenticated) {
      elements.aiCtaButton.textContent = 'Become 10x Reader'.toUpperCase()
      elements.aiCtaButton.onclick = async () => {
        if (elements.aiCtaButton.disabled) {
          return
        }
        elements.aiCtaButton.disabled = true
        try {
          const result = await authService.login()
          if (result.success) {
            showAuthStatus(elements, 'Registration initiated. Complete sign-up in the new tab.', 'success')
          } else {
            showAuthStatus(elements, result.error || 'Could not start registration. Try again.', 'error')
          }
        } catch (error) {
          console.error('Failed to start registration flow', error)
          showAuthStatus(elements, 'Could not start registration. Try again.', 'error')
        } finally {
          elements.aiCtaButton.disabled = false
        }
      }
    } else {
      elements.aiCtaButton.textContent = 'Upgrade to 10x Reader'.toUpperCase()
      elements.aiCtaButton.onclick = async () => {
        if (elements.aiCtaButton.disabled) {
          return
        }

        elements.aiCtaButton.disabled = true
        try {
          const returnUrl = window.location.origin
          const url = await requestManageSubscriptionUrl(returnUrl)
          window.location.href = url
        } catch (error) {
          console.error('Failed to open subscription management from CTA', error)
          showAuthStatus(elements, 'Unable to open subscription management. Try again later.', 'error')
        } finally {
          elements.aiCtaButton.disabled = false
        }
      }
    }
  }
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

  updateAiPreprocessingAccess(elements, isAuthenticated, user)
}

async function loadAuthState (elements: SettingsElements): Promise<void> {
  // Initialize auth service
  await authService.initializeAuth('settings')

  // Get current auth state
  const authState = authService.getAuthState()
  updateAuthUI(elements, authState.isAuthenticated, authState.user)

  // Subscribe to auth state changes
  authService.subscribe((state) => {
    updateAuthUI(elements, state.isAuthenticated, state.user)
  })
}

function registerAuthRefreshHandlers (): void {
  let isRefreshing = false

  const refreshAuthState = async (): Promise<void> => {
    if (isRefreshing) {
      return
    }

    isRefreshing = true
    try {
      await authService.refreshUserData('settings')
    } catch (error) {
      console.error('[settings] Failed to refresh auth state after visibility change', error)
    } finally {
      isRefreshing = false
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      void refreshAuthState()
    }
  })

  window.addEventListener('focus', () => {
    if (!document.hidden) {
      void refreshAuthState()
    }
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

  const summarizationLevel = await readSummarizationLevel()
  const sliderIndex = summarizationLevelToSliderIndex(summarizationLevel)
  elements.summarizationSlider.value = String(sliderIndex)
  elements.summarizationLabel.textContent = getSummarizationLevelLabel(summarizationLevel)

  // Load authentication state
  await loadAuthState(elements)

  await refreshUsageStats(elements)
}

async function requestManageSubscriptionUrl (returnUrl: string): Promise<string> {
  const globalApi = globalThis as typeof globalThis & { browser?: typeof chrome; chrome?: typeof chrome }
  const api = globalApi.browser ?? globalApi.chrome ?? null

  if (!api || !api.runtime || typeof api.runtime.sendMessage !== 'function') {
    throw new Error('Extension messaging API is unavailable')
  }

  const message = {
    target: 'background' as const,
    type: 'resolveManageSubscriptionUrl' as const,
    returnUrl
  }

  const deferredResult = api.runtime.sendMessage(message)

  let response: unknown

  if (deferredResult && typeof (deferredResult as Promise<unknown>).then === 'function') {
    response = await (deferredResult as Promise<unknown>)
  } else {
    response = await new Promise((resolve, reject) => {
      try {
        api.runtime.sendMessage(message, (result: unknown) => {
          const runtime = api.runtime ?? (globalApi.chrome?.runtime ?? undefined)
          if (runtime && runtime.lastError && runtime.lastError.message) {
            reject(new Error(runtime.lastError.message))
            return
          }
          resolve(result)
        })
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  if (!response || typeof response !== 'object') {
    throw new Error('Background did not return subscription details')
  }

  const { manageSubscriptionUrl, error } = response as { manageSubscriptionUrl?: unknown; error?: unknown }

  if (typeof error === 'string' && error.trim().length > 0) {
    throw new Error(error)
  }

  if (typeof manageSubscriptionUrl !== 'string' || manageSubscriptionUrl.trim().length === 0) {
    throw new Error('Background returned an invalid subscription URL')
  }

  return manageSubscriptionUrl
}

function resolvePrivacyPolicyUrl (): string {
  const url = process.env.PRIVACY_POLICY_URL || ''

  if (typeof url !== 'string' || url.trim().length === 0) {
    throw new Error('PRIVACY_POLICY_URL is not set')
  }

  return url
}

function resolveAcknowledgementsUrl (): string {
  const url = process.env.ACKNOWLEDGEMENTS_URL || ''

  if (typeof url !== 'string' || url.trim().length === 0) {
    throw new Error('ACKNOWLEDGEMENTS_URL is not set')
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
  link.textContent = 'Read Privacy Policy'
}

function initializeAcknowledgementsLink (): void {
  const link = document.getElementById('acknowledgementsLink') as HTMLAnchorElement | null
  if (!link) {
    throw new Error('Acknowledgements link element is missing')
  }

  const url = resolveAcknowledgementsUrl()
  link.href = url
  link.textContent = 'Read acknowledgements and license'
}

function registerEvents (elements: SettingsElements): void {
  elements.summarizationSlider.addEventListener('input', () => {
    const index = Number.parseInt(elements.summarizationSlider.value, 10) || 0
    const level = sliderIndexToSummarizationLevel(index)
    elements.summarizationLabel.textContent = getSummarizationLevelLabel(level)
  })

  elements.summarizationSlider.addEventListener('change', async () => {
    if (elements.summarizationSlider.disabled) {
      return
    }

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

  // Handle preprocessing toggle state changes
  elements.enablePreprocessingToggle.addEventListener('change', async () => {
    if (elements.enablePreprocessingToggle.disabled) {
      return
    }

    const isEnabled = elements.enablePreprocessingToggle.checked
    elements.enablePreprocessingToggle.setAttribute('aria-checked', String(isEnabled))

    try {
      await writePreprocessingEnabled(isEnabled)
      showStatus(elements, 'Settings saved.', 'success')
    } catch (error) {
      console.error('Failed to save preprocessing setting', error)
      showStatus(elements, 'Could not save settings. Try again.', 'error')
    }
  })

  elements.manageSubscriptionButton.addEventListener('click', async () => {
    if (elements.manageSubscriptionButton.disabled) {
      return
    }

    elements.manageSubscriptionButton.disabled = true

    try {
      const returnUrl = window.location.origin
      const url = await requestManageSubscriptionUrl(returnUrl)
      console.info('[settings] Navigating to subscription management', { url })
      window.location.href = url
    } catch (error) {
      console.error('Failed to open subscription management', error)
      showAuthStatus(elements, 'Unable to open subscription management. Try again later.', 'error')
    } finally {
      elements.manageSubscriptionButton.disabled = false
    }
  })

  elements.languageSelect.addEventListener('change', async () => {
    if (elements.languageSelect.disabled) {
      return
    }

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
  initializeAcknowledgementsLink()
  const aiCardElement = document.querySelector('[data-ai-card]')
  const aiUpsellElement = document.querySelector('[data-ai-cta]')

  if (!(aiCardElement instanceof HTMLElement) || !(aiUpsellElement instanceof HTMLElement)) {
    throw new Error('AI Pre-processing card elements are missing')
  }

  const aiUpsellTitleElement = aiUpsellElement.querySelector('[data-ai-cta-title]')
  const aiCtaButtonElement = aiUpsellElement.querySelector('[data-ai-cta-button]')

  if (!(aiUpsellTitleElement instanceof HTMLElement) || !(aiCtaButtonElement instanceof HTMLButtonElement)) {
    throw new Error('AI Pre-processing CTA elements are missing')
  }

  const statsCardElement = document.querySelector('[data-usage-stats-card]')
  const statsHoursElement = document.querySelector('[data-usage-hours]')
  const statsWordsElement = document.querySelector('[data-usage-words]')
  const statsWithoutExtensionElement = document.querySelector('[data-usage-without-extension]')
  const statsWithExtensionElement = document.querySelector('[data-usage-with-extension]')
  const statsReaderLevelElement = document.querySelector('[data-usage-reader-level]')
  const statsInfoTooltipElement = document.querySelector('[data-usage-info-tooltip]')

  if (
    !(statsCardElement instanceof HTMLElement) ||
    !(statsHoursElement instanceof HTMLElement) ||
    !(statsWordsElement instanceof HTMLElement) ||
    !(statsWithoutExtensionElement instanceof HTMLElement) ||
    !(statsWithExtensionElement instanceof HTMLElement) ||
    !(statsReaderLevelElement instanceof HTMLElement) ||
    !(statsInfoTooltipElement instanceof HTMLElement)
  ) {
    throw new Error('Usage statistics elements are missing')
  }

  const elements: SettingsElements = {
    form: document.getElementById('settingsForm') as HTMLFormElement,
    enablePreprocessingToggle: document.getElementById('enableTranslation') as HTMLInputElement,
    languageSelect: document.getElementById('targetLanguage') as HTMLSelectElement,
    summarizationSlider: document.getElementById('summarizationLevel') as HTMLInputElement,
    summarizationLabel: document.getElementById('summarizationLabel') as HTMLElement,
    status: document.getElementById('settingsStatus') as HTMLElement,
    aiCard: aiCardElement,
    aiUpsell: aiUpsellElement,
    aiUpsellTitle: aiUpsellTitleElement,
    aiCtaButton: aiCtaButtonElement,
    // Authentication elements
    userProfile: document.getElementById('userProfile') as HTMLElement,
    loginButton: document.getElementById('loginButton') as HTMLButtonElement,
    logoutButton: document.getElementById('logoutButton') as HTMLButtonElement,
    manageSubscriptionButton: document.getElementById('manageSubscription') as HTMLButtonElement,
    authStatus: document.getElementById('authStatus') as HTMLElement,
    statsCard: statsCardElement,
    statsHoursValue: statsHoursElement,
    statsWordsValue: statsWordsElement,
    statsWithoutExtensionValue: statsWithoutExtensionElement,
    statsWithExtensionValue: statsWithExtensionElement,
    statsReaderLevelValue: statsReaderLevelElement,
    statsInfoTooltip: statsInfoTooltipElement
  }

  setUsageStatsInfoTooltip(elements.statsInfoTooltip)

  updateAiPreprocessingAccess(elements, false, null)

  loadInitialState(elements).catch((error: unknown) => {
    console.error('Failed to initialize settings page', error)
    showStatus(elements, 'Could not load settings.', 'error')
  })
  registerEvents(elements)
  registerAuthRefreshHandlers()
  registerStatsRefreshHandlers(elements)

  // Handle incoming actions from other extension pages
  const urlParams = new URLSearchParams(window.location.search)
  const action = urlParams.get('action')

  if (action === 'register') {
    // Use a small timeout to ensure the UI is ready before initiating login
    setTimeout(() => {
      elements.loginButton.click()
    }, 100)
  }
})
