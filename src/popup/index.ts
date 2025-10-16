import { applyThemeToElement } from '../common/theme'
import type { BackgroundMessage } from '../common/messages'
import {
  readReaderPreferences,
  readSummarizationLevel,
  writeSummarizationLevel,
  readPreprocessingEnabled,
  writePreprocessingEnabled,
  type ReaderTheme
} from '../common/storage'
import {
  sliderIndexToSummarizationLevel,
  summarizationLevelToSliderIndex,
  getSummarizationLevelLabel
} from '../common/summarization'
import { browserApi } from '../core/browser-api.service'
import { DEFAULTS } from '../config/defaults'
import { applyExtensionName } from '../common/app-name'
import { authService, type User } from '../auth'

const THEME_OPTIONS = {
  lightClass: 'popup--light',
  darkClass: 'popup--dark'
} as const

type PopupElements = {
  inputText: HTMLInputElement;
  speedReadButton: HTMLButtonElement;
  settingsButton: HTMLButtonElement;
  enablePreprocessingToggle: HTMLInputElement;
  summarizationSlider: HTMLInputElement;
  summarizationLabel: HTMLElement;
  aiSection: HTMLElement;
  aiUpsell: HTMLElement;
  aiUpsellTitle: HTMLElement;
  aiCtaButton: HTMLButtonElement;
};

let currentTheme: ReaderTheme = DEFAULTS.READER_PREFERENCES.theme

async function loadPreferences (elements: PopupElements) {
  const prefs = await readReaderPreferences()
  currentTheme = prefs.theme
  applyThemeToElement(document.body, currentTheme, THEME_OPTIONS)

  // Load preprocessing settings
  const isPreprocessingEnabled = await readPreprocessingEnabled()
  elements.enablePreprocessingToggle.checked = isPreprocessingEnabled

  // Load summarization settings
  const summarizationLevel = await readSummarizationLevel()
  const sliderIndex = summarizationLevelToSliderIndex(summarizationLevel)
  elements.summarizationSlider.value = String(sliderIndex)
  elements.summarizationLabel.textContent = getSummarizationLevelLabel(summarizationLevel)

  await loadAuthState(elements)
}

async function sendOpenReaderMessage (selectionText: string) {
  const prefs = await readReaderPreferences()
  const message: BackgroundMessage = {
    target: 'background',
    type: 'openReaderFromPopup',
    selectionText,
    wordsPerMinute: prefs.wordsPerMinute,
    theme: currentTheme
  }

  await browserApi.sendMessage(message)
}

async function registerEvents (elements: PopupElements) {
  function updateButtonState () {
    const text = elements.inputText.value.trim()
    elements.speedReadButton.disabled = text.length === 0
  }

  async function triggerReadFromInput () {
    const text = elements.inputText.value.trim()
    if (text.length === 0) {
      return
    }

    elements.inputText.value = ''
    elements.inputText.blur()
    updateButtonState()
    await sendOpenReaderMessage(text)
  }

  // Handle summarization slider change
  elements.summarizationSlider.addEventListener('input', async () => {
    const index = Number.parseInt(elements.summarizationSlider.value, 10) || 0
    const level = sliderIndexToSummarizationLevel(index)
    elements.summarizationLabel.textContent = getSummarizationLevelLabel(level)

    // Save immediately
    try {
      await writeSummarizationLevel(level)
    } catch (error) {
      console.error('Failed to save summarization level', error)
    }
  })

  // Handle preprocessing toggle change
  elements.enablePreprocessingToggle.addEventListener('change', async () => {
    const isEnabled = elements.enablePreprocessingToggle.checked

    // Save immediately
    try {
      await writePreprocessingEnabled(isEnabled)
    } catch (error) {
      console.error('Failed to save preprocessing setting', error)
    }
  })

  elements.inputText.addEventListener('input', updateButtonState)

  elements.speedReadButton.addEventListener('click', () => {
    triggerReadFromInput().catch(console.error)
  })

  elements.settingsButton.addEventListener('click', () => {
    openSettingsPage().catch(console.error)
  })

  // Initialize button state
  updateButtonState()
}

async function openSettingsPage (): Promise<void> {
  const url = browserApi.runtime.getURL('pages/settings.html')
  await browserApi.createTab({ url })
}

function setAiControlsDisabled (elements: PopupElements, disabled: boolean): void {
  elements.enablePreprocessingToggle.disabled = disabled
  elements.summarizationSlider.disabled = disabled
}

function updateAiPreprocessingAccess (elements: PopupElements, isAuthenticated: boolean, user: User | null): void {
  const isPro = Boolean(isAuthenticated && user && user.subscriptionStatus === 'pro')

  setAiControlsDisabled(elements, !isPro)

  const title = "You are on '2x reader' plan now."

  if (isPro) {
    elements.aiSection.classList.remove('popup__section--ai-locked')
    elements.aiUpsell.hidden = true
    elements.aiUpsell.setAttribute('aria-hidden', 'true')
    elements.aiUpsell.style.display = 'none'
    elements.aiCtaButton.disabled = false
    elements.aiCtaButton.onclick = null
  } else {
    elements.aiSection.classList.add('popup__section--ai-locked')
    elements.aiUpsell.hidden = false
    elements.aiUpsell.removeAttribute('aria-hidden')
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
          const url = browserApi.runtime.getURL('pages/settings.html?action=register')
          await browserApi.createTab({ url })
        } catch (error) {
          console.error('Failed to open settings page for registration', error)
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
          const returnUrl = browserApi.runtime.getURL('pages/settings.html')
          const url = await requestManageSubscriptionUrl(returnUrl)
          await browserApi.createTab({ url })
        } catch (error) {
          console.error('Failed to open subscription management from CTA', error)
        } finally {
          elements.aiCtaButton.disabled = false
        }
      }
    }
  }
}

async function loadAuthState (elements: PopupElements): Promise<void> {
  // Initialize auth service
  await authService.initializeAuth('popup')

  // Get current auth state
  const authState = authService.getAuthState()
  updateAiPreprocessingAccess(elements, authState.isAuthenticated, authState.user)

  // Subscribe to auth state changes
  authService.subscribe((state) => {
    updateAiPreprocessingAccess(elements, state.isAuthenticated, state.user)
  })
}

async function requestManageSubscriptionUrl (returnUrl: string): Promise<string> {
  const message: BackgroundMessage = {
    target: 'background',
    type: 'resolveManageSubscriptionUrl',
    returnUrl
  }
  const response = await browserApi.sendMessage(message)

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

document.addEventListener('DOMContentLoaded', async () => {
  applyExtensionName()
  const aiSectionElement = document.querySelector('[data-ai-section]')
  const aiUpsellElement = document.querySelector('[data-ai-cta]')

  if (!(aiSectionElement instanceof HTMLElement) || !(aiUpsellElement instanceof HTMLElement)) {
    throw new Error('AI Pre-processing card elements are missing')
  }

  const aiUpsellTitleElement = aiUpsellElement.querySelector('[data-ai-cta-title]')
  const aiCtaButtonElement = aiUpsellElement.querySelector('[data-ai-cta-button]')

  if (!(aiUpsellTitleElement instanceof HTMLElement) || !(aiCtaButtonElement instanceof HTMLButtonElement)) {
    throw new Error('AI Pre-processing CTA elements are missing')
  }

  const elements: PopupElements = {
    inputText: document.getElementById('inputTextToRead') as HTMLInputElement,
    speedReadButton: document.getElementById('speedReadButton') as HTMLButtonElement,
    settingsButton: document.getElementById('openSettings') as HTMLButtonElement,
    enablePreprocessingToggle: document.getElementById('popupEnableTranslation') as HTMLInputElement,
    summarizationSlider: document.getElementById('popupSummarizationLevel') as HTMLInputElement,
    summarizationLabel: document.getElementById('popupSummarizationLabel') as HTMLElement,
    aiSection: aiSectionElement,
    aiUpsell: aiUpsellElement,
    aiUpsellTitle: aiUpsellTitleElement,
    aiCtaButton: aiCtaButtonElement
  }

  await loadPreferences(elements)
  await registerEvents(elements)
})
